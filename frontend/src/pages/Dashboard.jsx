import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { routeService } from '../services/api'
import { fetchCep } from '../components/CepInput'

const VEHICLES = [
  { id: 'moto', icon: '🏍️', label: 'Moto' },
  { id: 'leve', icon: '🚗', label: 'Veículo Leve' },
  { id: 'pesado', icon: '🚛', label: 'Veículo Pesado' },
]

const PRIORITY_COLORS = {
  0: { bg: '#F1F5F9', color: '#64748B', label: 'P0' },
  1: { bg: '#DCFCE7', color: '#15803D', label: 'P1' },
  2: { bg: '#FEF9C3', color: '#A16207', label: 'P2' },
  3: { bg: '#FEE2E2', color: '#B91C1C', label: 'P3' },
}

async function resolveAddress(val) {
  const digits = val.replace(/\D/g, '')
  if (digits.length === 8) {
    const resolved = await fetchCep(digits)
    if (resolved) return resolved
  }
  return val
}

function AddressField({ label, value, onChange, placeholder }) {
  const [cep, setCep] = useState('')
  const [cepStatus, setCepStatus] = useState(null) // null | 'loading' | 'ok' | 'err'

  const handleCepChange = async (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8)
    const formatted = raw.length > 5 ? `${raw.slice(0,5)}-${raw.slice(5)}` : raw
    setCep(formatted)
    setCepStatus(null)
    if (raw.length === 8) {
      setCepStatus('loading')
      const addr = await fetchCep(raw)
      if (addr) { onChange(addr); setCepStatus('ok') }
      else setCepStatus('err')
    }
  }

  return (
    <div className="form-group">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <input
          type="text"
          value={cep}
          onChange={handleCepChange}
          placeholder="CEP (opcional)"
          style={{ maxWidth: 130 }}
          maxLength={9}
        />
        {cepStatus === 'loading' && <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--gray-400)' }}>🔍</span>}
        {cepStatus === 'ok' && <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--success)' }}>✅</span>}
        {cepStatus === 'err' && <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--danger)' }}>CEP não encontrado</span>}
      </div>
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setCepStatus(null) }}
        placeholder={placeholder || 'Ou digite o endereço completo'}
      />
    </div>
  )
}

