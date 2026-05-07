import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authService } from '../services/api'
import rmLogo from '../../assets/rm-logo.png'

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <img src={rmLogo} alt="Routerizador" className="auth-logo-icon" />
            <h1 className="auth-title">Link inválido</h1>
          </div>
          <div className="error">Este link de redefinição é inválido ou expirou.</div>
          <div className="auth-footer">
            <Link to="/forgot-password">Solicitar novo link</Link>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await authService.resetPassword(token, newPassword)
      navigate('/login', { state: { message: 'Senha redefinida com sucesso. Faça login.' } })
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(
        Array.isArray(detail)
          ? detail.map(e => e.msg).join(', ')
          : detail || 'Erro ao redefinir senha. O link pode ter expirado.'
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
          <h1 className="auth-title">Nova senha</h1>
          <p className="auth-subtitle">Escolha uma nova senha para sua conta</p>
        </div>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nova senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label>Confirmar nova senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: 6 }}
          >
            {loading ? 'Salvando...' : 'Redefinir senha'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">Voltar ao login</Link>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
