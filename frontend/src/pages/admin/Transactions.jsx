import React, { useState, useEffect } from 'react'
import { adminBillingService } from '../../services/api'

function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterPartner, setFilterPartner] = useState('')
  const [offset, setOffset] = useState(0)
  const LIMIT = 50

  const load = (off = 0) => {
    setLoading(true)
    const params = { limit: LIMIT, offset: off }
    if (filterPartner) params.partner_id = filterPartner
    adminBillingService.getTransactions(params)
      .then(res => setTransactions(res.data))
      .catch(() => setError('Erro ao carregar transações'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    adminBillingService.getPartners()
      .then(res => setPartners(res.data))
      .catch(() => {})
  }, [])

  useEffect(() => { load(0); setOffset(0) }, [filterPartner])

  const fmtDate = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  const fmtBRL = (v) => `R$ ${Number(v).toFixed(2)}`

  const thStyle = { color: 'var(--text-2)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.5rem 0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border)' }
  const tdStyle = { padding: '0.6rem 0.75rem', color: 'var(--text-1)', fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h2 style={{ color: 'var(--text-1)', marginBottom: '1.5rem' }}>Transações</h2>

      {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem', color: '#f87171', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 12, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={filterPartner}
          onChange={e => setFilterPartner(e.target.value)}
          style={{ padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', fontSize: '0.9rem' }}
        >
          <option value="">Todos os parceiros</option>
          {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>{transactions.length} registros</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-2)', padding: '2rem' }}>Carregando...</div>
      ) : transactions.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-2)', padding: '2rem' }}>Nenhuma transação encontrada</div>
      ) : (
        <div style={{ overflowX: 'auto', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Data</th>
                <th style={thStyle}>Usuário</th>
                <th style={thStyle}>Plano</th>
                <th style={thStyle}>Pago</th>
                <th style={thStyle}>Cheio</th>
                <th style={thStyle}>Comissão</th>
                <th style={thStyle}>Cupom</th>
                <th style={thStyle}>Evento</th>
                <th style={thStyle}>Payment ID</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} style={{ transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={tdStyle}>{fmtDate(tx.created_at)}</td>
                  <td style={tdStyle}>#{tx.user_id}</td>
                  <td style={tdStyle}><span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{tx.plan}</span></td>
                  <td style={{ ...tdStyle, color: '#34d399' }}>{fmtBRL(tx.amount_paid)}</td>
                  <td style={tdStyle}>{fmtBRL(tx.full_price)}</td>
                  <td style={{ ...tdStyle, color: tx.commission_amount > 0 ? '#f59e0b' : 'var(--text-2)' }}>{fmtBRL(tx.commission_amount)}</td>
                  <td style={tdStyle}>{tx.coupon_used ? <span style={{ fontSize: '0.75rem', background: 'rgba(37,99,235,0.15)', color: 'var(--primary-light)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>✓</span> : '—'}</td>
                  <td style={tdStyle}><span style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>{tx.event_type}</span></td>
                  <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-2)' }}>{tx.asaas_payment_id}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: '1rem', justifyContent: 'flex-end' }}>
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
          disabled={transactions.length < LIMIT}
          onClick={() => { const o = offset + LIMIT; setOffset(o); load(o) }}
          style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', cursor: transactions.length < LIMIT ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
        >
          Próxima →
        </button>
      </div>
    </div>
  )
}

export default Transactions
