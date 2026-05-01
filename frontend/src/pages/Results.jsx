import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const VEHICLE_LABEL = { moto: '🏍️ Moto', leve: '🚗 Veículo Leve', pesado: '🚛 Veículo Pesado' }
const PRIORITY_COLORS = {
  0: { bg: '#F1F5F9', color: '#64748B' },
  1: { bg: '#DCFCE7', color: '#15803D' },
  2: { bg: '#FEF9C3', color: '#A16207' },
  3: { bg: '#FEE2E2', color: '#B91C1C' },
}

function formatDuration(min) {
  if (!min) return 'N/A'
  if (min < 60) return `${Math.round(min)} min`
  return `${Math.floor(min / 60)}h ${Math.round(min % 60)}min`
}

function fmt(val) {
  return val != null ? `R$ ${parseFloat(val).toFixed(2)}` : '—'
}

function Results() {
  const [route, setRoute] = useState(null)
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const saved = localStorage.getItem('lastRoute')
    if (saved) setRoute(JSON.parse(saved))
  }, [])

  if (!route) {
    return (
      <div className="main container">
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🗺️</div>
          <h2 style={{ marginBottom: 8, color: 'var(--gray-700)' }}>Nenhuma rota encontrada</h2>
          <p style={{ color: 'var(--gray-400)', marginBottom: 20 }}>Crie uma rota primeiro.</p>
          <button className="btn-primary"
            style={{ width: 'auto', margin: '0 auto', display: 'block' }}
            onClick={() => navigate('/dashboard')}>
            Ir para o Painel
          </button>
        </div>
      </div>
    )
  }

  const dist = route.total_distance_km || 0
  const fuelLiters = (route.fuelPrice && route.fuelConsumption && route.fuelConsumption > 0)
    ? dist / route.fuelConsumption
    : null
  const fuelTotal = fuelLiters ? fuelLiters * route.fuelPrice : null
  const tollTotal = route.tollCost || null
  const grandTotal = (fuelTotal != null || tollTotal != null)
    ? (fuelTotal || 0) + (tollTotal || 0)
    : null

  const handleCopy = () => {
    const text = `Rota Otimizada — ${VEHICLE_LABEL[route.vehicleType] || ''}
Distância: ${dist.toFixed(2)} km
Duração: ${formatDuration(route.total_duration_minutes)}
${fuelTotal != null ? `Combustível: R$ ${fuelTotal.toFixed(2)} (${fuelLiters.toFixed(2)} L)` : ''}
${tollTotal != null ? `Pedágios: R$ ${tollTotal.toFixed(2)}` : ''}
${grandTotal != null ? `Total: R$ ${grandTotal.toFixed(2)}` : ''}

Paradas:
${route.optimized_waypoints?.map((w, i) => `${i + 1}. ${w.address}`).join('\n')}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="main container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div className="page-title">Rota Otimizada</div>
          {route.vehicleType && (
            <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
              {VEHICLE_LABEL[route.vehicleType] || route.vehicleType}
            </span>
          )}
        </div>
        <button className="btn-secondary" onClick={() => navigate('/dashboard')}>← Nova Rota</button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{dist.toFixed(1)}</div>
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
      </div>

      <div className="grid-2">
        {/* Stops */}
        <div className="card">
          <div className="card-title">📍 Sequência Otimizada</div>
          {route.optimized_waypoints?.length > 0 ? (
            <ol className="ordered-stops">
              {route.optimized_waypoints.map((wp, i) => {
                const p = wp.priority || 0
                const pConf = PRIORITY_COLORS[p]
                return (
                  <li key={i} className="stop-item">
                    <span className="stop-num">{i + 1}</span>
                    <span style={{ flex: 1 }}>{wp.address}</span>
                    {p > 0 && (
                      <span style={{
                        background: pConf.bg, color: pConf.color,
                        fontSize: '0.7rem', fontWeight: 700,
                        padding: '2px 7px', borderRadius: 20,
                      }}>P{p}</span>
                    )}
                  </li>
                )
              })}
            </ol>
          ) : (
            <p style={{ color: 'var(--gray-400)' }}>Sem paradas</p>
          )}
        </div>

        {/* Costs + Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Cost breakdown */}
          {(fuelTotal != null || tollTotal != null) && (
            <div className="card">
              <div className="card-title">💰 Custos da Rota</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <tbody>
                  {fuelTotal != null && (
                    <>
                      <tr>
                        <td style={{ padding: '6px 0', color: 'var(--gray-600)' }}>⛽ Combustível</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(fuelTotal)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '3px 0 6px', color: 'var(--gray-400)', fontSize: '0.8rem' }}>
                          {fuelLiters.toFixed(2)} L × R$ {parseFloat(route.fuelPrice).toFixed(2)}/L
                          · {dist.toFixed(1)} km ÷ {route.fuelConsumption} km/L
                        </td>
                        <td />
                      </tr>
                    </>
                  )}
                  {tollTotal != null && (
                    <tr>
                      <td style={{ padding: '6px 0', color: 'var(--gray-600)' }}>🛣️ Pedágios</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(tollTotal)}</td>
                    </tr>
                  )}
                  {grandTotal != null && (
                    <tr style={{ borderTop: '2px solid var(--gray-200)' }}>
                      <td style={{ padding: '10px 0 4px', fontWeight: 700, color: 'var(--gray-800)' }}>
                        Total
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)', padding: '10px 0 4px' }}>
                        {fmt(grandTotal)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="card">
            <div className="card-title">🗺️ Google Maps</div>
            {route.google_maps_url ? (
              <a className="maps-btn" href={route.google_maps_url} target="_blank" rel="noopener noreferrer">
                🗺️ Abrir rota completa no Maps
              </a>
            ) : (
              <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem', marginBottom: 12 }}>URL indisponível</p>
            )}
            <button className="btn-secondary" style={{ width: '100%', marginBottom: 10 }} onClick={handleCopy}>
              {copied ? '✅ Copiado!' : '📋 Copiar resumo'}
            </button>
            <button className="btn-primary" onClick={() => navigate('/dashboard')}>
              + Criar nova rota
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Results
