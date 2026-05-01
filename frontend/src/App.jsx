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

  const handleLogout = useCallback(async () => {
    try { await authService.logout() } catch (_) { /* ignore */ }
    setToken(null)
    setUser(null)
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

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>
  }

  return (
    <ErrorBoundary>
      <Router>
        <div>
          <header className="header">
            <div className="container">
              <h1>🚚 Roteirizador</h1>
              {user && (
                <nav>
                  <Link to="/dashboard">Painel</Link>
                  <Link to="/upload">Importar NFe</Link>
                  <span className="header-user">
                    {user.full_name} · <strong>{user.credits.toFixed(0)} créditos</strong>
                  </span>
                  <button onClick={handleLogout} style={{
                    background: 'rgba(220,38,38,.85)',
                    padding: '8px 16px',
                  }}>
                    Sair
                  </button>
                </nav>
              )}
            </div>
          </header>

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
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App
