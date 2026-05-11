import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { partnerService } from '../services/api'

const cardStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', marginBottom: '1rem' }
const labelStyle = { color: 'var(--text-2)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }

function PartnerPortal() {
  const { token } = useParams()
  const [portal, setPortal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError('')
    partnerService.getPortal(token)
      .then(res => setPortal(res.data))
      .catch(err => {
        setPortal(null)
        setError(err.response?.data?.detail || 'Não foi possível carregar o portal')
      })
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: '1.5rem' }}>
        <div>
          <p style={{ color: 'var(--primary-light)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: 8 }}>Portal do Parceiro</p>
          <h1 style={{ color: 'var(--text-1)', fontSize: '2rem', margin: 0 }}>Dashboard público</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.95rem', marginTop: 8 }}>Visão geral de comissão, repasses e clientes ativos por token.</p>
        </div>
        <Link to="/" style={{ padding: '0.75rem 1rem', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', color: 'var(--text-1)', textDecoration: 'none', fontWeight: 700 }}>Voltar ao site</Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-2)' }}>Carregando...</div>
      ) : error ? (
        <div style={{ ...cardStyle, borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#b91c1c' }}>
          <h2 style={{ marginTop: 0, color: '#991b1b' }}>Link inválido</h2>
          <p>{error}</p>
          <Link to="/" style={{ display: 'inline-block', marginTop: '1rem', padding: '0.65rem 1rem', borderRadius: 8, background: '#111827', color: '#fff', textDecoration: 'none' }}>Voltar</Link>
        </div>
      ) : portal ? (
        <>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: '1rem' }}>
            <div style={cardStyle}>
              <div style={{ color: 'var(--text-2)', fontSize: '0.8rem', marginBottom: 6 }}>Parceiro</div>
              <div style={{ color: 'var(--text-1)', fontSize: '1.5rem', fontWeight: 700 }}>{portal.name}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ color: 'var(--text-2)', fontSize: '0.8rem', marginBottom: 6 }}>Saldo disponível</div>
              <div style={{ color: '#16a34a', fontSize: '1.7rem', fontWeight: 700 }}>R$ {Number(portal.commission_balance).toFixed(2)}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ color: 'var(--text-2)', fontSize: '0.8rem', marginBottom: 6 }}>Total ganho</div>
              <div style={{ color: 'var(--primary-light)', fontSize: '1.7rem', fontWeight: 700 }}>R$ {Number(portal.total_earned).toFixed(2)}</div>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, color: 'var(--text-1)', fontSize: '1rem' }}>Dados de pagamento</h2>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr', marginTop: '1rem' }}>
              <div>
                <span style={labelStyle}>Chave PIX</span>
                <div style={{ color: portal.pix_key ? 'var(--text-1)' : 'var(--text-2)', fontWeight: 700 }}>{portal.pix_key || 'Não configurado'}</div>
              </div>
              <div>
                <span style={labelStyle}>Tipo PIX</span>
                <div style={{ color: portal.pix_key_type ? 'var(--text-1)' : 'var(--text-2)', fontWeight: 700 }}>{portal.pix_key_type || 'Desconhecido'}</div>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, color: 'var(--text-1)', fontSize: '1rem' }}>Clientes ativos</h2>
            {portal.active_users.length === 0 ? (
              <p style={{ color: 'var(--text-2)', margin: 0 }}>Nenhum cliente ativo encontrado para este parceiro.</p>
            ) : (
              <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
                {portal.active_users.map((user, index) => (
                  <div key={index} style={{ padding: '0.95rem 1rem', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: 'var(--text-1)', fontWeight: 700 }}>{user.email}</div>
                      <div style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Plano: {user.plan} · Status: {user.plan_status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

export default PartnerPortal
