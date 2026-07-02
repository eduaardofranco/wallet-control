import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function freshPricesModule() {
  vi.resetModules();
  return import('./prices.js');
}

describe('resolveName / isCrypto', () => {
  it('resolves known tickers to their display name', async () => {
    const { resolveName } = await freshPricesModule();
    expect(resolveName('petr4')).toBe('Petrobras PN');
  });

  it('falls back to the uppercased ticker when the name is unknown', async () => {
    const { resolveName } = await freshPricesModule();
    expect(resolveName('unknown9')).toBe('UNKNOWN9');
  });

  it('identifies crypto tickers case-insensitively', async () => {
    const { isCrypto } = await freshPricesModule();
    expect(isCrypto('btc')).toBe(true);
    expect(isCrypto('PETR4')).toBe(false);
  });
});

describe('fetchUsdBrl', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses the bid rate from AwesomeAPI', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ USDBRL: { bid: '5.2305' } }),
    });
    const { fetchUsdBrl } = await freshPricesModule();

    expect(await fetchUsdBrl()).toBe(5.2305);
  });

  it('falls back to 5.50 when the request fails and there is no cached rate', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    const { fetchUsdBrl } = await freshPricesModule();

    expect(await fetchUsdBrl()).toBe(5.5);
  });
});
