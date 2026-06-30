import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiTrash2 } from 'react-icons/fi';
import api from '../services/api';

function fmt(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [showDividendForm, setShowDividendForm] = useState(false);
  const [divForm, setDivForm] = useState({ amount: '', date: '', type: 'DIVIDENDO' });
  const [error, setError] = useState('');

  function load() {
    api.get(`/assets/${id}`).then(r => setAsset(r.data)).catch(() => navigate('/ativos'));
  }

  useEffect(() => { load(); }, [id]);

  async function addDividend(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/dividends/${id}`, {
        amount: Number(divForm.amount),
        date: divForm.date,
        type: divForm.type,
      });
      setDivForm({ amount: '', date: '', type: 'DIVIDENDO' });
      setShowDividendForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao adicionar dividendo');
    }
  }

  async function removeDividend(divId) {
    if (!confirm('Remover este dividendo?')) return;
    await api.delete(`/dividends/${divId}`);
    load();
  }

  if (!asset) return <p>Carregando...</p>;

  const totalInvested = asset.quantity * asset.averagePrice;
  const totalCurrent = asset.quantity * asset.currentPrice;
  const profit = totalCurrent - totalInvested;
  const totalDividends = asset.dividends.reduce((sum, d) => sum + d.amount, 0);
  const belowCeiling = asset.ceilingPrice && asset.currentPrice <= asset.ceilingPrice;

  return (
    <div>
      <button className="btn-outline" onClick={() => navigate('/ativos')} style={{ marginBottom: '1rem' }}>
        <FiArrowLeft style={{ marginRight: 4 }} /> Voltar
      </button>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem' }}>{asset.ticker}</h1>
            <p style={{ color: 'var(--gray-500)' }}>{asset.name}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '1.5rem', textAlign: 'right' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Preço Atual</p>
              <p style={{ fontSize: '1.2rem', fontWeight: 700, color: belowCeiling ? 'var(--success)' : undefined }}>
                {fmt(asset.currentPrice)}
              </p>
              {asset.ceilingPrice && <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Teto: {fmt(asset.ceilingPrice)}</p>}
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Total Investido</p>
              <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{fmt(totalInvested)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{asset.quantity} x {fmt(asset.averagePrice)}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Lucro/Prejuízo</p>
              <p style={{ fontSize: '1.2rem', fontWeight: 700, color: profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {profit >= 0 ? '+' : ''}{fmt(profit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Dividendos ({fmt(totalDividends)} total)</h3>
          <button className="btn-primary" onClick={() => setShowDividendForm(true)}>
            <FiPlus style={{ marginRight: 4 }} /> Adicionar
          </button>
        </div>

        {showDividendForm && (
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--gray-100)', borderRadius: 'var(--radius)' }}>
            {error && <p className="error-msg">{error}</p>}
            <form onSubmit={addDividend} style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Valor (R$)</label>
                <input type="number" step="0.01" value={divForm.amount} onChange={e => setDivForm({ ...divForm, amount: e.target.value })} required style={{ width: 150 }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Data</label>
                <input type="date" value={divForm.date} onChange={e => setDivForm({ ...divForm, date: e.target.value })} required style={{ width: 160 }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Tipo</label>
                <select value={divForm.type} onChange={e => setDivForm({ ...divForm, type: e.target.value })} style={{ width: 150 }}>
                  <option value="DIVIDENDO">Dividendo</option>
                  <option value="JCP">JCP</option>
                  <option value="RENDIMENTO">Rendimento</option>
                </select>
              </div>
              <button type="submit" className="btn-primary">Salvar</button>
              <button type="button" className="btn-outline" onClick={() => setShowDividendForm(false)}>Cancelar</button>
            </form>
          </div>
        )}

        <table>
          <thead>
            <tr><th>Data</th><th>Tipo</th><th>Valor</th><th></th></tr>
          </thead>
          <tbody>
            {asset.dividends.map(d => (
              <tr key={d.id}>
                <td>{new Date(d.date).toLocaleDateString('pt-BR')}</td>
                <td>{d.type}</td>
                <td style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(d.amount)}</td>
                <td>
                  <button className="btn-outline" style={{ padding: '0.2rem 0.4rem', color: 'var(--danger)' }} onClick={() => removeDividend(d.id)}>
                    <FiTrash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {asset.dividends.length === 0 && <tr><td colSpan={4} className="empty-state">Nenhum dividendo registrado</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
