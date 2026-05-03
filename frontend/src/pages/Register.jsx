import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { authService, setToken } from '../services/api'

function Register({ setUser }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const targetPlan = params.get('plan')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await authService.register(email, password, fullName)
      // Auto-login após registrar para salvar token e user no App state
      const loginRes = await authService.login(email, password)
      setToken(loginRes.data.access_token)
      setUser(loginRes.data.user)
      navigate('/plans?welcome=1')
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(
        Array.isArray(detail)
          ? detail.map(e => e.msg).join(', ')
          : detail || 'Falha no cadastro. Tente novamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="2.5" fill="white" stroke="none"/>
              <circle cx="18" cy="18" r="2.5" fill="white" stroke="none"/>
              <path d="M6 6 Q 6 14, 12 12 T 18 18" />
            </svg>
          </div>
          <h1 className="auth-title">Criar conta grátis</h1>
          <p className="auth-subtitle">
            {targetPlan
              ? `Crie sua conta para assinar o plano ${targetPlan}`
              : '3 dias grátis · Sem cartão de crédito'}
          </p>
        </div>

        {/* Trial highlight */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.1), rgba(16,185,129,0.08))',
          border: '1px solid rgba(37,99,235,0.2)',
          borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '1.1rem' }}>🎁</span>
          <div>
            <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>
              Trial gratuito por 3 dias
            </div>
            <div style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>
              1 rota/dia · 50 paradas · Acesso total à plataforma
            </div>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome completo</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Seu nome"
              required
              autoComplete="name"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: 6 }}
          >
            {loading ? 'Criando conta...' : 'Criar conta gratuita'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/plans" style={{ color: 'var(--text-2)', fontSize: '0.82rem', textDecoration: 'none' }}>
            Ver todos os planos →
          </Link>
        </div>

        <div className="auth-footer">
          Já tem conta?{' '}
          <Link to="/login">Fazer login</Link>
        </div>
      </div>
    </div>
  )
}

export default Register
