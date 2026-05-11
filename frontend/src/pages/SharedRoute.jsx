import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

const VEHICLE_LABEL = {
  moto:   '🏍️ Moto',
  leve:   '🚗 Veículo Leve',
  pesado: '🚛 Veículo Pesado',
}

function formatDuration(min) {
  if (!min) return 'N/A'
  if (min < 60) return `${Math.round(min)} min`
  return `${Math.floor(min / 60)}h ${Math.round(min % 60)}min`
}

function SharedRoute() {
  const { shareToken } = useParams()
  const [route, setRoute] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        setLoading(true)
        const API_URL = import.meta.env.VITE_API_URL || ''
        const res = await axios.get(`${API_URL}/api/public/routes/${shareToken}`)
        setRoute(res.data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Rota não encontrada')
      } finally {
        setLoading(false)
      }
    }
    fetchRoute()
  }, [shareToken])

  if (loading) {
    return (
      <div className="main">
        <div className="container">
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗺️</div>
            <p style={{ color: 'var(--gray-400)' }}>Carregando rota...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="main">
        <div className="container">
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>❌</div>
            <h2 style={{ marginBottom: 8, color: 'var(--error)', fontSize: '1.15rem' }}>
              Rota não encontrada
            </h2>
            <p style={{ color: 'var(--gray-400)', marginBottom: 20, fontSize: '0.875rem' }}>
              {error}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!route) {
    return null
  }

  return (
    <div className="main">
      <div className="container">
        <div className="results-header">
          <div style={{ minWidth: 0 }}>
            <div className="page-title">Rota Compartilhada</div>
            <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
              Criada em {new Date(route.created_at).toLocaleDateString('pt-BR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{route.total_distance_km?.toFixed(1)}</div>
            <div className="stat-label">km total</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatDuration(route.total_duration_minutes)}</div>
            <div className="stat-label">Tempo estimado</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{route.optimized_waypoints?.length || 0}</div>
            <div className="stat-label">Paradas</div>
          </div>
          {route.cost_estimate && (
            <div className="stat-card">
              <div className="stat-value">R$ {route.cost_estimate?.toFixed(2)}</div>
              <div className="stat-label">Custo estimado</div>
            </div>
          )}
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-title">Sequência Otimizada</div>
            {route.optimized_waypoints?.length > 0 ? (
              <ol className="ordered-stops">
                {route.optimized_waypoints.map((wp, i) => (
                  <li key={i} className="stop-item">
                    <span className="stop-num">{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                      {wp.address}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>Sem paradas</p>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <div className="card">
              <div className="card-title">Detalhes da Rota</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px 0', color: 'var(--gray-600)' }}>Origem</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-1)', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                      {route.start_address}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 0', color: 'var(--gray-600)' }}>Destino</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-1)', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                      {route.end_address}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 0', color: 'var(--gray-600)' }}>Tipo de otimização</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-1)', textTransform: 'uppercase' }}>
                      {route.optimization_type}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {route.google_maps_url && (
              <div className="card">
                <div className="card-title">Google Maps</div>
                <a
                  className="maps-btn"
                  href={route.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir rota completa no Maps
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SharedRoute