function WaypointRow({ wp, index, onChange, onRemove }) {
  const [cep, setCep] = useState('')
  const [cepStatus, setCepStatus] = useState(null)

  const handleCepChange = async (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8)
    const formatted = raw.length > 5 ? `${raw.slice(0,5)}-${raw.slice(5)}` : raw
    setCep(formatted)
    setCepStatus(null)
    if (raw.length === 8) {
      setCepStatus('loading')
      const addr = await fetchCep(raw)
      if (addr) { onChange({ ...wp, address: addr }); setCepStatus('ok') }
      else setCepStatus('err')
    }
  }

  const pConf = PRIORITY_COLORS[wp.priority]

  return (
    <div style={{ border: '1.5px solid var(--gray-200)', borderRadius: 8, padding: '10px 12px', marginBottom: 8, background: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span className="waypoint-num">{index + 1}</span>
        <input
          type="text"
          value={cep}
          onChange={handleCepChange}
          placeholder="CEP"
          style={{ maxWidth: 110, fontSize: '0.8rem', padding: '6px 10px' }}
          maxLength={9}
        />
        {cepStatus === 'loading' && <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>🔍</span>}
        {cepStatus === 'ok' && <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>✅</span>}
        <span
          style={{
            marginLeft: 'auto',
            background: pConf.bg,
            color: pConf.color,
            fontWeight: 700,
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: 20,
          }}
        >
          {pConf.label}
        </span>
        <button type="button" className="btn-danger" onClick={onRemove}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={wp.address}
          onChange={e => onChange({ ...wp, address: e.target.value })}
          placeholder="Endereço completo"
          style={{ flex: 1 }}
        />
        <select
          value={wp.priority}
          onChange={e => onChange({ ...wp, priority: parseInt(e.target.value) })}
          style={{ width: 70, padding: '8px 6px', fontSize: '0.85rem' }}
        >
          <option value={0}>P0</option>
          <option value={1}>P1</option>
          <option value={2}>P2</option>
          <option value={3}>P3</option>
        </select>
      </div>
      {wp.priority > 0 && (
        <p style={{ fontSize: '0.72rem', color: pConf.color, marginTop: 4 }}>
          ⚡ Prioridade {wp.priority} — entregue antes das paradas P0
        </p>
      )}
    </div>
  )
}

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
  const [fuelPrice, setFuelPrice] = useState('')
  const [fuelConsumption, setFuelConsumption] = useState('')
  const [tollCost, setTollCost] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const nfeInputRef = useRef()
  const navigate = useNavigate()

  useEffect(() => {
    const saved = localStorage.getItem('uploadedWaypoints')
    if (saved) {
      try {
        const wps = JSON.parse(saved)
        setWaypoints(wps.map(w => ({ address: w.address || w, priority: 0 })))
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
    const addr = await resolveAddress(val)
    setWaypoints(prev => [...prev, { address: addr, priority: 0 }])
    setCurrentWaypoint('')
  }

  const updateWaypoint = (i, updated) =>
    setWaypoints(prev => prev.map((wp, idx) => idx === i ? updated : wp))

  const removeWaypoint = (i) =>
    setWaypoints(prev => prev.filter((_, idx) => idx !== i))

  const handleNfeUpload = async () => {
    if (!nfeFile) return
    setNfeLoading(true)
    setError('')
    try {
      const res = await routeService.uploadFile(nfeFile)
      const addresses = res.data.extracted_data?.addresses || []
      const newWps = addresses
        .map(a => ({ address: a.address || a, priority: 0 }))
        .filter(w => w.address)
      setWaypoints(prev => [...prev, ...newWps])
      setNfeCount(prev => prev + newWps.length)
      setNfeFile(null)
      if (nfeInputRef.current) nfeInputRef.current.value = ''
      if (newWps.length === 0) setError('Nenhum endereço encontrado neste arquivo.')
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(Array.isArray(detail) ? detail.map(e => e.msg).join(', ') : detail || 'Falha ao processar NFe.')
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
        'tsp', vehicleType, startAddress, endAddress, waypoints
      )
      localStorage.setItem('lastRoute', JSON.stringify({
        ...res.data,
        vehicleType,
        fuelPrice: fuelPrice ? parseFloat(fuelPrice) : null,
        fuelConsumption: fuelConsumption ? parseFloat(fuelConsumption) : null,
        tollCost: tollCost ? parseFloat(tollCost) : null,
      }))
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

  const hasPriority = waypoints.some(w => w.priority > 0)

  return (
    <div className="main container">
      <div className="page-title">Otimizar Rota</div>
      <div className="page-subtitle">Configure paradas, prioridades e veículo para calcular a melhor rota.</div>

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
          <AddressField
            label="Endereço de Saída"
            value={startAddress}
            onChange={setStartAddress}
            placeholder="Ex: Av. Paulista, 1000, São Paulo, SP"
          />
          <AddressField
            label="Endereço de Chegada"
            value={endAddress}
            onChange={setEndAddress}
            placeholder="Ex: Rua Augusta, 500, São Paulo, SP"
          />

          {/* Fuel + Toll */}
          <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
              ⛽ Custos (opcional)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <label>Preço combustível (R$/L)</label>
                <input type="number" step="0.01" min="0" value={fuelPrice}
                  onChange={e => setFuelPrice(e.target.value)} placeholder="Ex: 5.89" />
              </div>
              <div>
                <label>Consumo (km/L)</label>
                <input type="number" step="0.1" min="0" value={fuelConsumption}
                  onChange={e => setFuelConsumption(e.target.value)} placeholder="Ex: 12.5" />
              </div>
              <div>
                <label>Pedágios estimados (R$)</label>
                <input type="number" step="0.50" min="0" value={tollCost}
                  onChange={e => setTollCost(e.target.value)} placeholder="Ex: 25.00" />
              </div>
            </div>
          </div>

          {/* NFe import */}
          <div className="nfe-section">
            <button
              type="button"
              className={`nfe-toggle${nfeOpen ? ' open' : ''}`}
              onClick={() => setNfeOpen(o => !o)}
            >
              📎 Importar endereços de NFe
              {nfeCount > 0 && (
                <span className="nfe-badge" style={{ marginLeft: 8 }}>{nfeCount} importados</span>
              )}
              <span className="chevron">▼</span>
            </button>
            {nfeOpen && (
              <div className="nfe-body">
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: 12 }}>
                  Upload de XML, PDF ou imagem de NFe. CEPs são consultados automaticamente via ViaCEP.
                </p>
                <div className="nfe-upload-row">
                  <div className="form-group">
                    <input ref={nfeInputRef} type="file" accept=".xml,.pdf,.png,.jpg,.jpeg"
                      onChange={e => setNfeFile(e.target.files[0])} />
                  </div>
                  <button type="button" className="btn-success"
                    onClick={handleNfeUpload} disabled={!nfeFile || nfeLoading}
                    style={{ width: 'auto', marginBottom: 16 }}>
                    {nfeLoading ? '...' : 'Extrair'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Waypoints */}
          <div className="form-group">
            <label>
              Paradas ({waypoints.length})
              {hasPriority && (
                <span style={{ marginLeft: 8, fontSize: '0.72rem', fontWeight: 400, color: 'var(--gray-500)' }}>
                  P1 → P2 → P3 → P0 (otimizado)
                </span>
              )}
            </label>

            {waypoints.map((wp, i) => (
              <WaypointRow
                key={i}
                wp={wp}
                index={i}
                onChange={updated => updateWaypoint(i, updated)}
                onRemove={() => removeWaypoint(i)}
              />
            ))}

            <div className="waypoint-input-row" style={{ marginTop: 8 }}>
              <input
                type="text"
                value={currentWaypoint}
                onChange={e => setCurrentWaypoint(e.target.value)}
                onKeyDown={async e => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  addWaypoint()
                }}
                placeholder="CEP ou endereço completo + Enter"
              />
              <button type="button" className="btn-secondary" onClick={addWaypoint}>
                + Adicionar
              </button>
            </div>
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
