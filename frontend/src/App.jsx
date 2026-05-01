import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import { authService, setToken, getToken } from './services/api'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Results from './pages/Results'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [navOpen, setNavOpen] = useState(false)

  const handleLogout = useCallback(async () => {
    try { await authService.logout() } catch (_) { /* ignore */ }
    setToken(null)
    setUser(null)
    setNavOpen(false)
  }, [])

  useEffect(() => {
    if (!getToken()) { setLoading(false); return }
    authService.getCurrentUser()
      .then(res => setUser(res.data))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  // 401 interceptor in api.js fires this event when any request gets unauthorized
  useEffect(() => {
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [handleLogout])

  // Close nav on route change (clicking a link)
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
              {/* Logo */}
              <Link to={user ? '/dashboard' : '/login'} className="header-logo" onClick={closeNav}>
                <span className="header-logo-icon">🚚</span>
                <span className="header-logo-text">Roteirizador</span>
              </Link>

              {/* Hamburger — mobile only, shown only when user is logged in */}
              {user && (
                <button
                  className="header-hamburger"
                  onClick={() => setNavOpen(o => !o)}
                  aria-label={navOpen ? 'Fechar menu' : 'Abrir menu'}
                  aria-expanded={navOpen}
                >
                  {navOpen ? '✕' : '☰'}
                </button>
              )}
            </div>

            {/* Nav — toggled on mobile, always visible on desktop */}
            {user && (
              <nav className={`header-nav${navOpen ? ' nav-open' : ''}`}>
                <Link to="/dashboard" onClick={closeNav}>Painel</Link>
                <Link to="/upload" onClick={closeNav}>Importar NFe</Link>
                <span className="header-nav-user">
                  {user.full_name} &middot; <strong>{user.credits.toFixed(0)} créditos</strong>
                </span>
                <button className="header-nav-logout" onClick={handleLogout}>
                  Sair
                </button>
              </nav>
            )}
          </header>

          {/* ── Page content ── */}
          <main style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
            <div className="container">
              <Routes>
                <Route path="/login" element={<Login setUser={setUser} />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/dashboard"
                  element={user ? <Dashboard user={user} /> : <Navigate to="/login" />}
                />
                <Route
                  path="/upload"
                  element={user ? <Upload user={user} /> : <Navigate to="/login" />}
                />
                <Route
                  path="/results"
                  element={user ? <Results user={user} /> : <Navigate to="/login" />}
                />
                <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
              </Routes>
            </div>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App
