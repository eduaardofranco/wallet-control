const CRYPTO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  XRP: 'ripple',
  SOL: 'solana',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  AVAX: 'avalanche-2',
};

const TESOURO_SLUGS = {
  'IPCA+2050': 'tesouro-ipca-2050',
  'RENDA+2060': 'tesouro-renda-aposentadoria-extra-2060',
  'IPCA+2029': 'tesouro-ipca-2029',
  'IPCA+2035': 'tesouro-ipca-2035',
  'IPCA+2045': 'tesouro-ipca-2045',
  'SELIC2029': 'tesouro-selic-2029',
  'PREFIXADO2028': 'tesouro-prefixado-2028',
};

const STOCK_NAMES = {
  BBAS3: 'Banco do Brasil', BBSE3: 'BB Seguridade', RANI3: 'Irani',
  PETR4: 'Petrobras PN', VALE3: 'Vale', ITUB4: 'Itaú Unibanco',
  WEGE3: 'WEG', ABEV3: 'Ambev', RENT3: 'Localiza',
  HGLG11: 'CSHG Logística', MXRF11: 'Maxi Renda', XPML11: 'XP Malls',
  AXIA3: 'Axia Investimentos', ISAE4: 'ISA CTEEP',
  BTC: 'Bitcoin', ETH: 'Ethereum', XRP: 'XRP (Ripple)',
  SOL: 'Solana', ADA: 'Cardano',
  'IPCA+2050': 'Tesouro IPCA+ 2050',
  'RENDA+2060': 'Tesouro Renda+ Apos. Extra 2060',
};

export function resolveName(ticker) {
  return STOCK_NAMES[ticker.toUpperCase()] || ticker.toUpperCase();
}

export function isCrypto(ticker) {
  return !!CRYPTO_IDS[ticker.toUpperCase()];
}

export function isTesouro(ticker) {
  return !!TESOURO_SLUGS[ticker.toUpperCase()];
}

async function fetchTesouroPrice(slug) {
  try {
    const res = await fetch(`https://statusinvest.com.br/tesouro/${slug}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    });
    const html = await res.text();
    const match = html.match(/<strong class="value">\s*([\d.,]+)/);
    if (match) {
      return parseFloat(match[1].replace('.', '').replace(',', '.'));
    }
  } catch (err) {
    console.error('Error fetching tesouro price for', slug, err.message);
  }
  return null;
}

export async function fetchUsdBrl() {
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
    const data = await res.json();
    return parseFloat(data.USDBRL?.bid) || 5.50;
  } catch {
    return 5.50;
  }
}

export async function fetchPrices(tickers) {
  const result = {};
  const stocks = tickers.filter(t => !isCrypto(t) && !isTesouro(t));
  const cryptos = tickers.filter(t => isCrypto(t));
  const tesouros = tickers.filter(t => isTesouro(t));

  if (stocks.length > 0) {
    try {
      const joined = stocks.join(',');
      const res = await fetch(`https://brapi.dev/api/quote/${joined}?fundamental=false`);
      const data = await res.json();
      if (data.results) {
        for (const item of data.results) {
          result[item.symbol] = item.regularMarketPrice;
        }
      }
    } catch (err) {
      console.error('Error fetching stock prices:', err.message);
    }
  }

  if (cryptos.length > 0) {
    try {
      const ids = cryptos.map(t => CRYPTO_IDS[t.toUpperCase()]).filter(Boolean).join(',');
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=brl`);
      const data = await res.json();
      for (const ticker of cryptos) {
        const id = CRYPTO_IDS[ticker.toUpperCase()];
        if (id && data[id]?.brl) {
          result[ticker.toUpperCase()] = data[id].brl;
        }
      }
    } catch (err) {
      console.error('Error fetching crypto prices:', err.message);
    }
  }

  if (tesouros.length > 0) {
    const promises = tesouros.map(async (ticker) => {
      const slug = TESOURO_SLUGS[ticker.toUpperCase()];
      if (slug) {
        const price = await fetchTesouroPrice(slug);
        if (price) result[ticker.toUpperCase()] = price;
      }
    });
    await Promise.all(promises);
  }

  return result;
}
