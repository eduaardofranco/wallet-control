import { useEffect, useState } from 'react';
import api from '../services/api';
import GrowthBarChart from '../components/GrowthBarChart';

function fmt(v) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'BRL' });
}

function pct(v) {
  return v.toFixed(2) + '%';
}

export default function Dividends() {
  const [summary, setSummary] = useState(null);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [monthlyView, setMonthlyView] = useState('amount');

  useEffect(() => {
    api.get('/dividends/summary').then(r => setSummary(r.data));
    api.get('/dashboard').then(r => setPortfolioValue(r.data.totalCurrent));
  }, []);

  if (!summary) return <p>Loading...</p>;

  const monthlyData = Object.entries(summary.byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => {
      const [year, m] = month.split('-');
      return {
        month: `${m}/${year.slice(2)}`,
        value: monthlyView === 'percent' && portfolioValue > 0 ? (value / portfolioValue) * 100 : value,
      };
    });

  const assetData = Object.entries(summary.byAsset)
    .sort(([, a], [, b]) => b - a)
    .map(([ticker, value]) => ({ ticker, value }));

  const total = assetData.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <h1 className="page-title">Dividends</h1>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.3rem' }}>Total Received</h3>
        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{fmt(total)}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Dividends by Month</h3>
            <select value={monthlyView} onChange={e => setMonthlyView(e.target.value)} style={{ width: 90 }}>
              <option value="amount">R$</option>
              <option value="percent">%</option>
            </select>
          </div>
          {monthlyView === 'percent' && (
            <p style={{ color: 'var(--gray-500)', fontSize: '0.8rem', marginTop: '-0.5rem', marginBottom: '0.8rem' }}>
              Each bar is that month&apos;s dividends as a % of your portfolio&apos;s current total value ({fmt(portfolioValue)}).
            </p>
          )}
          {monthlyData.length > 0 ? (
            <GrowthBarChart
              data={monthlyData}
              height={300}
              tooltipFormatter={v => monthlyView === 'percent' ? pct(v) : fmt(v)}
            />
          ) : (
            <p className="empty-state">No dividends registered</p>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Dividends by Asset</h3>
          {assetData.length > 0 ? (
            <table>
              <thead>
                <tr><th>Asset</th><th>Total</th><th>% of Total</th></tr>
              </thead>
              <tbody>
                {assetData.map(d => (
                  <tr key={d.ticker}>
                    <td><strong>{d.ticker}</strong></td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(d.value)}</td>
                    <td>{((d.value / total) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">No dividends registered</p>
          )}
        </div>
      </div>
    </div>
  );
}
