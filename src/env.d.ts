// ─── Cloudflare Workers bindings (used in production on CF) ───────────────
declare interface Hyperdrive {
  connectionString: string;
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
}

declare interface R2Bucket {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | string,
    options?: R2PutOptions
  ): Promise<R2Object>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string | string[]): Promise<void>;
  head(key: string): Promise<R2Object | null>;
  list(options?: R2ListOptions): Promise<R2Objects>;
}

declare interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

declare interface R2HTTPMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

declare interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  checksums: R2Checksums;
  uploaded: Date;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

declare interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T>(): Promise<T>;
  blob(): Promise<Blob>;
}

declare interface R2Checksums {
  md5?: ArrayBuffer;
  sha1?: ArrayBuffer;
  sha256?: ArrayBuffer;
  sha384?: ArrayBuffer;
  sha512?: ArrayBuffer;
}

declare interface R2ListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
  delimiter?: string;
  startAfter?: string;
  include?: ('httpMetadata' | 'customMetadata')[];
}

declare interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes: string[];
}

declare interface Queue<Body = unknown> {
  send(body: Body, options?: QueueSendOptions): Promise<void>;
  sendBatch(batch: Iterable<MessageSendRequest<Body>>): Promise<void>;
}

declare interface QueueSendOptions {
  contentType?: 'text' | 'json' | 'bytes' | 'v8';
  delaySeconds?: number;
}

declare interface MessageSendRequest<Body = unknown> {
  body: Body;
  options?: QueueSendOptions;
}

// ─── Environment shape ────────────────────────────────────────────────────
// On Cloudflare, this is the bindings object exposed to the worker.
// On Node.js, we provide a shim that reads from process.env and uses
// filesystem/S3 for storage (see src/server.ts).
declare interface Env {
  // CF-only bindings
  HYPERDRIVE?: Hyperdrive;
  PHOTOS_BUCKET?: R2Bucket;
  NOTIFICATION_QUEUE?: Queue;

  // Self-hosted equivalents (read from process.env by src/server.ts)
  DATABASE_URL?: string;
  MYSQL_HOST?: string;
  MYSQL_PORT?: string;
  MYSQL_USER?: string;
  MYSQL_PASSWORD?: string;
  MYSQL_DATABASE?: string;

  // Storage backends for self-hosted
  PHOTOS_BACKEND?: 'local' | 's3' | 'r2';
  PHOTOS_LOCAL_DIR?: string;
  PHOTOS_PUBLIC_URL?: string; // e.g. https://photos.example.com
  S3_ENDPOINT?: string;
  S3_REGION?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_PUBLIC_URL?: string; // CDN or public endpoint

  // Shared vars
  JWT_SECRET?: string;
  DEV_BYPASS_AUTH?: string;
  GOOGLE_CLIENT_ID?: string;

  // Node-only
  PORT?: string;
  HOST?: string;
  STATIC_DIR?: string; // path to built SPA, e.g. ./dist/client
}
