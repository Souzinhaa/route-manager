import React, { useState, useEffect } from 'react'
import { adminBillingService } from '../../services/api'

function Coupons() {
  const [coupons, setCoupons] = useState([])
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [creating, setCreating] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([adminBillingService.getCoupons(), adminBillingService.getPartners()])
      .then(([c, p]) => { setCoupons(c.data); setPartners(p.data) })
      .catch(() => setError('Erro ao carregar dados'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!code.trim() || !partnerId) return
    setCreating(true)
    try {
      await adminBillingService.createCoupon({ code: code.trim(), partner_id: parseInt(partnerId) })
      setCode('')
      setPartnerId('')
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao criar cupom')
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (id) => {
    try {
      await adminBillingService.toggleCoupon(id)
      load()
    } catch {
      setError('Erro ao atualizar cupom')
    }
  }

  const cardStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '0.75rem' }
  const inputStyle = { padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h2 style={{ color: 'var(--text-1)', marginBottom: '1.5rem' }}>Cupons</h2>

      {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem', color: '#f87171', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

      <div style={cardStyle}>
        <h3 style={{ color: 'var(--text-1)', fontSize: '1rem', marginBottom: '1rem' }}>Novo cupom</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            style={{ ...inputStyle, flex: 1, minWidth: 140, textTransform: 'uppercase' }}
            placeholder="CÓDIGO *"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            required
          />
          <select
            style={{ ...inputStyle, flex: 1, minWidth: 160 }}
            value={partnerId}
            onChange={e => setPartnerId(e.target.value)}
            required
          >
            <option value="">Selecionar parceiro *</option>
            {partners.filter(p => p.is_active).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary" style={{ minWidth: 100 }} disabled={creating}>
            {creating ? 'Criando...' : 'Criar'}
          </button>
        </form>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-2)', padding: '2rem' }}>Carregando...</div>
      ) : coupons.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-2)', padding: '2rem' }}>Nenhum cupom cadastrado</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {coupons.map(c => {
            const partner = partners.find(p => p.id === c.partner_id)
            return (
              <div key={c.id} style={{ ...cardStyle, marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-1)', fontSize: '1rem' }}>{c.code}</span>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: 4, background: c.is_active ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.12)', color: c.is_active ? '#34d399' : '#f87171' }}>
                    {c.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                {partner && <div style={{ color: 'var(--text-2)', fontSize: '0.8rem', marginBottom: 8 }}>{partner.name}</div>}
                <button
                  type="button"
                  onClick={() => handleToggle(c.id)}
                  style={{ width: '100%', padding: '0.35rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.78rem' }}
                >
                  {c.is_active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Coupons
