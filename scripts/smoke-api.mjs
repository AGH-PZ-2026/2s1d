const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:8787';
const expectedDevBypass = process.env.SMOKE_EXPECT_DEV_BYPASS === 'true';

async function expectResponse(path, status, expectedBody) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.json();
  if (
    response.status !== status ||
    JSON.stringify(body) !== JSON.stringify(expectedBody)
  ) {
    throw new Error(
      `${path}: expected ${status} ${JSON.stringify(expectedBody)}, received ${response.status} ${JSON.stringify(body)}`
    );
  }
  return response;
}

const health = await expectResponse('/api/health', 200, {
  status: 'ok',
  database: 'ok',
});
await expectResponse('/api/v1/items/', 401, {
  detail: 'Missing or invalid authorization header',
});
await expectResponse('/api/v1/auth/config', 200, {
  devBypassAuth: expectedDevBypass,
  googleClientId: '',
});

if (health.headers.get('x-content-type-options') !== 'nosniff') {
  throw new Error('Security headers are missing');
}

console.log('API smoke checks passed.');
