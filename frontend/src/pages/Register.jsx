import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { authService, setToken } from '../services/api'

function Register({ setUser }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [lgpdConsent, setLgpdConsent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '', cpfCnpj: '' })
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const targetPlan = params.get('plan')
  const targetCoupon = params.get('coupon')

  const formatCpfCnpj = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 14)
    if (d.length <= 11) {
      return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }
    return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2')
  }

  const validateCpf = (digits) => {
    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false
    let sum = 0
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i)
    let r = (sum * 10) % 11
    if (r === 10 || r === 11) r = 0
    if (r !== parseInt(digits[9])) return false
    sum = 0
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i)
    r = (sum * 10) % 11
    if (r === 10 || r === 11) r = 0
    return r === parseInt(digits[10])
  }

  const emailError = (e) => !e ? 'Email obrigatório' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? 'Email inválido' : ''
  const passwordError = (p) => !p ? 'Senha obrigatória' : p.length < 8 ? 'Mínimo 8 caracteres' : ''
  const cpfError = (c) => {
    const d = c.replace(/\D/g, '')
    return !d ? 'CPF/CNPJ obrigatório' : d.length === 11 && !validateCpf(d) ? 'CPF inválido' : d.length !== 11 && d.length !== 14 ? 'CPF: 11 dígitos ou CNPJ: 14 dígitos' : ''
  }

  const validateEmail = (e) => setFieldErrors(prev => ({ ...prev, email: emailError(e) }))
  const validatePassword = (p) => setFieldErrors(prev => ({ ...prev, password: passwordError(p) }))
  const validateCpfCnpjField = (c) => setFieldErrors(prev => ({ ...prev, cpfCnpj: cpfError(c) }))

  const isFormValid = !fieldErrors.email && !fieldErrors.password && !fieldErrors.cpfCnpj && email && password && cpfCnpj && lgpdConsent

  const handleSubmit = async (e) => {
    e.preventDefault()
    const eErr = emailError(email)
    const pErr = passwordError(password)
    const cErr = cpfError(cpfCnpj)
    setFieldErrors({ email: eErr, password: pErr, cpfCnpj: cErr })
    if (eErr || pErr || cErr || !lgpdConsent) return

    setLoading(true)
    setError('')
    const digits = cpfCnpj.replace(/\D/g, '')
    try {
      await authService.register(email, password, fullName, digits, true)
      const loginRes = await authService.login(email, password)
      setToken(loginRes.data.access_token)
      setUser(loginRes.data.user)
      if (targetCoupon) localStorage.setItem('pending_coupon', targetCoupon)
      const couponParam = targetCoupon ? `&coupon=${encodeURIComponent(targetCoupon)}` : ''
      navigate(`/plans?welcome=1${couponParam}`)
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
          <span style={{ display: 'inline-flex', color: '#34d399' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
            </svg>
          </span>
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
              onChange={e => { setEmail(e.target.value); validateEmail(e.target.value) }}
              onBlur={() => validateEmail(email)}
              placeholder="voce@empresa.com"
              required
              autoComplete="email"
              style={{ borderColor: fieldErrors.email ? '#f87171' : 'var(--border)' }}
            />
            {fieldErrors.email && <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: 4 }}>{fieldErrors.email}</div>}
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); validatePassword(e.target.value) }}
              onBlur={() => validatePassword(password)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              style={{ borderColor: fieldErrors.password ? '#f87171' : 'var(--border)' }}
            />
            {fieldErrors.password && <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: 4 }}>{fieldErrors.password}</div>}
          </div>
          <div className="form-group">
            <label>CPF ou CNPJ</label>
            <input
              type="text"
              value={cpfCnpj}
              onChange={e => { const formatted = formatCpfCnpj(e.target.value); setCpfCnpj(formatted); validateCpfCnpjField(formatted) }}
              onBlur={() => validateCpfCnpjField(cpfCnpj)}
              placeholder="000.000.000-00"
              required
              autoComplete="off"
              inputMode="numeric"
              style={{ borderColor: fieldErrors.cpfCnpj ? '#f87171' : 'var(--border)' }}
            />
            {fieldErrors.cpfCnpj && <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: 4 }}>{fieldErrors.cpfCnpj}</div>}
          </div>
          <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={lgpdConsent}
                onChange={e => setLgpdConsent(e.target.checked)}
                style={{ marginTop: 3, flexShrink: 0, accentColor: 'var(--primary)', width: 16, height: 16 }}
              />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                Li e aceito os{' '}
                <a href="/termos-de-uso" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-light)' }}>
                  Termos de Uso
                </a>
                {' '}e a{' '}
                <a href="/politica-de-privacidade" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-light)' }}>
                  Política de Privacidade
                </a>
                , incluindo o tratamento dos meus dados pessoais conforme a LGPD (Lei nº 13.709/2018).
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !isFormValid}
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
