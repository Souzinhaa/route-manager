import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { routeService } from '../services/api'

function Results({ user }) {
  const [route, setRoute] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const saved = localStorage.getItem('lastRoute')
    if (saved) {
      setRoute(JSON.parse(saved))
    }
    setLoading(false)
  }, [])

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>
  }

  if (!route) {
    return (
      <div className="main">
        <h2>No Route Found</h2>
        <p>Please create a route first.</p>
        <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    )
  }

  return (
    <div className="main">
      <h2>Optimized Route</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Details */}
        <div>
          <h3>Route Details</h3>
          <div className="card">
            <p><strong>Total Distance:</strong> {route.total_distance_km?.toFixed(2)} km</p>
            <p><strong>Estimated Duration:</strong> {route.total_duration_minutes?.toFixed(0)} minutes</p>
            <p><strong>Cost Estimate:</strong> R$ {route.cost_estimate?.toFixed(2)}</p>
            <p><strong>Waypoints:</strong> {route.optimized_waypoints?.length || 0}</p>
          </div>

          <h3 style={{ marginTop: '30px' }}>Optimized Sequence</h3>
          {route.optimized_waypoints && route.optimized_waypoints.length > 0 ? (
            <ol style={{ lineHeight: '1.8' }}>
              {route.optimized_waypoints.map((wp, i) => (
                <li key={i}>{wp.address}</li>
              ))}
            </ol>
          ) : (
            <p>No waypoints</p>
          )}
        </div>

        {/* Map & Actions */}
        <div>
          <h3>Google Maps</h3>
          {route.google_maps_url ? (
            <div style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              <p style={{ marginBottom: '10px' }}>
                Click the button to open full route in Google Maps
              </p>
              <a
                href={route.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  background: '#dc3545',
                  color: 'white',
                  padding: '10px 20px',
                  textDecoration: 'none',
                  borderRadius: '4px'
                }}
              >
                Open in Google Maps
              </a>
            </div>
          ) : (
            <p style={{ color: '#999' }}>Maps URL not available</p>
          )}

          <h3 style={{ marginTop: '30px' }}>Actions</h3>
          <button onClick={() => {
            const text = `Route Summary:
Distance: ${route.total_distance_km?.toFixed(2)} km
Duration: ${route.total_duration_minutes?.toFixed(0)} min
Cost: R$ ${route.cost_estimate?.toFixed(2)}

Waypoints:
${route.optimized_waypoints?.map((w, i) => `${i + 1}. ${w.address}`).join('\n')}`
            navigator.clipboard.writeText(text)
            alert('Route copied to clipboard!')
          }} style={{ width: '100%', marginBottom: '10px' }}>
            Copy Route Details
          </button>

          <button onClick={() => navigate('/dashboard')} style={{
            width: '100%',
            background: '#28a745'
          }}>
            Create New Route
          </button>
        </div>
      </div>
    </div>
  )
}

export default Results
