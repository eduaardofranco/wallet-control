import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiArrowUp, FiArrowDown, FiChevronDown, FiChevronUp, FiEye, FiEyeOff, FiEdit2, FiCheck, FiX } from 'react-icons/fi';
import api from '../services/api';
import GrowthBarChart from '../components/GrowthBarChart';
import './Dashboard.css';

const COLORS = ['#2d2d2d', '#16a34a', '#f59e0b', '#7c3aed', '#c2410c', '#4338ca'];

const CATEGORY_ORDER = ['ACAO', 'RENDA_FIXA', 'CRIPTO', 'FII', 'ETF', 'BDR'];
const CATEGORY_LABELS = {
  ACAO: 'Stocks', FII: 'REITs', ETF: 'ETFs', BDR: 'BDRs', CRIPTO: 'Crypto', RENDA_FIXA: 'Fixed Income',
};
const CATEGORY_ICONS = {
  ACAO: '📈', FII: '🏢', ETF: '📊', BDR: '🌎', CRIPTO: '₿', RENDA_FIXA: '🏦',
};

function fmtRaw(v) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'BRL' });
}

function fmtUsdRaw(v) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function pctRaw(v) {
  return v.toFixed(2) + '%';
}

function fmtCompact(v) {
  if (Math.abs(v) >= 1000) return `R$ ${Math.round(v / 1000)}k`;
  return `R$ ${v}`;
}

