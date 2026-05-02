import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import { authService, setToken, getToken } from './services/api'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './pages/Home'
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
                <span className="header-logo-icon">🚚</span>
                <span className="header-logo-text">Roteiri<span>zador</span></span>
              </Link>

              {user ? (
                <>
                  {/* Desktop nav — logged in */}
                  <nav className="header-nav-desktop">
                    <Link to="/dashboard">Painel</Link>
                    <Link to="/upload">Importar NFe</Link>
                    <span className="header-user-info">
                      {user.full_name} &middot; <strong>{user.credits.toFixed(0)}</strong> créditos
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
                <div className="mobile-nav-user">
                  {user.full_name} &middot; <strong>{user.credits.toFixed(0)} créditos</strong>
                </div>
                <button className="mobile-nav-logout" onClick={handleLogout}>Sair</button>
              </nav>
            )}
          </header>

          {/* ── Page content ── */}
          <main style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
            <Routes>
              <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Home />} />
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
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App
