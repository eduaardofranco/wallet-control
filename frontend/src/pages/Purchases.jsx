import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';
import api from '../services/api';

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

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ticker: '', category: 'ACAO', quantity: '', price: '', date: '' });
  const [error, setError] = useState('');

  function loadPurchases() {
    api.get('/purchases').then(r => setPurchases(r.data));
  }

  useEffect(() => { loadPurchases(); }, []);

  function resetForm() {
    setForm({ ticker: '', category: 'ACAO', quantity: '', price: '', date: '' });
    setEditing(null);
    setShowForm(false);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/purchases/${editing}`, {
          quantity: Number(form.quantity) || 0,
          price: Number(form.price) || 0,
          date: form.date,
        });
      } else {
        await api.post('/purchases', {
          ticker: form.ticker,
          category: form.category,
          quantity: Number(form.quantity) || 0,
          price: Number(form.price) || 0,
          date: form.date,
        });
      }
      resetForm();
      loadPurchases();
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving purchase');
    }
  }

  function startEdit(p) {
    setForm({
      ticker: p.asset.ticker,
      category: p.asset.category,
      quantity: String(p.quantity),
      price: String(p.price),
      date: p.date.slice(0, 10),
    });
    setEditing(p.id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!confirm('Remove this purchase?')) return;
    await api.delete(`/purchases/${id}`);
    loadPurchases();
  }

  const filtered = filter ? purchases.filter(p => p.asset.category === filter) : purchases;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Purchases</h1>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <FiPlus style={{ marginRight: 4 }} /> New Purchase
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button key={c.value} className={filter === c.value ? 'btn-primary' : 'btn-outline'} onClick={() => setFilter(c.value)}>
            {c.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>{editing ? 'Edit Purchase' : 'New Purchase'}</h3>
          {error && <p className="error-msg">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.8rem' }}>
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
                Ticker and category can&apos;t be changed here — remove the purchase and create a new one if you need to change the asset.
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
              <th>Quantity</th>
              <th>Date</th>
              <th>Unit Price</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td><Link to={`/assets/${p.assetId}`}><strong>{p.asset.ticker}</strong></Link></td>
                <td><span className={`badge badge-${p.asset.category.toLowerCase()}`}>{CATEGORIES.find(c => c.value === p.asset.category)?.label || p.asset.category}</span></td>
                <td>{p.quantity}</td>
                <td>{new Date(p.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</td>
                <td>{fmt(p.price)}</td>
                <td>{fmt(p.quantity * p.price)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button className="btn-outline" style={{ padding: '0.3rem 0.5rem' }} onClick={() => startEdit(p)}><FiEdit2 /></button>
                    <button className="btn-outline" style={{ padding: '0.3rem 0.5rem', color: 'var(--danger)' }} onClick={() => handleDelete(p.id)}><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="empty-state">No purchases registered</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
