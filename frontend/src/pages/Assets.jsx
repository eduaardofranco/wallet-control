import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';
import api from '../services/api';

const CATEGORIES = [
  { value: '', label: 'Todas' },
  { value: 'ACAO', label: 'Ações' },
  { value: 'FII', label: 'FIIs' },
  { value: 'ETF', label: 'ETFs' },
  { value: 'BDR', label: 'BDRs' },
  { value: 'CRIPTO', label: 'Cripto' },
  { value: 'RENDA_FIXA', label: 'Renda Fixa' },
];

function fmt(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [usdBrl, setUsdBrl] = useState(1);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ticker: '', category: 'ACAO', quantity: '', averagePrice: '' });
  const [error, setError] = useState('');
  
  function loadAssets() {
    const params = filter ? { category: filter } : {};
    api.get('/assets', { params }).then(r => {
      setAssets(r.data.assets || r.data);
      if (r.data.usdBrl) setUsdBrl(r.data.usdBrl);
    });
  }

  useEffect(() => { loadAssets(); }, [filter]);

  function resetForm() {
    setForm({ ticker: '', category: 'ACAO', quantity: '', averagePrice: '' });
    setEditing(null);
    setShowForm(false);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = {
      ticker: form.ticker,
      category: form.category,
      quantity: Number(form.quantity) || 0,
      averagePrice: Number(form.averagePrice) || 0,
    };
    try {
      if (editing) {
        await api.put(`/assets/${editing}`, payload);
      } else {
        await api.post('/assets', payload);
      }
      resetForm();
      loadAssets();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar');
    }
  }

  function startEdit(asset) {
    setForm({
      ticker: asset.ticker,
      category: asset.category,
      quantity: String(asset.quantity),
      averagePrice: String(asset.averagePrice),
    });
    setEditing(asset.id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!confirm('Remover este ativo?')) return;
    await api.delete(`/assets/${id}`);
    loadAssets();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Ativos</h1>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <FiPlus style={{ marginRight: 4 }} /> Novo Ativo
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
          <h3 style={{ marginBottom: '1rem' }}>{editing ? 'Editar Ativo' : 'Novo Ativo'}</h3>
          {error && <p className="error-msg">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
              <div className="form-group">
                <label>Ticker</label>
                <input value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value })} required disabled={!!editing} placeholder="Ex: PETR4, BTC" />
              </div>
              <div className="form-group">
                <label>Categoria</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.filter(c => c.value).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Quantidade</label>
                <input type="number" step="any" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Preço Médio {form.category === 'CRIPTO' ? '(USD)' : '(BRL)'}</label>
                <input type="number" step="0.01" value={form.averagePrice} onChange={e => setForm({ ...form, averagePrice: e.target.value })} placeholder={form.category === 'CRIPTO' ? 'Ex: 70000.00 (em dólar)' : 'Ex: 25.50'} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="submit" className="btn-primary">{editing ? 'Salvar' : 'Adicionar'}</button>
              <button type="button" className="btn-outline" onClick={resetForm}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Categoria</th>
              <th>Qtd</th>
              <th>PM</th>
              <th>Atual</th>
              <th>Teto</th>
              <th>Total</th>
              <th>Lucro</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assets.map(a => {
              const pmBrl = a.isCrypto ? a.averagePrice * usdBrl : a.averagePrice;
              const total = a.quantity * a.currentPrice;
              const invested = a.quantity * pmBrl;
              const profit = total - invested;
              const belowCeiling = a.ceilingPrice && a.currentPrice <= a.ceilingPrice;
              return (
                <tr key={a.id}>
                  <td><Link to={`/ativos/${a.id}`}><strong>{a.ticker}</strong></Link></td>
                  <td><span className={`badge badge-${a.category.toLowerCase()}`}>{CATEGORIES.find(c => c.value === a.category)?.label || a.category}</span></td>
                  <td>{a.quantity}</td>
                  <td>{a.isCrypto ? <span title={`US$ ${a.averagePrice.toFixed(2)}`}>{fmt(pmBrl)}</span> : fmt(a.averagePrice)}</td>
                  <td style={belowCeiling ? { color: 'var(--success)', fontWeight: 600 } : undefined}>{fmt(a.currentPrice)}</td>
                  <td>{a.ceilingPrice ? fmt(a.ceilingPrice) : '-'}</td>
                  <td>{fmt(total)}</td>
                  <td style={{ color: profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                    {profit >= 0 ? '+' : ''}{fmt(profit)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button className="btn-outline" style={{ padding: '0.3rem 0.5rem' }} onClick={() => startEdit(a)}><FiEdit2 /></button>
                      <button className="btn-outline" style={{ padding: '0.3rem 0.5rem', color: 'var(--danger)' }} onClick={() => handleDelete(a.id)}><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {assets.length === 0 && <tr><td colSpan={9} className="empty-state">Nenhum ativo cadastrado</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
