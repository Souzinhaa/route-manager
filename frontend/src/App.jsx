import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import { authService } from './services/api'
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
    try { await authService.logout() } catch (_) { /* cookie cleared server-side */ }
    setUser(null)
  }, [])

  useEffect(() => {
    // Token lives in httpOnly cookie — just ask /me; no localStorage needed.
    authService.getCurrentUser()
      .then(res => setUser(res.data))
      .catch(() => { /* not authenticated */ })
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
              <h1>🚚 Route Manager</h1>
              {user && (
                <nav>
                  <Link to="/dashboard">Dashboard</Link>
                  <Link to="/upload">Upload NFE</Link>
                  <span style={{ marginRight: '20px' }}>
                    {user.full_name} (Credits: {user.credits})
                  </span>
                  <button onClick={handleLogout} style={{
                    background: '#dc3545',
                    padding: '8px 16px',
                    marginRight: 0
                  }}>
                    Logout
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
