import React, { useState, useEffect } from 'react'
import { adminService } from '../../services/api'

function UserCosts() {
  const [costs, setCosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [offset, setOffset] = useState(0)
  const LIMIT = 50

  const load = (off = 0) => {
    setLoading(true)
    setError('')
    adminService.getUserCosts({ limit: LIMIT, offset: off })
      .then(res => setCosts(res.data || []))
      .catch(() => setError('Erro ao carregar custos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(0) }, [])

  const fmtBRL = (v) => `R$ ${Number(v).toFixed(2)}`
  const totalPaid = costs.reduce((sum, u) => sum + (u.total_paid || 0), 0)

  const thStyle = { color: 'var(--text-2)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.5rem 0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border)' }
  const tdStyle = { padding: '0.6rem 0.75rem', color: 'var(--text-1)', fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h2 style={{ color: 'var(--text-1)', marginBottom: '1.5rem' }}>Custos por Usuário</h2>

      {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem', color: '#f87171', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-2)', padding: '2rem' }}>Carregando...</div>
      ) : costs.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-2)', padding: '2rem' }}>Nenhum custo registrado</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Usuário ID</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Plano</th>
                  <th style={thStyle}>Transações</th>
                  <th style={thStyle}>Total Pago</th>
                </tr>
              </thead>
              <tbody>
                {costs.map(u => (
                  <tr key={u.user_id} style={{ transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}>#{u.user_id}</td>
                    <td style={tdStyle}>{u.email}</td>
                    <td style={{ ...tdStyle, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{u.plan}</td>
                    <td style={tdStyle}>{u.transaction_count}</td>
                    <td style={{ ...tdStyle, color: '#34d399', fontWeight: 600 }}>{fmtBRL(u.total_paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0.75rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>{costs.length} registros</span>
            <span style={{ color: 'var(--primary-light)', fontWeight: 700 }}>{fmtBRL(totalPaid)}</span>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => { const o = Math.max(0, offset - LIMIT); setOffset(o); load(o) }}
              style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', cursor: offset === 0 ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
            >
              ← Anterior
            </button>
            <button
              type="button"
              disabled={costs.length < LIMIT}
              onClick={() => { const o = offset + LIMIT; setOffset(o); load(o) }}
              style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', cursor: costs.length < LIMIT ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
            >
              Próxima →
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default UserCosts
