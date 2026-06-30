import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';

function fmt(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Dividends() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/dividends/summary').then(r => setSummary(r.data));
  }, []);

  if (!summary) return <p>Carregando...</p>;

  const monthlyData = Object.entries(summary.byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month, value }));

  const assetData = Object.entries(summary.byAsset)
    .sort(([, a], [, b]) => b - a)
    .map(([ticker, value]) => ({ ticker, value }));

  const total = assetData.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <h1 className="page-title">Dividendos</h1>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.3rem' }}>Total Recebido</h3>
        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{fmt(total)}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Dividendos por Mês</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={v => fmt(v)} />
                <Bar dataKey="value" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-state">Nenhum dividendo registrado</p>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Dividendos por Ativo</h3>
          {assetData.length > 0 ? (
            <table>
              <thead>
                <tr><th>Ativo</th><th>Total</th><th>% do Total</th></tr>
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
            <p className="empty-state">Nenhum dividendo registrado</p>
          )}
        </div>
      </div>
    </div>
  );
}
