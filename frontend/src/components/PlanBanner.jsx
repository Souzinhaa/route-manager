import React from 'react'
import { Link } from 'react-router-dom'

function daysLeft(isoDate) {
  if (!isoDate) return null
  const diff = new Date(isoDate) - new Date()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function PlanBanner({ user }) {
  if (!user) return null

  const { plan, plan_status, trial_expires_at } = user

  // Active paid plan — no banner
  if (plan_status === 'active' && plan !== 'tester') return null

  if (plan === 'tester' || plan_status === 'trial') {
    const days = daysLeft(trial_expires_at)

    if (days === null || days > 0) {
      const daysText = days === null ? '' : ` — ${days} dia${days !== 1 ? 's' : ''} restante${days !== 1 ? 's' : ''}`
      return (
        <div style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(16,185,129,0.08))',
          borderBottom: '1px solid rgba(37,99,235,0.2)',
          padding: '0.75rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '0.5rem',
        }}>
          <span style={{ color: 'var(--text-1)', fontSize: '0.9rem' }}>
            <span style={{ color: '#60a5fa', fontWeight: 700 }}>Trial gratuito ativo{daysText}</span>
            {' '}— Assine agora para não perder o acesso.
          </span>
          <Link
            to="/plans"
            style={{
              padding: '0.4rem 1rem', background: 'var(--primary)', color: 'white',
              borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Ver planos →
          </Link>
        </div>
      )
    }

    // Trial expired
    return (
      <div style={{
        background: 'rgba(239,68,68,0.1)', borderBottom: '1px solid rgba(239,68,68,0.25)',
        padding: '0.75rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '0.5rem',
      }}>
        <span style={{ color: '#f87171', fontSize: '0.9rem', fontWeight: 600 }}>
          ⚠️ Trial expirado. Escolha um plano para continuar usando o Roteirizador.
        </span>
        <Link
          to="/plans"
          style={{
            padding: '0.4rem 1rem', background: '#ef4444', color: 'white',
            borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Assinar agora →
        </Link>
      </div>
    )
  }

  if (plan_status === 'pending') {
    return (
      <div style={{
        background: 'rgba(245,158,11,0.1)', borderBottom: '1px solid rgba(245,158,11,0.25)',
        padding: '0.75rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '0.5rem',
      }}>
        <span style={{ color: '#fbbf24', fontSize: '0.9rem', fontWeight: 600 }}>
          ⏳ Pagamento pendente. Complete o pagamento para ativar seu plano.
        </span>
        <Link
          to="/plans"
          style={{
            padding: '0.4rem 1rem', background: '#d97706', color: 'white',
            borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Retomar pagamento →
        </Link>
      </div>
    )
  }

  if (plan_status === 'cancelled') {
    return (
      <div style={{
        background: 'rgba(239,68,68,0.1)', borderBottom: '1px solid rgba(239,68,68,0.25)',
        padding: '0.75rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '0.5rem',
      }}>
        <span style={{ color: '#f87171', fontSize: '0.9rem', fontWeight: 600 }}>
          ❌ Assinatura cancelada. Reative seu plano para continuar.
        </span>
        <Link
          to="/plans"
          style={{
            padding: '0.4rem 1rem', background: '#ef4444', color: 'white',
            borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Reativar plano →
        </Link>
      </div>
    )
  }

  return null
}

export default PlanBanner
