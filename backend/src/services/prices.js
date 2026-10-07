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

const CACHE_TTL = 5 * 60 * 1000;
const usdBrlCache = { data: null, timestamp: 0 };

export function resolveName(ticker) {
  return STOCK_NAMES[ticker.toUpperCase()] || ticker.toUpperCase();
}

export function isCrypto(category) {
  return category === 'CRIPTO';
}

export async function fetchUsdBrl() {
  if (Date.now() - usdBrlCache.timestamp < CACHE_TTL && usdBrlCache.data !== null) {
    return usdBrlCache.data;
  }
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
    const data = await res.json();
    const rate = parseFloat(data.USDBRL?.bid) || 5.50;
    usdBrlCache.data = rate;
    usdBrlCache.timestamp = Date.now();
    return rate;
  } catch {
    return usdBrlCache.data || 5.50;
  }
}
