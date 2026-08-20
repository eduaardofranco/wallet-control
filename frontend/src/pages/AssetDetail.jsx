import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiTrash2 } from 'react-icons/fi';
import api from '../services/api';

function fmt(v) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'BRL' });
}

function fmtUsd(v) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({ quantity: '', price: '', date: '' });
  const [purchaseError, setPurchaseError] = useState('');

  function load() {
    api.get(`/assets/${id}`).then(r => setAsset(r.data)).catch(() => navigate('/transactions'));
  }

  useEffect(() => { load(); }, [id]);

  async function addPurchase(e) {
    e.preventDefault();
    setPurchaseError('');
    try {
      await api.post(`/purchases/${id}`, {
        quantity: Number(purchaseForm.quantity),
        price: Number(purchaseForm.price),
        date: purchaseForm.date,
      });
      setPurchaseForm({ quantity: '', price: '', date: '' });
      setShowPurchaseForm(false);
      load();
    } catch (err) {
      setPurchaseError(err.response?.data?.error || 'Error adding purchase');
    }
  }

  async function removePurchase(purchaseId) {
    if (!confirm('Remove this purchase?')) return;
    await api.delete(`/purchases/${purchaseId}`);
    load();
  }

  if (!asset) return <p>Loading...</p>;

  const fmtA = asset.isCrypto ? fmtUsd : fmt;
  const totalInvested = asset.quantity * asset.averagePrice;
  const totalCurrent = asset.quantity * asset.currentPrice;
  const profit = totalCurrent - totalInvested;
  const belowCeiling = asset.ceilingPrice && asset.currentPrice <= asset.ceilingPrice;

  return (
    <div>
      <button className="btn-outline" onClick={() => navigate('/transactions')} style={{ marginBottom: '1rem' }}>
        <FiArrowLeft style={{ marginRight: 4 }} /> Back
      </button>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem' }}>{asset.ticker}</h1>
            <p style={{ color: 'var(--gray-500)' }}>{asset.name}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '1.5rem', textAlign: 'right' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Current Price</p>
              <p style={{ fontSize: '1.2rem', fontWeight: 700, color: belowCeiling ? 'var(--success)' : undefined }}>
                {fmtA(asset.currentPrice)}
              </p>
              {asset.ceilingPrice && <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Ceiling: {fmt(asset.ceilingPrice)}</p>}
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Total Invested</p>
              <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{fmtA(totalInvested)}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{asset.quantity} x {fmtA(asset.averagePrice)}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Profit/Loss</p>
              <p style={{ fontSize: '1.2rem', fontWeight: 700, color: profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {profit >= 0 ? '+' : ''}{fmtA(profit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Purchases ({asset.purchases.length})</h3>
          <button className="btn-primary" onClick={() => setShowPurchaseForm(true)}>
            <FiPlus style={{ marginRight: 4 }} /> Add
          </button>
        </div>

        {showPurchaseForm && (
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--gray-100)', borderRadius: 'var(--radius)' }}>
            {purchaseError && <p className="error-msg">{purchaseError}</p>}
            <form onSubmit={addPurchase} style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Quantity</label>
                <input type="number" step="any" value={purchaseForm.quantity} onChange={e => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} required style={{ width: 140 }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Unit Price {asset.isCrypto ? '(USD)' : ''}</label>
                <input type="number" step="0.01" value={purchaseForm.price} onChange={e => setPurchaseForm({ ...purchaseForm, price: e.target.value })} required style={{ width: 140 }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Date</label>
                <input type="date" value={purchaseForm.date} onChange={e => setPurchaseForm({ ...purchaseForm, date: e.target.value })} required style={{ width: 160 }} />
              </div>
              <button type="submit" className="btn-primary">Save</button>
              <button type="button" className="btn-outline" onClick={() => setShowPurchaseForm(false)}>Cancel</button>
            </form>
          </div>
        )}

        <table>
          <thead>
            <tr><th>Date</th><th>Qty</th><th>Unit Price</th><th>Total</th><th></th></tr>
          </thead>
          <tbody>
            {asset.purchases.map(p => (
              <tr key={p.id}>
                <td>{new Date(p.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</td>
                <td>{p.quantity}</td>
                <td>{fmtA(p.price)}</td>
                <td>{fmtA(p.quantity * p.price)}</td>
                <td>
                  <button className="btn-outline" style={{ padding: '0.2rem 0.4rem', color: 'var(--danger)' }} onClick={() => removePurchase(p.id)}>
                    <FiTrash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {asset.purchases.length === 0 && <tr><td colSpan={5} className="empty-state">No purchases registered</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
