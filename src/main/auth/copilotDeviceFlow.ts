import type { FetchLike } from '../providers/providerClient';

const GITHUB_CLIENT_ID = 'Iv1.b507a08c87ecfe98';
const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';

export interface DeviceCode {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export interface PollOptions {
  fetchImpl?: FetchLike;
  sleep?: (seconds: number) => Promise<void>;
  now?: () => number;
  interval?: number;
  expiresIn?: number;
}

async function defaultSleep(seconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export async function requestDeviceCode(fetchImpl: FetchLike = globalThis.fetch as FetchLike): Promise<DeviceCode> {
  const response = await fetchImpl(DEVICE_CODE_URL, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: new URLSearchParams({ client_id: GITHUB_CLIENT_ID, scope: 'read:user' }).toString(),
  });

  if (response.status !== 200) {
    throw new Error(`Device code request failed (HTTP ${response.status})`);
  }

  const data = await response.json() as Record<string, unknown>;
  return {
    deviceCode: String(data.device_code ?? ''),
    userCode: String(data.user_code ?? ''),
    verificationUri: String(data.verification_uri ?? ''),
    expiresIn: Number(data.expires_in ?? 900),
    interval: Number(data.interval ?? 5),
  };
}

export async function pollForAccessToken(deviceCode: string, options: PollOptions = {}): Promise<string> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? (() => Math.floor(Date.now() / 1000));
  const expiresIn = options.expiresIn ?? 900;

  const start = now();
  let pollInterval = options.interval ?? 5;

  while (now() < start + expiresIn) {
    await sleep(pollInterval);

    const response = await fetchImpl(ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }).toString(),
    });

    const data = await response.json() as Record<string, unknown>;
    const accessToken = data.access_token;
    if (typeof accessToken === 'string' && accessToken.length > 0) {
      return accessToken;
    }

    const error = data.error;
    if (error === 'authorization_pending') {
      continue;
    }
    if (error === 'slow_down') {
      pollInterval += 5;
      continue;
    }
    if (error === 'expired_token') {
      throw new Error('Device code expired. Please try again.');
    }
    if (error === 'access_denied') {
      throw new Error('Authorization denied by user.');
    }
    if (typeof error === 'string' && error.length > 0) {
      const description = typeof data.error_description === 'string' ? data.error_description : '';
      throw new Error(`OAuth error: ${error} - ${description}`);
    }
  }

  throw new Error('Device code expired before authorization completed.');
}
