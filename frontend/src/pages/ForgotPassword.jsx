import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '../services/api'
import rmLogo from '../../assets/rm-logo.png'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const res = await authService.forgotPassword(email)
      setMessage(res.data.message)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(
        Array.isArray(detail)
          ? detail.map(e => e.msg).join(', ')
          : detail || 'Erro ao enviar. Tente novamente.'
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
          <h1 className="auth-title">Esqueceu sua senha?</h1>
          <p className="auth-subtitle">Informe seu email e enviaremos um link de redefinição</p>
        </div>

        {error && <div className="error">{error}</div>}
        {message && (
          <div style={{
            background: 'rgba(22,101,52,0.15)',
            border: '1px solid rgba(22,101,52,0.4)',
            borderRadius: 6,
            padding: '0.75rem 1rem',
            color: 'var(--primary-light)',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}>
            {message}
          </div>
        )}

        {!message && (
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
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: 6 }}
            >
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          Lembrou a senha?{' '}
          <Link to="/login">Voltar ao login</Link>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
