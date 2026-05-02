import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '../services/api'

function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await authService.register(email, password, fullName)
      navigate('/login')
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
          <p className="auth-subtitle">Otimize sua primeira rota em menos de 1 minuto</p>
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

        <div className="auth-footer">
          Já tem conta?{' '}
          <Link to="/login">Fazer login</Link>
        </div>
      </div>
    </div>
  )
}

export default Register
