import { useEffect, useState } from 'react';
import { FiEdit2, FiCheck, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import api from '../services/api';

function fmtRaw(v) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'BRL' });
}

function pct(v) {
  return v.toFixed(2) + '%';
}

export default function Goals() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [goalValue, setGoalValue] = useState('');

  function load() {
    api.get(`/goals/${year}`).then(r => {
      setRows(r.data.rows);
      setSummary(r.data.summary);
    });
  }

  useEffect(() => { load(); }, [year]);

  function startEdit(row) {
    setEditingId(row.assetId);
    setGoalValue(row.goalQuantity != null ? String(row.goalQuantity) : '');
  }

  function cancelEdit() {
    setEditingId(null);
    setGoalValue('');
  }

  async function save(assetId) {
    const goalQuantity = goalValue === '' ? null : Number(goalValue);
    if (goalQuantity != null && (Number.isNaN(goalQuantity) || goalQuantity < 0)) return;
    await api.put(`/assets/${assetId}`, { goalQuantity });
    cancelEdit();
    load();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Goals</h1>
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

      {summary && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card card">
            <div>
              <p className="stat-label">Total Investment Needed</p>
              <p className="stat-value">{fmtRaw(summary.totalInvestmentNeeded)}</p>
            </div>
          </div>
          <div className="stat-card card">
            <div>
              <p className="stat-label">Current Passive Income / Year</p>
              <p className="stat-value">{fmtRaw(summary.totalCurrentIncome)}</p>
            </div>
          </div>
          <div className="stat-card card">
            <div>
              <p className="stat-label">Target Passive Income / Year</p>
              <p className="stat-value">{fmtRaw(summary.totalTargetIncome)}</p>
            </div>
          </div>
        </div>
      )}

      {rows.length > 0 ? (
        <div className="card">
          <table className="assets-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Current Qty.</th>
                <th>Goal Qty.</th>
                <th>Remaining</th>
                <th>Price</th>
                <th>Bazin Ceiling</th>
                <th>Margin</th>
                <th>Investment Needed</th>
                <th>Current Income/Year</th>
                <th>Target Income/Year</th>
                <th>% Remaining</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.assetId}>
                  <td><strong>{r.ticker}</strong></td>
                  <td>{r.quantity % 1 === 0 ? r.quantity : r.quantity.toFixed(8).replace(/0+$/, '')}</td>

                  {editingId === r.assetId ? (
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <input
                          type="number"
                          step="1"
                          autoFocus
                          value={goalValue}
                          onChange={e => setGoalValue(e.target.value)}
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
                  ) : (
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        {r.goalQuantity != null ? r.goalQuantity : '—'}
                        <FiEdit2
                          size={13}
                          style={{ cursor: 'pointer', color: 'var(--gray-500)' }}
                          onClick={() => startEdit(r)}
                          title="Update goal quantity"
                        />
                      </span>
                    </td>
                  )}

                  <td>{r.remaining != null ? r.remaining : '—'}</td>
                  <td>{fmtRaw(r.currentPrice)}</td>
                  <td>{r.ceilingPriceBazin > 0 ? fmtRaw(r.ceilingPriceBazin) : '—'}</td>
                  <td style={{ color: r.safetyMargin >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                    {r.ceilingPriceBazin > 0 ? pct(r.safetyMargin * 100) : '—'}
                  </td>
                  <td>{r.investmentNeeded != null ? fmtRaw(r.investmentNeeded) : '—'}</td>
                  <td>{fmtRaw(r.currentIncome)}</td>
                  <td>{r.targetIncome != null ? fmtRaw(r.targetIncome) : '—'}</td>
                  <td>{r.percentRemaining != null ? pct(r.percentRemaining) : '—'}</td>
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
