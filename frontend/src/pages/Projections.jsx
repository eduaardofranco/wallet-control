import { useEffect, useState } from 'react';
import { FiEdit2, FiCheck, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import api from '../services/api';

function fmtRaw(v) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'BRL' });
}

function pct(v) {
  return v.toFixed(2) + '%';
}

export default function Projections() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [payoutValue, setPayoutValue] = useState('');
  const [dividendValue, setDividendValue] = useState('');

  function load() {
    api.get(`/projections/${year}`).then(r => setRows(r.data));
  }

  useEffect(() => { load(); }, [year]);

  function startEdit(row) {
    setEditingId(row.assetId);
    setPayoutValue(row.payoutPct != null ? String(row.payoutPct) : '');
    setDividendValue(row.dividendPerShare != null ? String(row.dividendPerShare) : '');
  }

  function cancelEdit() {
    setEditingId(null);
    setPayoutValue('');
    setDividendValue('');
  }

  async function save(assetId) {
    const dividendPerShare = Number(dividendValue);
    if (Number.isNaN(dividendPerShare) || dividendPerShare < 0) return;
    const payoutPct = payoutValue === '' ? null : Number(payoutValue);
    await api.put(`/projections/${assetId}`, { year, payoutPct, dividendPerShare });
    cancelEdit();
    load();
  }

  const totalEstimated = rows.reduce((s, r) => s + r.receivedInYear, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Projections</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn-outline" style={{ padding: '0.3rem 0.5rem' }} onClick={() => setYear(y => y - 1)}>
            <FiChevronLeft size={14} />
          </button>
          <strong>{year}</strong>
          <button className="btn-outline" style={{ padding: '0.3rem 0.5rem' }} onClick={() => setYear(y => y + 1)}>
            <FiChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.3rem' }}>Total Estimated — Dividends {year}</h3>
        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{fmtRaw(totalEstimated)}</p>
      </div>

      {rows.length > 0 ? (
        <div className="card">
          <table className="assets-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Qty.</th>
                <th>Avg. Price</th>
                <th>Current Price</th>
                <th>Payout %</th>
                <th>Div./Share</th>
                <th>Yield % (Price)</th>
                <th>Yield % (Avg. Price)</th>
                <th>Received in Year</th>
                <th>Bazin Ceiling Price</th>
                <th>Safety Margin</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.assetId}>
                  <td><strong>{r.ticker}</strong></td>
                  <td>{r.quantity % 1 === 0 ? r.quantity : r.quantity.toFixed(8).replace(/0+$/, '')}</td>
                  <td>{fmtRaw(r.averagePrice)}</td>
                  <td>{fmtRaw(r.currentPrice)}</td>

                  {editingId === r.assetId ? (
                    <>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          autoFocus
                          value={payoutValue}
                          onChange={e => setPayoutValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') save(r.assetId);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          style={{ width: 70 }}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <input
                            type="number"
                            step="0.01"
                            value={dividendValue}
                            onChange={e => setDividendValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') save(r.assetId);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            style={{ width: 70 }}
                          />
                          <button className="btn-outline" style={{ padding: '0.2rem 0.4rem' }} onClick={() => save(r.assetId)}><FiCheck size={14} /></button>
                          <button className="btn-outline" style={{ padding: '0.2rem 0.4rem' }} onClick={cancelEdit}><FiX size={14} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{r.payoutPct != null ? pct(r.payoutPct) : '—'}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          {r.dividendPerShare != null ? fmtRaw(r.dividendPerShare) : '—'}
                          <FiEdit2
                            size={13}
                            style={{ cursor: 'pointer', color: 'var(--gray-500)' }}
                            onClick={() => startEdit(r)}
                            title="Update payout % and dividend per share"
                          />
                        </span>
                      </td>
                    </>
                  )}

                  <td>{pct(r.yieldOnPrice * 100)}</td>
                  <td>{pct(r.yieldOnAvgPrice * 100)}</td>
                  <td>{fmtRaw(r.receivedInYear)}</td>
                  <td>{fmtRaw(r.ceilingPriceBazin)}</td>
                  <td style={{ color: r.safetyMargin >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                    {pct(r.safetyMargin * 100)}
                  </td>
                  <td>
                    <span className={`var-badge ${r.approved ? 'var-up' : 'var-down'}`}>
                      {r.approved ? 'Approved' : 'Above Ceiling'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-state">Add a purchase to see it here</p>
      )}
    </div>
  );
}
