import { readFile } from 'node:fs/promises';
import { parse, printParseErrorCode } from 'jsonc-parser';

const source = await readFile(
  new URL('../wrangler.jsonc', import.meta.url),
  'utf8'
);
const parseErrors = [];
const config = parse(source, parseErrors);

if (parseErrors.length > 0) {
  for (const error of parseErrors) {
    console.error(
      `wrangler.jsonc:${error.offset}: ${printParseErrorCode(error.error)}`
    );
  }
  process.exitCode = 1;
} else {
  const production = config?.env?.production;
  const errors = [];
  const rejectPlaceholder = (value, label) => {
    if (
      typeof value !== 'string' ||
      value.trim() === '' ||
      /<[^>]+>/.test(value)
    ) {
      errors.push(`${label} must contain a real production value`);
    }
  };
  const assertEnabled = (value, label) => {
    if (value !== true) errors.push(`${label} must be enabled`);
  };

  if (!config?.compatibility_flags?.includes('nodejs_compat')) {
    errors.push('compatibility_flags must include "nodejs_compat"');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(config?.compatibility_date ?? '')) {
    errors.push('compatibility_date must be yyyy-mm-dd');
  }
  if (config?.vars?.DEV_BYPASS_AUTH !== 'false') {
    errors.push('top-level vars.DEV_BYPASS_AUTH must equal "false"');
  }

  if (!production) {
    errors.push('env.production is required');
  } else {
    rejectPlaceholder(
      production.hyperdrive?.[0]?.id,
      'env.production.hyperdrive[0].id'
    );
    rejectPlaceholder(
      production.routes?.[0]?.pattern,
      'env.production.routes[0].pattern'
    );
    rejectPlaceholder(
      production.vars?.GOOGLE_CLIENT_ID,
      'env.production.vars.GOOGLE_CLIENT_ID'
    );
    rejectPlaceholder(
      production.vars?.INITIAL_ADMIN_EMAIL,
      'env.production.vars.INITIAL_ADMIN_EMAIL'
    );
    rejectPlaceholder(
      production.r2_buckets?.[0]?.bucket_name,
      'env.production.r2_buckets[0].bucket_name'
    );

    if (production.vars?.DEV_BYPASS_AUTH !== 'false') {
      errors.push('env.production.vars.DEV_BYPASS_AUTH must equal "false"');
    }
    if (
      production.routes?.[0]?.pattern &&
      !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(production.routes[0].pattern)
    ) {
      errors.push(
        'env.production.routes[0].pattern must be a custom domain host, without scheme or path'
      );
    }
    if (production.routes?.[0]?.custom_domain !== true) {
      errors.push('env.production.routes[0].custom_domain must be true');
    }
    if (
      production.vars?.GOOGLE_CLIENT_ID &&
      !production.vars.GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')
    ) {
      errors.push('GOOGLE_CLIENT_ID must be a Google OAuth web client ID');
    }
    if (
      production.vars?.INITIAL_ADMIN_EMAIL &&
      !/^[^@\s]+@agh\.edu\.pl$/i.test(production.vars.INITIAL_ADMIN_EMAIL)
    ) {
      errors.push('INITIAL_ADMIN_EMAIL must be an @agh.edu.pl address');
    }
    if (!production.triggers?.crons?.includes('0 * * * *')) {
      errors.push(
        'env.production.triggers.crons must include hourly notification schedule'
      );
    }
    assertEnabled(
      production.observability?.enabled,
      'env.production.observability.enabled'
    );
    assertEnabled(
      production.observability?.traces?.enabled,
      'env.production.observability.traces.enabled'
    );
  }

  if (
    'JWT_SECRET' in (config.vars ?? {}) ||
    'JWT_SECRET' in (production?.vars ?? {})
  ) {
    errors.push('JWT_SECRET must be a Wrangler secret, never a vars entry');
  }

  if (errors.length > 0) {
    errors.forEach((error) => console.error(`Production config: ${error}`));
    process.exitCode = 1;
  } else {
    console.log('Production config validated.');
  }
}
