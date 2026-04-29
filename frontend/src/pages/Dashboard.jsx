import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { routeService } from '../services/api'

function Dashboard({ user }) {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(false)
  const [routeName, setRouteName] = useState('')
  const [optimizationType, setOptimizationType] = useState('tsp')
  const [startAddress, setStartAddress] = useState('')
  const [endAddress, setEndAddress] = useState('')
  const [waypoints, setWaypoints] = useState([])
  const [currentWaypoint, setCurrentWaypoint] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadRoutes()
  }, [])

  const loadRoutes = async () => {
    try {
      const res = await routeService.getHistory()
      setRoutes(res.data)
    } catch (err) {
      setError('Failed to load routes')
    }
  }

  const addWaypoint = () => {
    if (currentWaypoint.trim()) {
      setWaypoints([...waypoints, { address: currentWaypoint }])
      setCurrentWaypoint('')
    }
  }

  const removeWaypoint = (index) => {
    setWaypoints(waypoints.filter((_, i) => i !== index))
  }

  const handleOptimize = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await routeService.optimizeRoute(
        optimizationType,
        startAddress,
        endAddress,
        waypoints
      )

      localStorage.setItem('lastRoute', JSON.stringify(res.data))
      setSuccess('Route optimized! Redirecting to results...')
      setTimeout(() => navigate('/results'), 1500)
    } catch (err) {
      setError(err.response?.data?.detail || 'Optimization failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="main">
      <h2>Route Optimization Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Form */}
        <div>
          <h3>Create New Route</h3>
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <form onSubmit={handleOptimize}>
            <div className="form-group">
              <label>Route Name</label>
              <input
                type="text"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="e.g., Delivery Route - SP"
                required
              />
            </div>

            <div className="form-group">
              <label>Optimization Type</label>
              <select
                value={optimizationType}
                onChange={(e) => setOptimizationType(e.target.value)}
              >
                <option value="tsp">TSP (Shortest Path)</option>
                <option value="vrp">VRP (Vehicle Routing)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Start Address</label>
              <input
                type="text"
                value={startAddress}
                onChange={(e) => setStartAddress(e.target.value)}
                placeholder="Rua da Saída, 123, São Paulo, SP"
                required
              />
            </div>

            <div className="form-group">
              <label>End Address</label>
              <input
                type="text"
                value={endAddress}
                onChange={(e) => setEndAddress(e.target.value)}
                placeholder="Rua de Chegada, 456, São Paulo, SP"
                required
              />
            </div>

            <div className="form-group">
              <label>Waypoints (Destinations)</label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="text"
                  value={currentWaypoint}
                  onChange={(e) => setCurrentWaypoint(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addWaypoint())}
                  placeholder="Add address..."
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={addWaypoint} style={{ width: 'auto' }}>
                  Add
                </button>
              </div>

              {waypoints.length > 0 && (
                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '10px',
                  marginBottom: '10px',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {waypoints.map((wp, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px',
                      borderBottom: '1px solid #eee'
                    }}>
                      <span>{wp.address}</span>
                      <button
                        type="button"
                        onClick={() => removeWaypoint(i)}
                        style={{
                          width: 'auto',
                          background: '#dc3545',
                          padding: '4px 8px'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" disabled={loading || waypoints.length === 0}>
              {loading ? 'Optimizing...' : 'Optimize Route'}
            </button>
          </form>
        </div>

        {/* History */}
        <div>
          <h3>Recent Routes</h3>
          {routes.length === 0 ? (
            <p style={{ color: '#999' }}>No routes yet</p>
          ) : (
            <ul className="route-list">
              {routes.slice(0, 10).map((route) => (
                <li key={route.id} className="route-item">
                  <h4>{route.name}</h4>
                  <p><strong>Type:</strong> {route.optimization_type.toUpperCase()}</p>
                  <p><strong>From:</strong> {route.start_address}</p>
                  <p><strong>To:</strong> {route.end_address}</p>
                  <p><strong>Distance:</strong> {route.total_distance_km?.toFixed(2) || 'N/A'} km</p>
                  {route.google_maps_url && (
                    <a href={route.google_maps_url} target="_blank" rel="noopener noreferrer">
                      View on Google Maps
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
