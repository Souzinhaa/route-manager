import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { routeService } from '../services/api'
import CepInput, { fetchCep, formatCep } from '../components/CepInput'

const VEHICLES = [
  { id: 'moto', icon: '🏍️', label: 'Moto' },
  { id: 'leve', icon: '🚗', label: 'Veículo Leve' },
  { id: 'pesado', icon: '🚛', label: 'Veículo Pesado' },
]

const VEHICLE_EMOJI = { moto: '🏍️', leve: '🚗', pesado: '🚛' }

function Dashboard({ user }) {
  const [routes, setRoutes] = useState([])
  const [vehicleType, setVehicleType] = useState('leve')
  const [startAddress, setStartAddress] = useState('')
  const [endAddress, setEndAddress] = useState('')
  const [waypoints, setWaypoints] = useState([])
  const [currentWaypoint, setCurrentWaypoint] = useState('')
  const [loading, setLoading] = useState(false)
  const [nfeOpen, setNfeOpen] = useState(false)
  const [nfeFile, setNfeFile] = useState(null)
  const [nfeLoading, setNfeLoading] = useState(false)
  const [nfeCount, setNfeCount] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const nfeInputRef = useRef()
  const navigate = useNavigate()

  useEffect(() => {
    const saved = localStorage.getItem('uploadedWaypoints')
    if (saved) {
      try {
        const wps = JSON.parse(saved)
        setWaypoints(wps.map(w => ({ address: w.address || w })))
        setNfeCount(wps.length)
        localStorage.removeItem('uploadedWaypoints')
      } catch (_) {}
    }
    loadRoutes()
  }, [])

  const loadRoutes = async () => {
    try {
      const res = await routeService.getHistory()
      setRoutes(res.data)
    } catch (_) {}
  }

  const addWaypoint = async () => {
    const val = currentWaypoint.trim()
    if (!val) return
    const digits = val.replace(/\D/g, '')
    let addr = val
    if (digits.length === 8 && /^\d{5}-?\d{3}$/.test(val.trim())) {
      const resolved = await fetchCep(digits)
      if (resolved) addr = resolved
    }
    setWaypoints(prev => [...prev, { address: addr }])
    setCurrentWaypoint('')
  }

  const handleWaypointKeyDown = async (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const val = currentWaypoint.trim()
    const digits = val.replace(/\D/g, '')
    if (digits.length === 8) {
      const resolved = await fetchCep(digits)
      if (resolved) { setCurrentWaypoint(resolved); return }
    }
    addWaypoint()
  }

  const removeWaypoint = (i) => setWaypoints(prev => prev.filter((_, idx) => idx !== i))

  const handleNfeUpload = async () => {
    if (!nfeFile) return
    setNfeLoading(true)
    setError('')
    try {
      const res = await routeService.uploadFile(nfeFile)
      const addresses = res.data.extracted_data?.addresses || []
      const newWps = addresses.map(a => ({ address: a.address || a })).filter(w => w.address)
      setWaypoints(prev => [...prev, ...newWps])
      setNfeCount(prev => prev + newWps.length)
      setNfeFile(null)
      if (nfeInputRef.current) nfeInputRef.current.value = ''
      if (newWps.length === 0) {
        setError('Nenhum endereço encontrado neste arquivo.')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Falha ao processar NFe.')
    } finally {
      setNfeLoading(false)
    }
  }

  const handleOptimize = async (e) => {
    e.preventDefault()
    if (waypoints.length === 0) { setError('Adicione pelo menos uma parada.'); return }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await routeService.optimizeRoute(
        'tsp',
        vehicleType,
        startAddress,
        endAddress,
        waypoints
      )
      localStorage.setItem('lastRoute', JSON.stringify({ ...res.data, vehicleType }))
      setSuccess('Rota otimizada! Redirecionando...')
      setTimeout(() => navigate('/results'), 1200)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(Array.isArray(detail) ? detail.map(e => e.msg).join(', ') : detail || 'Falha na otimização.')
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (min) => {
    if (!min) return 'N/A'
    if (min < 60) return `${Math.round(min)} min`
    return `${Math.floor(min / 60)}h ${Math.round(min % 60)}min`
  }

  return (
    <div className="main container">
      <div className="page-title">Otimizar Rota</div>
      <div className="page-subtitle">Configure as paradas e o tipo de veículo para calcular a melhor rota.</div>

      <div className="grid-2">
        {/* Form */}
        <div className="card">
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          {/* Vehicle type */}
          <div className="form-group">
            <label>Tipo de Veículo</label>
            <div className="vehicle-selector">
              {VEHICLES.map(v => (
                <button
                  key={v.id}
                  type="button"
                  className={`vehicle-btn${vehicleType === v.id ? ' active' : ''}`}
                  onClick={() => setVehicleType(v.id)}
                >
                  <span className="vehicle-icon">{v.icon}</span>
                  <span>{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Addresses */}
          <CepInput
            label="Endereço de Saída"
            value={startAddress}
            onChange={setStartAddress}
            placeholder="Ex: Av. Paulista, 1000, São Paulo, SP"
          />

          <CepInput
            label="Endereço de Chegada"
            value={endAddress}
            onChange={setEndAddress}
            placeholder="Ex: Rua Augusta, 500, São Paulo, SP"
          />

          {/* NFe import */}
          <div className="nfe-section">
            <button
              type="button"
              className={`nfe-toggle${nfeOpen ? ' open' : ''}`}
              onClick={() => setNfeOpen(o => !o)}
            >
              📎 Importar endereços de NFe
              {nfeCount > 0 && (
                <span className="nfe-badge" style={{ marginLeft: 8 }}>
                  {nfeCount} importados
                </span>
              )}
              <span className="chevron">▼</span>
            </button>
            {nfeOpen && (
              <div className="nfe-body">
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: 12 }}>
                  Faça upload de XMLs ou PDFs de NFe. Os endereços serão adicionados às paradas automaticamente.
                </p>
                <div className="nfe-upload-row">
                  <div className="form-group">
                    <input
                      ref={nfeInputRef}
                      type="file"
                      accept=".xml,.pdf,.png,.jpg,.jpeg"
                      onChange={e => setNfeFile(e.target.files[0])}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-success"
                    onClick={handleNfeUpload}
                    disabled={!nfeFile || nfeLoading}
                    style={{ width: 'auto', marginBottom: 16 }}
                  >
                    {nfeLoading ? '...' : 'Extrair'}
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                  Pode importar múltiplos arquivos — os endereços acumulam.
                </p>
              </div>
            )}
          </div>

          {/* Waypoints */}
          <div className="form-group">
            <label>Paradas ({waypoints.length})</label>
            <div className="waypoint-input-row" style={{ marginBottom: 8 }}>
              <input
                type="text"
                value={currentWaypoint}
                onChange={e => setCurrentWaypoint(e.target.value)}
                onKeyDown={handleWaypointKeyDown}
                placeholder="Digite um endereço e pressione Enter"
              />
              <button type="button" className="btn-secondary" onClick={addWaypoint}>
                + Adicionar
              </button>
            </div>
            {waypoints.length > 0 && (
              <div className="waypoints-list" style={{ maxHeight: 240, overflowY: 'auto' }}>
                {waypoints.map((wp, i) => (
                  <div key={i} className="waypoint-item">
                    <span className="waypoint-num">{i + 1}</span>
                    <span className="waypoint-addr">{wp.address}</span>
                    <button type="button" className="btn-danger" onClick={() => removeWaypoint(i)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            className="btn-primary"
            onClick={handleOptimize}
            disabled={loading || !startAddress || !endAddress || waypoints.length === 0}
          >
            {loading ? '⏳ Otimizando...' : '🗺️ Otimizar Rota'}
          </button>
        </div>

        {/* History */}
        <div>
          <div className="card-title" style={{ marginBottom: 16 }}>📋 Rotas Recentes</div>
          {routes.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 40 }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🗺️</div>
              <p>Nenhuma rota ainda.<br />Crie sua primeira rota!</p>
            </div>
          ) : (
            <ul className="route-list">
              {routes.slice(0, 10).map(route => (
                <li key={route.id} className="route-item">
                  <div className="route-item-header">
                    <span className="route-item-name">{route.name || 'Rota sem nome'}</span>
                    <span className="badge">{route.optimization_type.toUpperCase()}</span>
                  </div>
                  <div className="route-item-meta">
                    <span>📍 {route.start_address}</span>
                    {route.total_distance_km && (
                      <span>📏 {route.total_distance_km.toFixed(1)} km</span>
                    )}
                    {route.total_duration_minutes && (
                      <span>⏱ {formatDuration(route.total_duration_minutes)}</span>
                    )}
                    {route.google_maps_url && (
                      <a href={route.google_maps_url} target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                        Ver Maps →
                      </a>
                    )}
                  </div>
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
