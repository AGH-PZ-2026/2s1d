/**
 * Object storage abstraction.
 *
 * The app stores item photos in Cloudflare R2 in production, but for a
 * self-hosted deployment we want to be able to swap in either the local
 * filesystem or an S3-compatible backend (MinIO, AWS S3, etc.) without
 * touching the route handlers.
 *
 * Three implementations are provided:
 *  - `R2ObjectStorage`  – wraps a Cloudflare R2 binding
 *  - `S3ObjectStorage`  – S3-compatible (works with MinIO + AWS S3 + R2's
 *                         S3 API); lazily imports @aws-sdk/client-s3
 *  - `LocalFsStorage`   – local filesystem; sufficient for single-node
 *                         self-hosted deployments and tests
 *
 * The factory `createObjectStorage(env)` picks one based on env vars:
 *   - if `PHOTOS_BUCKET` (R2) is set → R2ObjectStorage
 *   - else if `S3_BUCKET` is set     → S3ObjectStorage
 *   - else                            → LocalFsStorage
 */
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { dirname, join, normalize, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

export interface PutOptions {
  contentType?: string;
}

export interface ObjectInfo {
  size: number;
  contentType: string;
}

export interface ObjectStorage {
  /**
   * Persist `body` at `key`. `body` can be a Node Readable, a Web
   * ReadableStream, a Buffer, or a string.
   */
  put(key: string, body: PutBody, options?: PutOptions): Promise<void>;

  /**
   * Return a Web ReadableStream for the object, or null if it does not exist.
   */
  getStream(key: string): Promise<ReadableStream<Uint8Array> | null>;

  /**
   * Return the object bytes as a Uint8Array plus its content type. Used by
   * the HTTP layer to serve downloads. Returns null when the object is
   * missing.
   */
  getBytes(
    key: string
  ): Promise<{ body: Uint8Array; contentType: string } | null>;

  /**
   * Return metadata for the object (or null if missing).
   */
  head(key: string): Promise<ObjectInfo | null>;

  /**
   * Remove a single object (no-op if missing).
   */
  delete(key: string): Promise<void>;

  /**
   * Build the public URL for an object. The default is to use the
   * `PHOTOS_PUBLIC_URL` prefix, falling back to a `/storage/...` route
   * that the Node server can proxy through to the local filesystem.
   */
  publicUrl(key: string): string;
}

export type PutBody = ReadableStream<Uint8Array> | Buffer | string;

// ─── R2 binding ────────────────────────────────────────────────────────────

export class R2ObjectStorage implements ObjectStorage {
  constructor(
    private readonly bucket: R2Bucket,
    private readonly publicPrefix?: string
  ) {}

  async put(key: string, body: PutBody, options?: PutOptions): Promise<void> {
    const httpMetadata = options?.contentType
      ? { contentType: options.contentType }
      : undefined;
    await this.bucket.put(key, body as ReadableStream, { httpMetadata });
  }

  async getStream(key: string): Promise<ReadableStream<Uint8Array> | null> {
    const obj = await this.bucket.get(key);
    return obj ? (obj.body as ReadableStream<Uint8Array>) : null;
  }

  async getBytes(
    key: string
  ): Promise<{ body: Uint8Array; contentType: string } | null> {
    const obj = await this.bucket.get(key);
    if (!obj) return null;
    const buf = await obj.arrayBuffer();
    return {
      body: new Uint8Array(buf),
      contentType: obj.httpMetadata?.contentType ?? 'application/octet-stream',
    };
  }

  async head(key: string): Promise<ObjectInfo | null> {
    const obj = await this.bucket.head(key);
    if (!obj) return null;
    return {
      size: obj.size,
      contentType: obj.httpMetadata?.contentType ?? 'application/octet-stream',
    };
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  publicUrl(key: string): string {
    if (this.publicPrefix)
      return `${this.publicPrefix.replace(/\/$/, '')}/${key}`;
    return key;
  }
}

// ─── S3-compatible (MinIO, AWS S3, R2 S3 API) ──────────────────────────────

interface S3LikeClient {
  send: (cmd: unknown) => Promise<unknown>;
}

export class S3ObjectStorage implements ObjectStorage {
  private client: S3LikeClient | null = null;
  private commandClasses: Record<string, unknown> | null = null;
  private readonly endpoint: string | undefined;
  private readonly publicPrefix: string | undefined;

  constructor(
    private readonly config: {
      endpoint?: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      publicUrl?: string;
      forcePathStyle?: boolean;
    }
  ) {
    this.endpoint = config.endpoint;
    this.publicPrefix = config.publicUrl;
  }

  private async ensureClient(): Promise<{
    client: S3LikeClient;
    cmd: Record<string, unknown>;
  }> {
    if (this.client && this.commandClasses) {
      return { client: this.client, cmd: this.commandClasses };
    }
    // Lazy import so workers (which cannot resolve node modules) are not
    // affected by this module being loaded.
    const mod = await import('@aws-sdk/client-s3');
    this.commandClasses = mod as unknown as Record<string, unknown>;
    const ClientClass = (
      mod as unknown as { S3Client: new (cfg: unknown) => S3LikeClient }
    ).S3Client;
    this.client = new ClientClass({
      region: this.config.region,
      endpoint: this.config.endpoint,
      forcePathStyle:
        this.config.forcePathStyle ?? Boolean(this.config.endpoint),
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
    return { client: this.client, cmd: this.commandClasses };
  }

  async put(key: string, body: PutBody, options?: PutOptions): Promise<void> {
    const { client, cmd } = await this.ensureClient();
    const PutObjectCtor = (
      cmd as { PutObjectCommand: new (i: unknown) => unknown }
    ).PutObjectCommand;
    const buf = await toBuffer(body);
    await client.send(
      new PutObjectCtor({
        Bucket: this.config.bucket,
        Key: key,
        Body: buf,
        ContentType: options?.contentType,
      })
    );
  }

  async getStream(key: string): Promise<ReadableStream<Uint8Array> | null> {
    const bytes = await this.getBytes(key);
    if (!bytes) return null;
    return new ReadableStream({
      start(controller) {
        controller.enqueue(bytes.body);
        controller.close();
      },
    });
  }

  async getBytes(
    key: string
  ): Promise<{ body: Uint8Array; contentType: string } | null> {
    const { client, cmd } = await this.ensureClient();
    const GetObjectCtor = (
      cmd as { GetObjectCommand: new (i: unknown) => unknown }
    ).GetObjectCommand;
    try {
      const out = (await client.send(
        new GetObjectCtor({ Bucket: this.config.bucket, Key: key })
      )) as {
        Body?: { transformToByteArray: () => Promise<Uint8Array> };
        ContentType?: string;
      };
      const body = await out.Body!.transformToByteArray();
      return {
        body,
        contentType: out.ContentType ?? 'application/octet-stream',
      };
    } catch (err: unknown) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async head(key: string): Promise<ObjectInfo | null> {
    const { client, cmd } = await this.ensureClient();
    const HeadObjectCtor = (
      cmd as { HeadObjectCommand: new (i: unknown) => unknown }
    ).HeadObjectCommand;
    try {
      const out = (await client.send(
        new HeadObjectCtor({ Bucket: this.config.bucket, Key: key })
      )) as { ContentLength?: number; ContentType?: string };
      return {
        size: out.ContentLength ?? 0,
        contentType: out.ContentType ?? 'application/octet-stream',
      };
    } catch (err: unknown) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    const { client, cmd } = await this.ensureClient();
    const DeleteObjectCtor = (
      cmd as { DeleteObjectCommand: new (i: unknown) => unknown }
    ).DeleteObjectCommand;
    await client.send(
      new DeleteObjectCtor({ Bucket: this.config.bucket, Key: key })
    );
  }

  publicUrl(key: string): string {
    if (this.publicPrefix)
      return `${this.publicPrefix.replace(/\/$/, '')}/${key}`;
    if (this.endpoint) {
      // path-style URL: http://host:port/bucket/key
      return `${this.endpoint.replace(/\/$/, '')}/${this.config.bucket}/${key}`;
    }
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }
}

function isNotFound(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    e.name === 'NoSuchKey' ||
    e.name === 'NotFound' ||
    e.$metadata?.httpStatusCode === 404
  );
}

async function toBuffer(body: PutBody): Promise<Buffer> {
  if (typeof body === 'string') return Buffer.from(body);
  if (body instanceof Buffer) return body;
  // ReadableStream → Buffer
  const stream = body as ReadableStream<Uint8Array>;
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

// ─── Local filesystem ──────────────────────────────────────────────────────

export class LocalFsStorage implements ObjectStorage {
  constructor(
    private readonly rootDir: string,
    private readonly publicPrefix?: string
  ) {}

  private resolve(key: string): string {
    // Normalise, forbid path traversal.
    const normalised = normalize(key).replace(/^(\.\.[/\\])+/, '');
    if (normalised.startsWith('..') || normalised.includes(`..${sep}`)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return join(this.rootDir, normalised);
  }

  async put(key: string, body: PutBody, options?: PutOptions): Promise<void> {
    const path = this.resolve(key);
    await mkdir(dirname(path), { recursive: true });
    if (typeof body === 'string') {
      await pipeline(Readable.from(Buffer.from(body)), createWriteStream(path));
    } else if (body instanceof Buffer) {
      await pipeline(Readable.from(body), createWriteStream(path));
    } else {
      // Web ReadableStream → Node Readable
      const node = Readable.fromWeb(
        body as unknown as import('stream/web').ReadableStream
      );
      await pipeline(node, createWriteStream(path));
    }
    if (options?.contentType) {
      // Persist content type next to the file as <key>.contenttype
      await pipeline(
        Readable.from(Buffer.from(options.contentType)),
        createWriteStream(path + '.contenttype')
      );
    }
  }

  async getStream(key: string): Promise<ReadableStream<Uint8Array> | null> {
    const path = this.resolve(key);
    try {
      await stat(path);
    } catch {
      return null;
    }
    const node = createReadStream(path);
    return Readable.toWeb(node) as unknown as ReadableStream<Uint8Array>;
  }

  async getBytes(
    key: string
  ): Promise<{ body: Uint8Array; contentType: string } | null> {
    const path = this.resolve(key);
    try {
      const [buf, ct] = await Promise.all([
        readFile(path),
        readContentType(path),
      ]);
      return { body: new Uint8Array(buf), contentType: ct };
    } catch {
      return null;
    }
  }

  async head(key: string): Promise<ObjectInfo | null> {
    const path = this.resolve(key);
    try {
      const [s, ct] = await Promise.all([stat(path), readContentType(path)]);
      return { size: s.size, contentType: ct };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const path = this.resolve(key);
    try {
      await unlink(path);
    } catch {
      /* ignore */
    }
    try {
      await unlink(path + '.contenttype');
    } catch {
      /* ignore */
    }
  }

  publicUrl(key: string): string {
    if (this.publicPrefix)
      return `${this.publicPrefix.replace(/\/$/, '')}/${key}`;
    return `/storage/${key}`;
  }
}

async function readFile(path: string): Promise<ArrayBuffer> {
  const { readFile: rf } = await import('node:fs/promises');
  const buf = await rf(path);
  // Return an ArrayBuffer (not a Node Buffer) so the consumer can use it
  // in Web APIs without an extra copy.
  return buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength
  ) as ArrayBuffer;
}

async function readContentType(path: string): Promise<string> {
  try {
    const { readFile: rf } = await import('node:fs/promises');
    const buf = await rf(path + '.contenttype');
    return buf.toString('utf8') || 'application/octet-stream';
  } catch {
    return 'application/octet-stream';
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

/**
 * Pick the right storage backend for the runtime:
 *  - PHOTOS_BUCKET (R2 binding)     → R2ObjectStorage
 *  - S3_BUCKET + S3_* credentials   → S3ObjectStorage
 *  - otherwise                      → LocalFsStorage
 */
export function createObjectStorage(env: Env): ObjectStorage {
  if (env.PHOTOS_BUCKET) {
    return new R2ObjectStorage(env.PHOTOS_BUCKET, env.PHOTOS_PUBLIC_URL);
  }
  if (env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY) {
    return new S3ObjectStorage({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION ?? 'us-east-1',
      bucket: env.S3_BUCKET,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      publicUrl: env.S3_PUBLIC_URL,
    });
  }
  const root = env.PHOTOS_LOCAL_DIR ?? './storage';
  return new LocalFsStorage(root, env.PHOTOS_PUBLIC_URL);
}
