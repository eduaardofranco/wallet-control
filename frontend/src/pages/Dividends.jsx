import { useEffect, useState } from 'react';
import { FiPlus, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import api from '../services/api';
import GrowthBarChart from '../components/GrowthBarChart';

const PAGE_SIZE = 20;

const DIVIDEND_TYPE_LABELS = {
  DIVIDENDO: 'Dividend',
  JCP: 'JCP',
  RENDIMENTO: 'Yield',
};

function fmt(v) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'BRL' });
}

function pct(v) {
  return v.toFixed(2) + '%';
}

function fmtCompact(v) {
  if (Math.abs(v) >= 1000) return `R$ ${Math.round(v / 1000)}k`;
  return `R$ ${v}`;
}

export default function Dividends() {
  const [summary, setSummary] = useState(null);
  const [dividends, setDividends] = useState([]);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [monthlyView, setMonthlyView] = useState('amount');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ticker: '', type: 'DIVIDENDO', date: '', quantity: '', unitPrice: '', amount: '' });
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  function load() {
    api.get('/dividends/summary').then(r => setSummary(r.data));
    api.get('/dividends').then(r => setDividends(r.data));
    api.get('/dashboard').then(r => setPortfolioValue(r.data.totalCurrent));
  }

  useEffect(() => { load(); }, []);

  function resetForm() {
    setForm({ ticker: '', type: 'DIVIDENDO', date: '', quantity: '', unitPrice: '', amount: '' });
    setShowForm(false);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/dividends', {
        ticker: form.ticker,
        type: form.type,
        date: form.date,
        quantity: form.quantity ? Number(form.quantity) : undefined,
        unitPrice: form.unitPrice ? Number(form.unitPrice) : undefined,
        amount: Number(form.amount),
      });
      resetForm();
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Error adding dividend');
    }
  }

  async function handleDelete(d) {
    if (!confirm('Remove this dividend?')) return;
    await api.delete(`/dividends/${d.id}`);
    load();
  }

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

  const totalPages = Math.max(1, Math.ceil(dividends.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = dividends.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Dividends</h1>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <FiPlus style={{ marginRight: 4 }} /> New Dividend
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>New Dividend</h3>
          {error && <p className="error-msg">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem' }}>
              <div className="form-group">
                <label>Ticker</label>
                <input value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value })} required placeholder="E.g.: PETR4" />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="DIVIDENDO">Dividend</option>
                  <option value="JCP">JCP</option>
                  <option value="RENDIMENTO">Yield</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input type="number" step="any" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="Optional" />
              </div>
              <div className="form-group">
                <label>Unit Price (R$)</label>
                <input type="number" step="0.0001" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} placeholder="Optional" />
              </div>
              <div className="form-group">
                <label>Amount (R$)</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
              </div>
            </div>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              Quantity and unit price are optional context (as shown on a B3 statement) — Amount is what actually gets counted, since JCP has tax withheld and won&apos;t equal quantity × unit price.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="submit" className="btn-primary">Add</button>
              <button type="button" className="btn-outline" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.3rem' }}>Total Received</h3>
        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{fmt(total)}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
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
              yTickFormatter={v => monthlyView === 'percent' ? `${v.toFixed(1)}%` : fmtCompact(v)}
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

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>All Dividends</h3>
        <table>
          <thead>
            <tr><th>Ticker</th><th>Type</th><th>Date</th><th>Qty</th><th>Unit Price</th><th>Amount</th><th></th></tr>
          </thead>
          <tbody>
            {paginated.map(d => (
              <tr key={d.id}>
                <td><strong>{d.asset.ticker}</strong></td>
                <td>{DIVIDEND_TYPE_LABELS[d.type] || d.type}</td>
                <td>{new Date(d.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</td>
                <td>{d.quantity ?? '-'}</td>
                <td>{d.unitPrice != null ? fmt(d.unitPrice) : '-'}</td>
                <td style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(d.amount)}</td>
                <td>
                  <button className="btn-outline" style={{ padding: '0.2rem 0.4rem', color: 'var(--danger)' }} onClick={() => handleDelete(d)}>
                    <FiTrash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {dividends.length === 0 && <tr><td colSpan={7} className="empty-state">No dividends registered</td></tr>}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
              Page {currentPage} of {totalPages} ({dividends.length} dividends)
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button className="btn-outline" style={{ padding: '0.3rem 0.6rem' }} disabled={currentPage === 1} onClick={() => setPage(p => p - 1)}>
                <FiChevronLeft />
              </button>
              <button className="btn-outline" style={{ padding: '0.3rem 0.6rem' }} disabled={currentPage === totalPages} onClick={() => setPage(p => p + 1)}>
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
