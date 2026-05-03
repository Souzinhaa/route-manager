import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import { authService } from './services/api'
import ErrorBoundary from './components/ErrorBoundary'
import PlanBanner from './components/PlanBanner'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Results from './pages/Results'
import Plans from './pages/Plans'
import Admin from './pages/Admin'
import TermosDeUso from './pages/TermosDeUso'
import PoliticaDePrivacidade from './pages/PoliticaDePrivacidade'

const PLAN_LIMITS = {
  tester:     { routes_per_day: 1 },
  basic:      { routes_per_day: 1 },
  starter:    { routes_per_day: 3 },
  delivery:   { routes_per_day: 5 },
  premium:    { routes_per_day: 10 },
  enterprise: { routes_per_day: -1 },
}

function RoutesRemainingBadge({ user }) {
  const plan = user?.plan || 'tester'
  const limit = PLAN_LIMITS[plan]?.routes_per_day ?? 1
  const used = user?.routes_used_today ?? 0

  if (limit === -1) {
    return (
      <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
        rotas: <strong style={{ color: '#34d399' }}>∞</strong>
      </span>
    )
  }

  const remaining = Math.max(0, limit - used)
  const isLow = remaining <= 1
  return (
    <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
      rotas hoje:{' '}
      <strong style={{ color: isLow ? '#f87171' : 'var(--primary-light)' }}>
        {remaining}/{limit}
      </strong>
    </span>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [navOpen, setNavOpen] = useState(false)

  const handleLogout = useCallback(async () => {
    try { await authService.logout() } catch (_) { /* ignore */ }
    setUser(null)
    setNavOpen(false)
  }, [])

  useEffect(() => {
    authService.getCurrentUser()
      .then(res => setUser(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [handleLogout])

  const closeNav = () => setNavOpen(false)

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>
  }

  return (
    <ErrorBoundary>
      <Router>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          {/* ── Header ── */}
          <header className="header">
            <div className="header-inner">
              <Link to={user ? '/dashboard' : '/'} className="header-logo" onClick={closeNav}>
                <span className="header-logo-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="6" cy="6" r="2" fill="white"/>
                    <circle cx="18" cy="18" r="2" fill="white"/>
                    <path d="M6 6 L12 12 L18 18" strokeDasharray="3 2"/>
                  </svg>
                </span>
                <span className="header-logo-text">Roteiri<span>zador</span></span>
              </Link>

              {user ? (
                <>
                  {/* Desktop nav — logged in */}
                  <nav className="header-nav-desktop">
                    <Link to="/dashboard">Painel</Link>
                    <Link to="/upload">Importar NFe</Link>
                    <Link to="/plans">Planos</Link>
                    {user.is_admin && <Link to="/admin" style={{ color: '#f59e0b', fontWeight: 700 }}>Admin</Link>}
                    <span className="header-user-info">
                      {user.full_name}
                      <span style={{ marginLeft: 6, fontSize: '0.7rem', background: user.plan && user.plan !== 'tester' ? 'rgba(37,99,235,0.2)' : 'rgba(16,185,129,0.15)', color: user.plan && user.plan !== 'tester' ? 'var(--primary-light)' : '#34d399', padding: '0.15rem 0.5rem', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase' }}>
                        {user.plan && user.plan !== 'tester' ? user.plan : 'TRIAL'}
                      </span>
                      <RoutesRemainingBadge user={user} />
                    </span>
                    <button className="header-logout-btn" onClick={handleLogout}>Sair</button>
                  </nav>

                  {/* Hamburger — mobile only */}
                  <button
                    className="header-hamburger"
                    onClick={() => setNavOpen(o => !o)}
                    aria-label={navOpen ? 'Fechar menu' : 'Abrir menu'}
                    aria-expanded={navOpen}
                  >
                    {navOpen ? '✕' : '☰'}
                  </button>
                </>
              ) : (
                /* Guest nav */
                <nav className="header-nav-guest">
                  <Link to="/login" className="btn-ghost">Entrar</Link>
                  <Link to="/register" className="btn-cta">Criar Conta</Link>
                </nav>
              )}
            </div>

            {/* Mobile dropdown — logged in only */}
            {user && navOpen && (
              <nav className="header-nav-mobile">
                <Link to="/dashboard" onClick={closeNav}>Painel</Link>
                <Link to="/upload" onClick={closeNav}>Importar NFe</Link>
                <Link to="/plans" onClick={closeNav}>Planos</Link>
                {user.is_admin && <Link to="/admin" onClick={closeNav} style={{ color: '#f59e0b', fontWeight: 700 }}>Admin</Link>}
                <div className="mobile-nav-user">
                  {user.full_name} · <RoutesRemainingBadge user={user} />
                </div>
                <button className="mobile-nav-logout" onClick={handleLogout}>Sair</button>
              </nav>
            )}
          </header>

          {/* ── Plan banner (logged in only) ── */}
          {user && <PlanBanner user={user} />}

          {/* ── Page content ── */}
          <main style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
            <Routes>
              <Route path="/termos-de-uso" element={<TermosDeUso />} />
              <Route path="/politica-de-privacidade" element={<PoliticaDePrivacidade />} />
              <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Home />} />
              <Route path="/login" element={<Login setUser={setUser} />} />
              <Route path="/register" element={<Register setUser={setUser} />} />
              <Route path="/plans" element={<Plans user={user} />} />
              <Route
                path="/admin"
                element={user?.is_admin ? <Admin /> : <Navigate to="/dashboard" />}
              />
              <Route
                path="/dashboard"
                element={user ? <Dashboard user={user} setUser={setUser} /> : <Navigate to="/login" />}
              />
              <Route
                path="/upload"
                element={user ? <Upload user={user} /> : <Navigate to="/login" />}
              />
              <Route
                path="/results"
                element={user ? <Results user={user} /> : <Navigate to="/login" />}
              />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App
