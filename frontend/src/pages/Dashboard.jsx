import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { routeService } from '../services/api'
import { fetchCepData, buildAddressFromCepData } from '../components/CepInput'

const VEHICLES = [
  { id: 'moto',   icon: '🏍️', label: 'Moto' },
  { id: 'leve',   icon: '🚗', label: 'Leve' },
  { id: 'pesado', icon: '🚛', label: 'Pesado' },
]

// ATM-style masks: user types digits only
function applyPriceMask(raw) {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const n = parseInt(digits, 10)
  const reais = Math.floor(n / 100)
  const centavos = n % 100
  return `${reais},${String(centavos).padStart(2, '0')}`
}

function applyConsumptionMask(raw) {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const n = parseInt(digits, 10)
  return `${Math.floor(n / 10)},${n % 10}`
}

function parseMasked(str) {
  if (!str) return null
  const parsed = parseFloat(str.replace(',', '.'))
  return isNaN(parsed) ? null : parsed
}

async function resolveAddress(val) {
  const digits = val.replace(/\D/g, '')
  if (digits.length === 8) {
    const data = await fetchCepData(digits)
    if (data) return buildAddressFromCepData(data)
  }
  return val
}

/* ── Address field with CEP + number ── */
function AddressField({ label, value, onChange, placeholder }) {
  const [cep, setCep] = useState('')
  const [number, setNumber] = useState('')
  const [cepData, setCepData] = useState(null)
  const [cepStatus, setCepStatus] = useState(null)

  const handleCepChange = async (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8)
    const formatted = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw
    setCep(formatted)
    setCepStatus(null)
    setCepData(null)
    if (raw.length === 8) {
      setCepStatus('loading')
      const data = await fetchCepData(raw)
      if (data) {
        setCepData(data)
        setCepStatus('ok')
        onChange(buildAddressFromCepData(data, number))
      } else {
        setCepStatus('err')
      }
    }
  }

  const handleNumberChange = (e) => {
    const num = e.target.value
    setNumber(num)
    if (cepData) onChange(buildAddressFromCepData(cepData, num))
  }

  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="cep-row" style={{ marginBottom: 6 }}>
        <input
          type="text"
          value={cep}
          onChange={handleCepChange}
          placeholder="CEP"
          style={{ width: 105, flex: 'none' }}
          maxLength={9}
        />
        <input
          type="text"
          value={number}
          onChange={handleNumberChange}
          placeholder="Nº"
          style={{ width: 64, flex: 'none' }}
          maxLength={10}
        />
        {cepStatus === 'loading' && (
          <span className="cep-status" style={{ color: 'var(--gray-400)' }}>Buscando...</span>
        )}
        {cepStatus === 'ok' && (
          <span className="cep-status" style={{ color: 'var(--success)' }}>Encontrado</span>
        )}
        {cepStatus === 'err' && (
          <span className="cep-status" style={{ color: 'var(--danger)' }}>CEP inválido</span>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setCepStatus(null); setCepData(null) }}
        placeholder={placeholder || 'Ou digite o endereço completo'}
      />
    </div>
  )
}

