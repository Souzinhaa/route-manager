import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService, setToken } from '../services/api'

function Login({ setUser }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await authService.login(email, password)
      setToken(res.data.access_token)
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
          <div className="auth-logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="2.5" fill="white" stroke="none"/>
              <circle cx="18" cy="18" r="2.5" fill="white" stroke="none"/>
              <path d="M6 6 Q 6 14, 12 12 T 18 18" />
            </svg>
          </div>
          <h1 className="auth-title">Bem-vindo de volta</h1>
          <p className="auth-subtitle">Acesse sua conta e otimize suas entregas</p>
        </div>

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
