import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

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

function fmt(val) {
  return val != null ? `R$ ${parseFloat(val).toFixed(2)}` : '—'
}

// Estimate toll cost: ~1 praça per 50km
// moto: R$2.50/praça, leve: R$5.00/praça, pesado: R$5.00 × ceil(eixos/2)/praça
function estimateToll(distKm, vehicleType, axleCount) {
  const plazas = Math.floor(distKm / 50)
  if (plazas === 0) return 0
  if (vehicleType === 'moto') return plazas * 2.50
  if (vehicleType === 'pesado') return plazas * 5.00 * Math.ceil((axleCount || 2) / 2)
  return plazas * 5.00
}

function Results() {
  const [route, setRoute] = useState(null)
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const saved = localStorage.getItem('lastRoute')
    if (saved) {
      try { setRoute(JSON.parse(saved)) } catch (_) {}
    }
  }, [])

  if (!route) {
    return (
      <div className="main">
        <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗺️</div>
          <h2 style={{ marginBottom: 8, color: 'var(--gray-700)', fontSize: '1.15rem' }}>
            Nenhuma rota encontrada
          </h2>
          <p style={{ color: 'var(--gray-400)', marginBottom: 20, fontSize: '0.875rem' }}>
            Crie uma rota primeiro.
          </p>
          <button
            className="btn-primary"
            style={{ width: 'auto', margin: '0 auto', display: 'block', padding: '10px 24px' }}
            onClick={() => navigate('/dashboard')}
          >
            Ir para o Painel
          </button>
        </div>
        </div>
      </div>
    )
  }

  const dist = route.total_distance_km || 0
  const fuelLiters =
    route.fuelPrice && route.fuelConsumption && route.fuelConsumption > 0
      ? dist / route.fuelConsumption
      : null
  const fuelTotal  = fuelLiters ? fuelLiters * route.fuelPrice : null
  const tollRaw    = dist > 0 ? estimateToll(dist, route.vehicleType, route.axleCount) : 0
  const tollTotal  = tollRaw > 0 ? tollRaw : null
  const grandTotal =
    fuelTotal != null || tollTotal != null
      ? (fuelTotal || 0) + (tollTotal || 0)
      : null

  const handleCopy = () => {
    const text = `Rota Otimizada — ${VEHICLE_LABEL[route.vehicleType] || ''}
Distância: ${dist.toFixed(2)} km
Duração: ${formatDuration(route.total_duration_minutes)}
${fuelTotal != null ? `Combustível: R$ ${fuelTotal.toFixed(2)} (${fuelLiters.toFixed(2)} L)` : ''}
${tollTotal != null ? `Pedágios (est.): R$ ${tollTotal.toFixed(2)}` : ''}
${grandTotal != null ? `Total: R$ ${grandTotal.toFixed(2)}` : ''}

Paradas:
${route.optimized_waypoints?.map((w, i) => `${i + 1}. ${w.address}`).join('\n')}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="main">
      <div className="container">
      {/* Page header row */}
      <div className="results-header">
        <div style={{ minWidth: 0 }}>
          <div className="page-title">Rota Otimizada</div>
          {route.vehicleType && (
            <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
              {VEHICLE_LABEL[route.vehicleType] || route.vehicleType}
            </span>
          )}
        </div>
        <button
          className="btn-secondary"
          onClick={() => navigate('/dashboard')}
          style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          Nova Rota
        </button>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
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

      {/* Main two-column grid */}
      <div className="grid-2">
        {/* Optimized stops */}
        <div className="card">
          <div className="card-title">Sequência Otimizada</div>
          {route.optimized_waypoints?.length > 0 ? (
            <ol className="ordered-stops">
              {route.optimized_waypoints.map((wp, i) => {
                const p = wp.priority || 0
                return (
                  <li key={i} className="stop-item">
                    <span className="stop-num">{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                      {wp.address}
                    </span>
                    {p > 0 && (
                      <span
                        className="priority-pill"
                        style={{ background: 'rgba(37,99,235,.2)', color: 'var(--primary-light)' }}
                      >
                        #{p}
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>
          ) : (
            <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>Sem paradas</p>
          )}
        </div>

        {/* Costs + Actions column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

          {/* Cost breakdown */}
          {(fuelTotal != null || tollTotal != null) && (
            <div className="card">
              <div className="card-title">Custos da Rota</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <tbody>
                  {fuelTotal != null && (
                    <>
                      <tr>
                        <td style={{ padding: '6px 0', color: 'var(--gray-600)' }}>Combustível</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {fmt(fuelTotal)}
                        </td>
                      </tr>
                      <tr>
                        <td
                          colSpan={2}
                          style={{ padding: '0 0 8px', color: 'var(--gray-400)', fontSize: '0.78rem',
                            overflowWrap: 'break-word', wordBreak: 'break-word' }}
                        >
                          {fuelLiters.toFixed(2)} L × R$ {parseFloat(route.fuelPrice).toFixed(2)}/L
                          &nbsp;·&nbsp; {dist.toFixed(1)} km ÷ {route.fuelConsumption} km/L
                        </td>
                      </tr>
                    </>
                  )}
                  {tollTotal != null && (
                    <>
                      <tr>
                        <td style={{ padding: '6px 0', color: 'var(--gray-600)' }}>Pedágios (est.)</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {fmt(tollTotal)}
                        </td>
                      </tr>
                      <tr>
                        <td
                          colSpan={2}
                          style={{ padding: '0 0 8px', color: 'var(--gray-400)', fontSize: '0.78rem' }}
                        >
                          ~1 praça a cada 50 km
                          {route.vehicleType === 'pesado' && route.axleCount
                            ? ` · ${route.axleCount} eixos`
                            : ''}
                        </td>
                      </tr>
                    </>
                  )}
                  {grandTotal != null && (
                    <tr style={{ borderTop: '2px solid var(--gray-200)' }}>
                      <td style={{ padding: '10px 0 4px', fontWeight: 700, color: 'var(--gray-800)' }}>
                        Total
                      </td>
                      <td style={{
                        textAlign: 'right', fontWeight: 700, fontSize: '1.05rem',
                        color: 'var(--primary-light)', padding: '10px 0 4px', whiteSpace: 'nowrap',
                      }}>
                        {fmt(grandTotal)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Maps + actions */}
          <div className="card">
            <div className="card-title">Google Maps</div>
            {route.google_maps_url ? (
              <a
                className="maps-btn"
                href={route.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir rota completa no Maps
              </a>
            ) : (
              <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem', marginBottom: 12 }}>
                URL indisponível
              </p>
            )}
            <button
              className="btn-secondary"
              style={{ width: '100%', marginBottom: 10 }}
              onClick={handleCopy}
            >
              {copied ? 'Copiado!' : 'Copiar resumo'}
            </button>
            <button className="btn-primary" onClick={() => navigate('/dashboard')}>
              + Criar nova rota
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

export default Results
