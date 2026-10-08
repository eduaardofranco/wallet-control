import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiTrash2, FiEdit2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import api from '../services/api';

const PAGE_SIZE = 20;

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'ACAO', label: 'Stocks' },
  { value: 'FII', label: 'REITs' },
  { value: 'ETF', label: 'ETFs' },
  { value: 'BDR', label: 'BDRs' },
  { value: 'CRIPTO', label: 'Crypto' },
  { value: 'RENDA_FIXA', label: 'Fixed Income' },
];

function fmt(v) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'BRL' });
}

function fmtUsd(v) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function fmtByCategory(v, category) {
  return category === 'CRIPTO' ? fmtUsd(v) : fmt(v);
}

function endpointFor(type) {
  return type === 'SELL' ? '/sales' : '/purchases';
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // { id, type }
  const [form, setForm] = useState({ ticker: '', category: 'ACAO', type: 'BUY', quantity: '', price: '', date: '' });
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  function loadTransactions() {
    Promise.all([api.get('/purchases'), api.get('/sales')]).then(([p, s]) => {
      const merged = [
        ...p.data.map(t => ({ ...t, type: 'BUY' })),
        ...s.data.map(t => ({ ...t, type: 'SELL' })),
      ].sort((a, b) => b.date.localeCompare(a.date));
      setTransactions(merged);
    });
  }

  useEffect(() => { loadTransactions(); }, []);

  function resetForm() {
    setForm({ ticker: '', category: 'ACAO', type: 'BUY', quantity: '', price: '', date: '' });
    setEditing(null);
    setShowForm(false);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`${endpointFor(editing.type)}/${editing.id}`, {
          quantity: Number(form.quantity) || 0,
          price: Number(form.price) || 0,
          date: form.date,
        });
      } else {
        await api.post(endpointFor(form.type), {
          ticker: form.ticker,
          category: form.category,
          quantity: Number(form.quantity) || 0,
          price: Number(form.price) || 0,
          date: form.date,
        });
      }
      resetForm();
      loadTransactions();
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving transaction');
    }
  }

  function startEdit(t) {
    setForm({
      ticker: t.asset.ticker,
      category: t.asset.category,
      type: t.type,
      quantity: String(t.quantity),
      price: String(t.price),
      date: t.date.slice(0, 10),
    });
    setEditing({ id: t.id, type: t.type });
    setShowForm(true);
  }

  async function handleDelete(t) {
    if (!confirm(`Remove this ${t.type === 'SELL' ? 'sale' : 'purchase'}?`)) return;
    await api.delete(`${endpointFor(t.type)}/${t.id}`);
    loadTransactions();
  }

  const filtered = filter ? transactions.filter(t => t.asset.category === filter) : transactions;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function changeFilter(value) {
    setFilter(value);
    setPage(1);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Transactions</h1>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <FiPlus style={{ marginRight: 4 }} /> New Transaction
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button key={c.value} className={filter === c.value ? 'btn-primary' : 'btn-outline'} onClick={() => changeFilter(c.value)}>
            {c.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>{editing ? `Edit ${editing.type === 'SELL' ? 'Sale' : 'Purchase'}` : 'New Transaction'}</h3>
          {error && <p className="error-msg">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.8rem' }}>
              <div className="form-group">
                <label>Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} disabled={!!editing}>
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                </select>
              </div>
              <div className="form-group">
                <label>Ticker</label>
                <input value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value })} required disabled={!!editing} placeholder="E.g.: PETR4, BTC" />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} disabled={!!editing}>
                  {CATEGORIES.filter(c => c.value).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input type="number" step="any" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Unit Price {form.category === 'CRIPTO' ? '(USD)' : '(BRL)'}</label>
                <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required placeholder={form.category === 'CRIPTO' ? 'E.g.: 70000.00 (in dollars)' : 'E.g.: 25.50'} />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
            </div>
            {editing && (
              <p style={{ color: 'var(--gray-500)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                Ticker and category can&apos;t be changed here — remove this entry and create a new one if you need to change the asset.
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="submit" className="btn-primary">{editing ? 'Save' : 'Add'}</button>
              <button type="button" className="btn-outline" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Category</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Date</th>
              <th>Unit Price</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(t => (
              <tr key={`${t.type}-${t.id}`}>
                <td><Link to={`/assets/${t.assetId}`}><strong>{t.asset.ticker}</strong></Link></td>
                <td><span className={`badge badge-${t.asset.category.toLowerCase()}`}>{CATEGORIES.find(c => c.value === t.asset.category)?.label || t.asset.category}</span></td>
                <td>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.15rem 0.5rem',
                    borderRadius: 999,
                    color: t.type === 'SELL' ? 'var(--danger)' : 'var(--success)',
                    background: t.type === 'SELL' ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)',
                  }}>
                    {t.type === 'SELL' ? 'Sell' : 'Buy'}
                  </span>
                </td>
                <td>{t.quantity}</td>
                <td>{new Date(t.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</td>
                <td>{fmtByCategory(t.price, t.asset.category)}</td>
                <td>{fmtByCategory(t.quantity * t.price, t.asset.category)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button className="btn-outline" style={{ padding: '0.3rem 0.5rem' }} onClick={() => startEdit(t)}><FiEdit2 /></button>
                    <button className="btn-outline" style={{ padding: '0.3rem 0.5rem', color: 'var(--danger)' }} onClick={() => handleDelete(t)}><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="empty-state">No transactions registered</td></tr>}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
              Page {currentPage} of {totalPages} ({filtered.length} transactions)
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
