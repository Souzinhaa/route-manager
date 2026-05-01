import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const VEHICLE_LABEL = { moto: '🏍️ Moto', leve: '🚗 Veículo Leve', pesado: '🚛 Veículo Pesado' }

function formatDuration(min) {
  if (!min) return 'N/A'
  if (min < 60) return `${Math.round(min)} min`
  return `${Math.floor(min / 60)}h ${Math.round(min % 60)}min`
}

function Results() {
  const [route, setRoute] = useState(null)
  const [copied, setCopied] = useState(false)
  const [fuelPrice, setFuelPrice] = useState('')
  const [fuelConsumption, setFuelConsumption] = useState('')
  const navigate = useNavigate()

  const fuelCost = (() => {
    const dist = route?.total_distance_km
    const price = parseFloat(fuelPrice)
    const consumption = parseFloat(fuelConsumption)
    if (!dist || !price || !consumption || consumption <= 0) return null
    const liters = dist / consumption
    return { liters: liters.toFixed(2), total: (liters * price).toFixed(2) }
  })()

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
          <button className="btn-primary" style={{ width: 'auto', margin: '0 auto', display: 'block' }}
            onClick={() => navigate('/dashboard')}>
            Ir para o Painel
          </button>
        </div>
      </div>
    )
  }

  const handleCopy = () => {
    const text = `Rota Otimizada
Distância: ${route.total_distance_km?.toFixed(2)} km
Duração: ${formatDuration(route.total_duration_minutes)}
Custo estimado: R$ ${route.cost_estimate?.toFixed(2)}

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
        <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
          ← Nova Rota
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{route.total_distance_km?.toFixed(1)}</div>
          <div className="stat-label">km total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatDuration(route.total_duration_minutes)}</div>
          <div className="stat-label">Tempo estimado</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">R$ {route.cost_estimate?.toFixed(0)}</div>
          <div className="stat-label">Custo estimado</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Stops */}
        <div className="card">
          <div className="card-title">📍 Sequência Otimizada</div>
          {route.optimized_waypoints?.length > 0 ? (
            <ol className="ordered-stops">
              {route.optimized_waypoints.map((wp, i) => (
                <li key={i} className="stop-item">
                  <span className="stop-num">{i + 1}</span>
                  {wp.address}
                </li>
              ))}
            </ol>
          ) : (
            <p style={{ color: 'var(--gray-400)' }}>Sem paradas</p>
          )}
        </div>

        {/* Actions */}
        <div>
          {/* Fuel calculator */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">⛽ Calculadora de Combustível</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Preço (R$/L)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fuelPrice}
                  onChange={e => setFuelPrice(e.target.value)}
                  placeholder="Ex: 5.89"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Consumo (km/L)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={fuelConsumption}
                  onChange={e => setFuelConsumption(e.target.value)}
                  placeholder="Ex: 12.5"
                />
              </div>
            </div>
            {fuelCost ? (
              <div style={{ background: 'var(--primary-light)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                  {fuelCost.liters} L necessários
                </span>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                  R$ {fuelCost.total}
                </span>
              </div>
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                Preencha os campos acima para calcular o custo do combustível.
              </p>
            )}
          </div>

          <div className="card">
            <div className="card-title">🗺️ Google Maps</div>
            {route.google_maps_url ? (
              <a className="maps-btn" href={route.google_maps_url} target="_blank" rel="noopener noreferrer">
                🗺️ Abrir rota completa no Maps
              </a>
            ) : (
              <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>URL indisponível</p>
            )}

            <button
              className="btn-secondary"
              style={{ width: '100%', marginBottom: 10 }}
              onClick={handleCopy}
            >
              {copied ? '✅ Copiado!' : '📋 Copiar resumo da rota'}
            </button>

            <button
              className="btn-primary"
              onClick={() => navigate('/dashboard')}
            >
              + Criar nova rota
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Results
