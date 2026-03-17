import { describe, expect, it, vi } from 'vitest';
import { requestDeviceCode, pollForAccessToken } from './copilotDeviceFlow';

describe('copilotDeviceFlow', () => {
  it('requests device code from github endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({
        device_code: 'device-code',
        user_code: 'ABCD-EFGH',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 5,
      }),
    });

    await expect(requestDeviceCode(fetchMock)).resolves.toEqual({
      deviceCode: 'device-code',
      userCode: 'ABCD-EFGH',
      verificationUri: 'https://github.com/login/device',
      expiresIn: 900,
      interval: 5,
    });
  });

  it('polls for access token and handles slow_down', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 200, json: vi.fn().mockResolvedValue({ error: 'slow_down' }) })
      .mockResolvedValueOnce({ status: 200, json: vi.fn().mockResolvedValue({ access_token: 'ghu_token' }) });

    const sleep = vi.fn(async () => undefined);
    const token = await pollForAccessToken('device-code', {
      fetchImpl: fetchMock,
      sleep,
      interval: 1,
      expiresIn: 10,
      now: (() => {
        let n = 0;
        return () => n++;
      })(),
    });

    expect(token).toBe('ghu_token');
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