/* ── Single waypoint row ── */
function WaypointRow({ wp, index, onChange, onRemove }) {
  const [cep, setCep] = useState('')
  const [number, setNumber] = useState('')
  const [cepData, setCepData] = useState(null)
  const [cepStatus, setCepStatus] = useState(null)
  const hasPriority = wp.priority > 0

  const handleCepChange = async (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8)
    const formatted = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw
    setCep(formatted)
    setCepStatus(null)
    setCepData(null)
    if (raw.length === 8) {
      setCepStatus('loading')
      const data = await fetchCepData(raw)
      if (data) {
        setCepData(data)
        setCepStatus('ok')
        onChange({ ...wp, address: buildAddressFromCepData(data, number) })
      } else {
        setCepStatus('err')
      }
    }
  }

  const handleNumberChange = (e) => {
    const num = e.target.value
    setNumber(num)
    if (cepData) onChange({ ...wp, address: buildAddressFromCepData(cepData, num) })
  }

  return (
    <div className={`waypoint-card${hasPriority ? ' waypoint-priority' : ''}`}>
      {/* CEP + Nº + priority + remove */}
      <div className="waypoint-card-top">
        <span className="waypoint-num">{index + 1}</span>
        <input
          type="text"
          value={cep}
          onChange={handleCepChange}
          placeholder="CEP"
          style={{ width: 88, flex: 'none', fontSize: '0.82rem', padding: '6px 9px' }}
          maxLength={9}
        />
        <input
          type="text"
          value={number}
          onChange={handleNumberChange}
          placeholder="Nº"
          style={{ width: 52, flex: 'none', fontSize: '0.82rem', padding: '6px 8px' }}
          maxLength={10}
        />
        {cepStatus === 'loading' && (
          <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>...</span>
        )}
        {cepStatus === 'ok' && (
          <span style={{ fontSize: '0.72rem', color: 'var(--success)', whiteSpace: 'nowrap' }}>✓</span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>Ordem</span>
          <input
            type="number"
            min="0"
            step="1"
            value={wp.priority || ''}
            onChange={e => {
              const v = parseInt(e.target.value, 10)
              onChange({ ...wp, priority: isNaN(v) || v < 1 ? 0 : v })
            }}
            placeholder="—"
            title="Número na ordem de entrega (1 = primeiro). Em branco = otimização automática."
            style={{ width: 54, padding: '6px 8px', fontSize: '0.82rem', textAlign: 'center', flexShrink: 0 }}
          />
          <button type="button" className="btn-danger" onClick={onRemove} style={{ flexShrink: 0 }}>✕</button>
        </div>
      </div>

      {/* Full address */}
      <div className="waypoint-card-bottom">
        <input
          type="text"
          value={wp.address}
          onChange={e => { onChange({ ...wp, address: e.target.value }); setCepData(null) }}
          placeholder="Endereço completo"
          style={{ flex: 1, minWidth: 0 }}
        />
      </div>

      {hasPriority && (
        <p style={{ fontSize: '0.7rem', color: 'var(--primary-light)', marginTop: 5 }}>
          {wp.priority}ª parada na sequência de entrega
        </p>
      )}
    </div>
  )
}

const PLAN_LIMITS = {
  tester:   { routes_per_day: 1,  max_waypoints: 50,  name: 'Trial' },
  basic:    { routes_per_day: 1,  max_waypoints: 100, name: 'Basic' },
  starter:  { routes_per_day: 3,  max_waypoints: 100, name: 'Starter' },
  delivery: { routes_per_day: 5,  max_waypoints: 150, name: 'Delivery' },
  premium:  { routes_per_day: 10, max_waypoints: 200, name: 'Premium' },
  enterprise: { routes_per_day: -1, max_waypoints: -1, name: 'Enterprise' },
}

function PlanWidget({ user, todayRoutes }) {
  if (!user) return null
  const plan = user.plan || 'tester'
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.tester
  const isUnlimited = limits.routes_per_day === -1
  const used = todayRoutes || 0
  const total = limits.routes_per_day

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: '0.75rem',
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '0.9rem 1.25rem', marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Plano</div>
          <div style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: '0.95rem' }}>
            {limits.name}
            {user.plan_status === 'trial' && (
              <span style={{ marginLeft: 6, fontSize: '0.7rem', background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '0.15rem 0.45rem', borderRadius: 4, fontWeight: 700 }}>TRIAL</span>
            )}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Rotas hoje</div>
          <div style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: '0.95rem' }}>
            {isUnlimited ? (
              <span style={{ color: '#34d399' }}>Ilimitado</span>
            ) : (
              <>
                <span style={{ color: used >= total ? '#f87171' : 'var(--primary-light)' }}>{used}</span>
                <span style={{ color: 'var(--text-2)', fontWeight: 400 }}> / {total}</span>
              </>
            )}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Max paradas</div>
          <div style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: '0.95rem' }}>
            {limits.max_waypoints === -1 ? <span style={{ color: '#34d399' }}>Ilimitado</span> : limits.max_waypoints}
          </div>
        </div>
      </div>
      <Link
        to="/plans"
        style={{
          fontSize: '0.82rem', color: 'var(--primary-light)', fontWeight: 600,
          textDecoration: 'none', whiteSpace: 'nowrap',
        }}
      >
        {user.plan === 'tester' || user.plan_status !== 'active' ? 'Fazer upgrade →' : 'Ver planos →'}
      </Link>
    </div>
  )
}