const MASK = '•••••';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [openCats, setOpenCats] = useState({});
  const [hidden, setHidden] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [pieView, setPieView] = useState('category');

  const fmt = (v) => hidden ? MASK : fmtRaw(v);
  const fmtUsd = (v) => hidden ? MASK : fmtUsdRaw(v);
  const fmtAsset = (v, isCrypto) => isCrypto ? fmtUsd(v) : fmt(v);
  const pct = (v) => hidden ? MASK : pctRaw(v);

  function load() {
    api.get('/dashboard').then(r => setData(r.data));
    api.get('/purchases').then(r => setPurchases(r.data));
    api.get('/sales').then(r => setSales(r.data));
  }

  useEffect(() => { load(); }, []);

  if (!data) return <p>Loading...</p>;

  function startEditPrice(asset) {
    setEditingId(asset.id);
    setEditValue(String(asset.currentPrice));
  }

  function cancelEditPrice() {
    setEditingId(null);
    setEditValue('');
  }

  async function savePrice(assetId) {
    const currentPrice = Number(editValue);
    if (Number.isNaN(currentPrice) || currentPrice < 0) return;
    await api.put(`/assets/${assetId}`, { currentPrice });
    setEditingId(null);
    setEditValue('');
    load();
  }

  const pieData = pieView === 'asset'
    ? (data.assetList || []).map(a => ({ name: a.ticker, value: a.balance }))
    : Object.entries(data.byCategory).map(([key, val]) => ({
      name: CATEGORY_LABELS[key] || key,
      value: val.current,
    }));

  const investedByMonth = {};
  for (const p of purchases) {
    const month = p.date.slice(0, 7);
    const amountBrl = p.quantity * p.price * (p.asset.category === 'CRIPTO' ? data.usdBrl : 1);
    investedByMonth[month] = (investedByMonth[month] || 0) + amountBrl;
  }
  for (const s of sales) {
    const month = s.date.slice(0, 7);
    const amountBrl = s.quantity * s.price * (s.asset.category === 'CRIPTO' ? data.usdBrl : 1);
    investedByMonth[month] = (investedByMonth[month] || 0) - amountBrl;
  }
  let cumulativeInvested = 0;
  const growthData = Object.keys(investedByMonth).sort().map(month => {
    cumulativeInvested += investedByMonth[month];
    const [year, m] = month.split('-');
    return { month: `${m}/${year.slice(2)}`, value: cumulativeInvested };
  });

  function toggleCat(cat) {
    setOpenCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  }

  const assetsByCategory = {};
  for (const a of (data.assetList || [])) {
    if (!assetsByCategory[a.category]) assetsByCategory[a.category] = [];
    assetsByCategory[a.category].push(a);
  }

  const categories = CATEGORY_ORDER.filter(c => assetsByCategory[c]?.length > 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Overview</h1>
        <button className="btn-outline hide-toggle" onClick={() => { setHidden(h => !h); cancelEditPrice(); }}>
          {hidden ? <FiEyeOff /> : <FiEye />} {hidden ? 'Show values' : 'Hide values'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card card">
          <div className="stat-icon blue"><FiDollarSign /></div>
          <div>
            <p className="stat-label">Total Invested</p>
            <p className="stat-value">{fmt(data.totalInvested)}</p>
          </div>
        </div>
        <div className="stat-card card">
          <div className={`stat-icon ${data.profit >= 0 ? 'green' : 'red'}`}>
            {data.profit >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
          </div>
          <div>
            <p className="stat-label">Current Value</p>
            <p className="stat-value">{fmt(data.totalCurrent)}</p>
            <p className={`stat-change ${data.profit >= 0 ? 'positive' : 'negative'}`}>
              {hidden ? MASK : `${data.profit >= 0 ? '+' : ''}${data.profitPercent.toFixed(2)}%`}
            </p>
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon green"><FiDollarSign /></div>
          <div>
            <p className="stat-label">Dividends Received</p>
            <p className="stat-value">{fmt(data.totalDividends)}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: 0 }}>Distribution by {pieView === 'asset' ? 'Asset' : 'Category'}</h3>
            <select value={pieView} onChange={e => setPieView(e.target.value)} style={{ width: 110 }}>
              <option value="category">Category</option>
              <option value="asset">Asset</option>
            </select>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-state">Add assets to see the distribution</p>
          )}
        </div>

        <div className="card">
          <h3>Portfolio Growth</h3>
          {growthData.length > 0 ? (
            <GrowthBarChart
              data={growthData}
              height={280}
              tooltipFormatter={fmt}
              yTickFormatter={v => hidden ? '' : fmtCompact(v)}
            />
          ) : (
            <p className="empty-state">Add purchases to see portfolio growth</p>
          )}
        </div>
      </div>

      {categories.map(cat => {
        const assets = assetsByCategory[cat];
        const isOpen = openCats[cat] !== false;
        const catInfo = data.byCategory[cat] || {};
        const isCryptoCategory = cat === 'CRIPTO';
        const totalBalance = assets.reduce((s, a) => s + a.balance, 0);
        const totalBalanceDisplay = isCryptoCategory
          ? assets.reduce((s, a) => s + a.quantity * a.currentPrice, 0)
          : totalBalance;
        const totalInvested = catInfo.invested || 0;
        const priceChange = totalInvested > 0 ? ((totalBalance - totalInvested) / totalInvested) * 100 : 0;
        const returnPct = totalInvested > 0 ? ((totalBalance - totalInvested + (catInfo.dividends || 0)) / totalInvested) * 100 : 0;
        const percentPortfolio = data.totalCurrent > 0 ? (totalBalance / data.totalCurrent) * 100 : 0;

        return (
          <div key={cat} className="category-section">
            <div className="category-header" onClick={() => toggleCat(cat)}>
              <div className="category-title">
                <span className="category-icon">{CATEGORY_ICONS[cat]}</span>
                <span className="category-name">{CATEGORY_LABELS[cat]}</span>
              </div>
              <div className="category-stats">
                <div className="cat-stat">
                  <span className="cat-stat-label">Assets</span>
                  <span className="cat-stat-value">{assets.length}</span>
                </div>
                <div className="cat-stat">
                  <span className="cat-stat-label">Total value</span>
                  <span className="cat-stat-value">{fmtAsset(totalBalanceDisplay, isCryptoCategory)}</span>
                </div>
                <div className="cat-stat">
                  <span className="cat-stat-label">Change</span>
                  <span className={`cat-stat-value ${priceChange >= 0 ? 'positive' : 'negative'}`}>{pct(priceChange)}</span>
                </div>
                <div className="cat-stat">
                  <span className="cat-stat-label">Return</span>
                  <span className={`cat-stat-value ${returnPct >= 0 ? 'positive' : 'negative'}`}>{pct(returnPct)}</span>
                </div>
                <div className="cat-stat">
                  <span className="cat-stat-label">% Portfolio</span>
                  <span className="cat-stat-value">{pct(percentPortfolio)}</span>
                </div>
              </div>
              <span className="category-toggle">
                {isOpen ? <FiChevronUp /> : <FiChevronDown />}
              </span>
            </div>

            {isOpen && (
              <div className="category-body">
                <table className="assets-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Qty.</th>
                      <th>Avg. Price</th>
                      <th>Current Price</th>
                      <th>Change</th>
                      <th>Return</th>
                      <th>Balance</th>
                      <th>% Portfolio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map(a => (
                      <tr key={a.id}>
                        <td>
                          <Link to={`/assets/${a.id}`} className="asset-cell">
                            <span className={`asset-dot dot-${a.category.toLowerCase()}`} />
                            <strong>{a.ticker}</strong>
                          </Link>
                        </td>
                        <td>{a.quantity % 1 === 0 ? a.quantity : a.quantity.toFixed(8).replace(/0+$/, '')}</td>
                        <td>{fmtAsset(a.averagePrice, a.isCrypto)}</td>
                        <td>
                          {editingId === a.id && !hidden ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              {a.isCrypto && <span style={{ color: 'var(--gray-500)', fontSize: '0.75rem' }}>US$</span>}
                              <input
                                type="number"
                                step="0.01"
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') savePrice(a.id);
                                  if (e.key === 'Escape') cancelEditPrice();
                                }}
                                style={{ width: 90 }}
                              />
                              <button className="btn-outline" style={{ padding: '0.2rem 0.4rem' }} onClick={() => savePrice(a.id)}><FiCheck size={14} /></button>
                              <button className="btn-outline" style={{ padding: '0.2rem 0.4rem' }} onClick={cancelEditPrice}><FiX size={14} /></button>
                            </div>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                              {fmtAsset(a.currentPrice, a.isCrypto)}
                              {!hidden && (
                                <FiEdit2
                                  size={13}
                                  style={{ cursor: 'pointer', color: 'var(--gray-500)' }}
                                  onClick={() => startEditPrice(a)}
                                  title={a.isCrypto ? 'Update current price (USD)' : 'Update current price'}
                                />
                              )}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`var-badge ${a.priceChange >= 0 ? 'var-up' : 'var-down'}`}>
                            {pct(a.priceChange)} {a.priceChange >= 0 ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: a.returnPct >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                            {pct(a.returnPct)} {a.returnPct >= 0 ? <FiArrowUp size={12} style={{ verticalAlign: 'middle' }} /> : <FiArrowDown size={12} style={{ verticalAlign: 'middle' }} />}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{fmtAsset(a.isCrypto ? a.quantity * a.currentPrice : a.balance, a.isCrypto)}</td>
                        <td>
                          <div className="pct-bar-container">
                            <div className="pct-bar" style={{ width: `${Math.min(a.percentPortfolio, 100)}%` }} />
                            <span>{pct(a.percentPortfolio)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
