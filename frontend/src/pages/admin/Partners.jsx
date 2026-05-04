import React, { useState, useEffect } from 'react'
import { adminBillingService } from '../../services/api'

function Partners() {
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [withdrawId, setWithdrawId] = useState(null)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)

  const load = () => {
    setLoading(true)
    adminBillingService.getPartners()
      .then(res => setPartners(res.data))
      .catch(() => setError('Erro ao carregar parceiros'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      await adminBillingService.createPartner({ name: name.trim(), contact_email: email.trim() || undefined })
      setName('')
      setEmail('')
      load()
    } catch {
      setError('Erro ao criar parceiro')
    } finally {
      setCreating(false)
    }
  }

  const handleWithdraw = async (id) => {
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount <= 0) return
    setWithdrawing(true)
    try {
      await adminBillingService.withdrawCommission(id, amount)
      setWithdrawId(null)
      setWithdrawAmount('')
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao processar saque')
    } finally {
      setWithdrawing(false)
    }
  }

  const cardStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '0.75rem' }
  const inputStyle = { padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h2 style={{ color: 'var(--text-1)', marginBottom: '1.5rem' }}>Parceiros</h2>

      {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem', color: '#f87171', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

      <div style={cardStyle}>
        <h3 style={{ color: 'var(--text-1)', fontSize: '1rem', marginBottom: '1rem' }}>Novo parceiro</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input style={{ ...inputStyle, flex: 2, minWidth: 160 }} placeholder="Nome *" value={name} onChange={e => setName(e.target.value)} required />
          <input style={{ ...inputStyle, flex: 2, minWidth: 160 }} placeholder="Email de contato" value={email} onChange={e => setEmail(e.target.value)} type="email" />
          <button type="submit" className="btn-primary" style={{ minWidth: 100 }} disabled={creating}>
            {creating ? 'Criando...' : 'Criar'}
          </button>
        </form>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-2)', padding: '2rem' }}>Carregando...</div>
      ) : partners.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-2)', padding: '2rem' }}>Nenhum parceiro cadastrado</div>
      ) : (
        partners.map(p => (
          <div key={p.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ color: 'var(--text-1)', fontWeight: 700 }}>{p.name}</div>
                {p.contact_email && <div style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>{p.contact_email}</div>}
                <div style={{ marginTop: 4 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Saldo: </span>
                  <span style={{ fontWeight: 700, color: '#34d399' }}>R$ {Number(p.commission_balance).toFixed(2)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: 4, background: p.is_active ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.12)', color: p.is_active ? '#34d399' : '#f87171' }}>
                  {p.is_active ? 'Ativo' : 'Inativo'}
                </span>
                <button
                  type="button"
                  onClick={() => { setWithdrawId(withdrawId === p.id ? null : p.id); setWithdrawAmount('') }}
                  style={{ padding: '0.35rem 0.75rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Saque
                </button>
              </div>
            </div>
            {withdrawId === p.id && (
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Valor R$"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  style={{ ...inputStyle, maxWidth: 150 }}
                />
                <button className="btn-primary" onClick={() => handleWithdraw(p.id)} disabled={withdrawing} style={{ minWidth: 100 }}>
                  {withdrawing ? 'Processando...' : 'Confirmar'}
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

export default Partners