/* ── Dashboard page ── */
function Dashboard({ user, setUser }) {
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
  const [axleCount, setAxleCount] = useState(2)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [waypointShake, setWaypointShake] = useState(false)
  const nfeInputRef = useRef()
  const navigate = useNavigate()

  const planKey = (user?.plan || 'tester').toLowerCase()
  const waypointLimit = PLAN_LIMITS[planKey]?.max_waypoints ?? 50
  const isWaypointUnlimited = waypointLimit === -1
  const atWaypointLimit = !isWaypointUnlimited && waypoints.length >= waypointLimit

  const triggerShake = () => {
    setWaypointShake(true)
    setTimeout(() => setWaypointShake(false), 600)
  }

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
    if (atWaypointLimit) { triggerShake(); return }
    const addr = await resolveAddress(val)
    if (!isWaypointUnlimited && waypoints.length >= waypointLimit) { triggerShake(); return }
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
        fuelPrice: parseMasked(fuelPrice),
        fuelConsumption: parseMasked(fuelConsumption),
        axleCount,
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
    <div className="main">
      <div className="container">
      <div className="page-title">Otimizar Rota</div>
      <div className="page-subtitle">
        Configure paradas, prioridades e veículo para calcular a melhor rota.
      </div>

      <PlanWidget user={user} todayRoutes={routes.filter(r => {
        const d = new Date(r.created_at)
        const today = new Date()
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
      }).length} />

      <div className="grid-2">
        {/* ── Form card ── */}
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

          {/* Origin / Destination */}
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

          {/* Fuel & costs */}
          <div className="fuel-block">
            <div className="fuel-block-label">Custos (opcional)</div>
            <div className="fuel-grid">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Combustível (R$/L)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--gray-400)', fontSize: '0.875rem', pointerEvents: 'none',
                  }}>R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={fuelPrice}
                    onChange={e => setFuelPrice(applyPriceMask(e.target.value))}
                    placeholder="0,00"
                    style={{ paddingLeft: 32 }}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Consumo (km/L)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fuelConsumption}
                  onChange={e => setFuelConsumption(applyConsumptionMask(e.target.value))}
                  placeholder="0,0"
                />
              </div>
              {vehicleType === 'pesado' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Nº de Eixos</label>
                  <select
                    value={axleCount}
                    onChange={e => setAxleCount(parseInt(e.target.value, 10))}
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                      <option key={n} value={n}>{n} eixos</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 8 }}>
              Pedágios estimados automaticamente pela distância da rota.
            </p>
          </div>

          {/* NFe import accordion */}
          <div className="nfe-section">
            <button
              type="button"
              className={`nfe-toggle${nfeOpen ? ' open' : ''}`}
              onClick={() => setNfeOpen(o => !o)}
            >
              Importar endereços de NFe
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
                  Upload de XML, PDF ou imagem de NFe. CEPs consultados via ViaCEP.
                </p>
                <div className="nfe-upload-row">
                  <div className="form-group" style={{ flex: 1, minWidth: 0, marginBottom: 0 }}>
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
                    style={{ width: 'auto', flexShrink: 0 }}
                  >
                    {nfeLoading ? '...' : 'Extrair'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Waypoints list */}
          <style>{`
            @keyframes shake {
              0%,100% { transform: translateX(0); }
              15%      { transform: translateX(-6px); }
              30%      { transform: translateX(6px); }
              45%      { transform: translateX(-5px); }
              60%      { transform: translateX(5px); }
              75%      { transform: translateX(-3px); }
              90%      { transform: translateX(3px); }
            }
            .waypoint-limit-shake { animation: shake 0.55s ease; }
          `}</style>
          <div className={`form-group${waypointShake ? ' waypoint-limit-shake' : ''}`}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <span>
                Paradas
                {hasPriority && (
                  <span style={{ marginLeft: 8, fontSize: '0.7rem', fontWeight: 400, color: 'var(--gray-500)', textTransform: 'none', letterSpacing: 0 }}>
                    paradas com ordem definida entregues primeiro
                  </span>
                )}
              </span>
              <span style={{
                fontSize: '0.78rem', fontWeight: 700, letterSpacing: 0, textTransform: 'none',
                color: atWaypointLimit ? '#f87171' : 'var(--text-2)',
                background: atWaypointLimit ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${atWaypointLimit ? 'rgba(239,68,68,0.35)' : 'var(--border)'}`,
                borderRadius: 6, padding: '0.2rem 0.55rem',
                transition: 'all 0.25s',
              }}>
                {isWaypointUnlimited
                  ? `${waypoints.length} paradas`
                  : `${waypoints.length} / ${waypointLimit}`}
                {atWaypointLimit && ' — limite atingido'}
              </span>
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: -4, marginBottom: 8 }}>
              Defina um número em "Ordem" para fixar a sequência. Em branco = otimização automática.
            </p>

            {waypoints.map((wp, i) => (
              <WaypointRow
                key={i}
                wp={wp}
                index={i}
                onChange={updated => updateWaypoint(i, updated)}
                onRemove={() => removeWaypoint(i)}
              />
            ))}

            {atWaypointLimit && (
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8, padding: '0.65rem 0.9rem', marginTop: 8,
                fontSize: '0.82rem', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              }}>
                <span>Limite de {waypointLimit} paradas atingido no plano <strong>{PLAN_LIMITS[planKey]?.name}</strong>.</span>
                <Link to="/plans" style={{ color: '#f87171', fontWeight: 700, textDecoration: 'underline', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                  Fazer upgrade →
                </Link>
              </div>
            )}

            {!atWaypointLimit && (
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
                  placeholder="CEP ou endereço + Enter"
                />
                <button type="button" className="btn-secondary" onClick={addWaypoint}>
                  + Adicionar
                </button>
              </div>
            )}
          </div>

          <button
            className="btn-primary"
            onClick={handleOptimize}
            disabled={loading || !startAddress || !endAddress || waypoints.length === 0}
          >
            {loading ? 'Otimizando...' : 'Otimizar Rota'}
          </button>
        </div>

        {/* ── Route history ── */}
        <div>
          <div className="card-title" style={{ marginBottom: 14 }}>Rotas Recentes</div>
          {routes.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 36 }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>🗺️</div>
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
                    <span>{route.start_address}</span>
                    {route.total_distance_km && (
                      <span>{route.total_distance_km.toFixed(1)} km</span>
                    )}
                    {route.total_duration_minutes && (
                      <span>{formatDuration(route.total_duration_minutes)}</span>
                    )}
                    {route.google_maps_url && (
                      <a
                        href={route.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--primary-light)', textDecoration: 'none', fontWeight: 600 }}
                      >
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
    </div>
  )
}

export default Dashboard
