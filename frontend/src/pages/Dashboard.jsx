import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiAlertTriangle, FiArrowUp, FiArrowDown, FiChevronDown, FiChevronUp, FiEye, FiEyeOff } from 'react-icons/fi';
import api from '../services/api';
import './Dashboard.css';

const COLORS = ['#2d2d2d', '#16a34a', '#f59e0b', '#7c3aed', '#c2410c', '#4338ca'];

const CATEGORY_ORDER = ['ACAO', 'RENDA_FIXA', 'CRIPTO', 'FII', 'ETF', 'BDR'];
const CATEGORY_LABELS = {
  ACAO: 'Ações', FII: 'FIIs', ETF: 'ETFs', BDR: 'BDRs', CRIPTO: 'Cripto', RENDA_FIXA: 'Renda Fixa',
};
const CATEGORY_ICONS = {
  ACAO: '📈', FII: '🏢', ETF: '📊', BDR: '🌎', CRIPTO: '₿', RENDA_FIXA: '🏦',
};

function fmtRaw(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pctRaw(v) {
  return v.toFixed(2).replace('.', ',') + '%';
}

const MASK = '•••••';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [openCats, setOpenCats] = useState({});
  const [hidden, setHidden] = useState(false);

  const fmt = (v) => hidden ? MASK : fmtRaw(v);
  const pct = (v) => hidden ? MASK : pctRaw(v);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data));
  }, []);

  if (!data) return <p>Carregando...</p>;

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
        <button className="btn-outline hide-toggle" onClick={() => setHidden(h => !h)}>
          {hidden ? <FiEyeOff /> : <FiEye />} {hidden ? 'Mostrar valores' : 'Ocultar valores'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card card">
          <div className="stat-icon blue"><FiDollarSign /></div>
          <div>
            <p className="stat-label">Total Investido</p>
            <p className="stat-value">{fmt(data.totalInvested)}</p>
          </div>
        </div>
        <div className="stat-card card">
          <div className={`stat-icon ${data.profit >= 0 ? 'green' : 'red'}`}>
            {data.profit >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
          </div>
          <div>
            <p className="stat-label">Patrimônio Atual</p>
            <p className="stat-value">{fmt(data.totalCurrent)}</p>
            <p className={`stat-change ${data.profit >= 0 ? 'positive' : 'negative'}`}>
              {hidden ? MASK : `${data.profit >= 0 ? '+' : ''}${data.profitPercent.toFixed(2)}%`}
            </p>
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon green"><FiDollarSign /></div>
          <div>
            <p className="stat-label">Dividendos Recebidos</p>
            <p className="stat-value">{fmt(data.totalDividends)}</p>
          </div>
        </div>
      </div>

      {categories.map(cat => {
        const assets = assetsByCategory[cat];
        const isOpen = openCats[cat] !== false;
        const catInfo = data.byCategory[cat] || {};
        const totalSaldo = assets.reduce((s, a) => s + a.saldo, 0);
        const totalInvested = catInfo.invested || 0;
        const variacao = totalInvested > 0 ? ((totalSaldo - totalInvested) / totalInvested) * 100 : 0;
        const rentabilidade = variacao;
        const pctCarteira = data.totalCurrent > 0 ? (totalSaldo / data.totalCurrent) * 100 : 0;

        return (
          <div key={cat} className="category-section">
            <div className="category-header" onClick={() => toggleCat(cat)}>
              <div className="category-title">
                <span className="category-icon">{CATEGORY_ICONS[cat]}</span>
                <span className="category-name">{CATEGORY_LABELS[cat]}</span>
              </div>
              <div className="category-stats">
                <div className="cat-stat">
                  <span className="cat-stat-label">Ativos</span>
                  <span className="cat-stat-value">{assets.length}</span>
                </div>
                <div className="cat-stat">
                  <span className="cat-stat-label">Valor total</span>
                  <span className="cat-stat-value">{fmt(totalSaldo)}</span>
                </div>
                <div className="cat-stat">
                  <span className="cat-stat-label">Variação</span>
                  <span className={`cat-stat-value ${variacao >= 0 ? 'positive' : 'negative'}`}>{pct(variacao)}</span>
                </div>
                <div className="cat-stat">
                  <span className="cat-stat-label">Rentabilidade</span>
                  <span className={`cat-stat-value ${rentabilidade >= 0 ? 'positive' : 'negative'}`}>{pct(rentabilidade)}</span>
                </div>
                <div className="cat-stat">
                  <span className="cat-stat-label">% Carteira</span>
                  <span className="cat-stat-value">{pct(pctCarteira)}</span>
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
                      <th>Ativo</th>
                      <th>Quant.</th>
                      <th>Preço Médio</th>
                      <th>Preço Atual</th>
                      <th>Variação</th>
                      <th>Rentabilidade</th>
                      <th>Saldo</th>
                      <th>% Carteira</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map(a => (
                      <tr key={a.id}>
                        <td>
                          <Link to={`/ativos/${a.id}`} className="asset-cell">
                            <span className={`asset-dot dot-${a.category.toLowerCase()}`} />
                            <strong>{a.ticker}</strong>
                          </Link>
                        </td>
                        <td>{a.quantity % 1 === 0 ? a.quantity : a.quantity.toFixed(8).replace(/0+$/, '')}</td>
                        <td>{a.isCrypto ? <span title={`US$ ${a.averagePrice.toFixed(2)}`}>{fmt(a.averagePriceBrl)}</span> : fmt(a.averagePrice)}</td>
                        <td>{fmt(a.currentPrice)}</td>
                        <td>
                          <span className={`var-badge ${a.variacao >= 0 ? 'var-up' : 'var-down'}`}>
                            {pct(a.variacao)} {a.variacao >= 0 ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: a.rentabilidade >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                            {pct(a.rentabilidade)} {a.rentabilidade >= 0 ? <FiArrowUp size={12} style={{ verticalAlign: 'middle' }} /> : <FiArrowDown size={12} style={{ verticalAlign: 'middle' }} />}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{fmt(a.saldo)}</td>
                        <td>
                          <div className="pct-bar-container">
                            <div className="pct-bar" style={{ width: `${Math.min(a.percentCarteira, 100)}%` }} />
                            <span>{pct(a.percentCarteira)}</span>
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
          <h3>Distribuição por Categoria</h3>
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
            <p className="empty-state">Adicione ativos para ver a distribuição</p>
          )}
        </div>

        <div className="card">
          <h3><FiAlertTriangle style={{ color: 'var(--warning)' }} /> Abaixo do Preço Teto</h3>
          {data.alertas.length > 0 ? (
            <table>
              <thead>
                <tr><th>Ticker</th><th>Atual</th><th>Teto</th></tr>
              </thead>
              <tbody>
                {data.alertas.map(a => (
                  <tr key={a.ticker}>
                    <td><strong>{a.ticker}</strong></td>
                    <td>{fmt(a.currentPrice)}</td>
                    <td>{fmt(a.ceilingPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">Nenhum ativo abaixo do preço teto</p>
          )}
        </div>
      </div>
    </div>
  );
}
