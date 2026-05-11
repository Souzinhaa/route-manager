import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { billingService } from '../services/api'

function getBlockReason(user) {
  if (user.plan_status === 'pending') return 'pending'
  if (user.plan_status === 'cancelled') return 'cancelled'
  if (user.plan_status === 'trial') {
    const exp = user.trial_expires_at ? new Date(user.trial_expires_at) : null
    if (exp && exp <= new Date()) return 'expired'
  }
  return null
}

const MESSAGES = {
  pending: {
    icon: '⏳',
    title: 'Pagamento Pendente',
    body: 'Seu pagamento ainda não foi confirmado. Complete o pagamento para continuar usando o Roteirizador.',
    color: '#fbbf24',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
  },
  cancelled: {
    icon: '❌',
    title: 'Assinatura Cancelada',
    body: 'Sua assinatura foi cancelada. Escolha um novo plano para continuar ou use o plano gratuito com recursos limitados.',
    color: '#f87171',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
  },
  expired: {
    icon: '⚠️',
    title: 'Trial Expirado',
    body: 'Seu período gratuito de 3 dias terminou. Assine um plano para continuar ou use o plano gratuito com recursos limitados.',
    color: '#f87171',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
  },
}

function PaymentWallModal({ user, onDowngrade }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reason = getBlockReason(user)
  if (!reason) return null

  const msg = MESSAGES[reason]

  const handleDowngrade = async () => {
    setLoading(true)
    setError('')
    try {
      await billingService.downgrade()
      onDowngrade()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao alterar plano')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, padding: '1rem',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--card)',
        border: `1px solid ${msg.border}`,
        borderRadius: 20,
        padding: '2.5rem 2rem',
        maxWidth: 460, width: '100%',
        textAlign: 'center',
        boxShadow: `0 0 60px ${msg.bg}`,
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{msg.icon}</div>
        <h2 style={{ color: msg.color, fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.75rem' }}>
          {msg.title}
        </h2>
        <p style={{ color: 'var(--text-2)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          {msg.body}
        </p>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: '0.65rem', color: '#f87171',
            fontSize: '0.85rem', marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            className="btn-primary"
            onClick={() => navigate('/plans')}
            style={{ width: '100%', fontSize: '1rem', padding: '0.85rem' }}
          >
            Ver Planos e Assinar
          </button>
          <button
            onClick={handleDowngrade}
            disabled={loading}
            style={{
              width: '100%', padding: '0.75rem',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text-2)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Aguarde...' : 'Continuar no Plano Gratuito (limitado)'}
          </button>
        </div>

        <p style={{ color: 'var(--text-2)', fontSize: '0.75rem', marginTop: '1.25rem', opacity: 0.6 }}>
          Plano gratuito: 1 rota/dia, até 50 paradas
        </p>
      </div>
    </div>
  )
}

export { getBlockReason }
export default PaymentWallModal
