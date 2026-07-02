import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiAlertTriangle, FiArrowUp, FiArrowDown, FiChevronDown, FiChevronUp, FiEye, FiEyeOff, FiEdit2, FiCheck, FiX } from 'react-icons/fi';
import api from '../services/api';
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

function pctRaw(v) {
  return v.toFixed(2) + '%';
}

const MASK = '•••••';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [openCats, setOpenCats] = useState({});
  const [hidden, setHidden] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const fmt = (v) => hidden ? MASK : fmtRaw(v);
  const pct = (v) => hidden ? MASK : pctRaw(v);

  function load() {
    api.get('/dashboard').then(r => setData(r.data));
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

  const pieData = Object.entries(data.byCategory).map(([key, val]) => ({
    name: CATEGORY_LABELS[key] || key,
    value: val.current,
  }));

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
        <h1 className="page-title" style={{ margin: 0 }}>Dashboard</h1>
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

      {categories.map(cat => {
        const assets = assetsByCategory[cat];
        const isOpen = openCats[cat] !== false;
        const catInfo = data.byCategory[cat] || {};
        const totalBalance = assets.reduce((s, a) => s + a.balance, 0);
        const totalInvested = catInfo.invested || 0;
        const priceChange = totalInvested > 0 ? ((totalBalance - totalInvested) / totalInvested) * 100 : 0;
        const returnPct = priceChange;
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
                  <span className="cat-stat-value">{fmt(totalBalance)}</span>
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
                        <td>{a.isCrypto ? <span title={`US$ ${a.averagePrice.toFixed(2)}`}>{fmt(a.averagePriceBrl)}</span> : fmt(a.averagePrice)}</td>
                        <td>
                          {editingId === a.id && !hidden ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
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
                              {fmt(a.currentPrice)}
                              {!hidden && (
                                <FiEdit2
                                  size={13}
                                  style={{ cursor: 'pointer', color: 'var(--gray-500)' }}
                                  onClick={() => startEditPrice(a)}
                                  title="Update current price"
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
                        <td style={{ fontWeight: 600 }}>{fmt(a.balance)}</td>
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

      <div className="dashboard-grid">
        <div className="card">
          <h3>Distribution by Category</h3>
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
          <h3><FiAlertTriangle style={{ color: 'var(--warning)' }} /> Below Ceiling Price</h3>
          {data.alerts.length > 0 ? (
            <table>
              <thead>
                <tr><th>Ticker</th><th>Current</th><th>Ceiling</th></tr>
              </thead>
              <tbody>
                {data.alerts.map(a => (
                  <tr key={a.ticker}>
                    <td><strong>{a.ticker}</strong></td>
                    <td>{fmt(a.currentPrice)}</td>
                    <td>{fmt(a.ceilingPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">No assets below ceiling price</p>
          )}
        </div>
      </div>
    </div>
  );
}
