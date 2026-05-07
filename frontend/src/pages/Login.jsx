import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { authService } from '../services/api'
import rmLogo from '../../assets/rm-logo.png'

function Login({ setUser }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const successMessage = location.state?.message || ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await authService.login(email, password)
      setUser(res.data.user)
      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(
        Array.isArray(detail)
          ? detail.map(e => e.msg).join(', ')
          : detail || 'Falha no login. Verifique seus dados.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src={rmLogo} alt="Routerizador" className="auth-logo-icon" />
          <h1 className="auth-title">Bem-vindo de volta</h1>
          <p className="auth-subtitle">Acesse sua conta e otimize suas entregas</p>
        </div>

        {successMessage && (
          <div style={{
            background: 'rgba(22,101,52,0.15)',
            border: '1px solid rgba(22,101,52,0.4)',
            borderRadius: 6,
            padding: '0.75rem 1rem',
            color: 'var(--primary-light)',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}>
            {successMessage}
          </div>
        )}
        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
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
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: 6 }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
            <Link to="/forgot-password" style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
              Esqueceu sua senha?
            </Link>
          </div>
        </form>

        <div className="auth-footer">
          Não tem conta?{' '}
          <Link to="/register">Criar conta gratuita</Link>
        </div>
      </div>
    </div>
  )
}

export default Login
