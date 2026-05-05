import React, { useState, useEffect } from 'react'
import { adminService } from '../../services/api'

const TIER_LABEL = { trial: 'Trial', consumer: 'Consumer', enterprise: 'Enterprise' }
const TIER_COLOR = {
  trial:      { bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.3)',  text: '#34d399' },
  consumer:   { bg: 'rgba(37,99,235,0.1)',   border: 'rgba(37,99,235,0.3)',   text: 'var(--primary-light)' },
  enterprise: { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)', text: '#f59e0b' },
}

function fmtStops(v) { return v === -1 ? '∞' : String(v) }
function fmtRoutes(v) { return v === -1 ? '∞' : String(v) }

const inputStyle = {
  padding: '0.55rem 0.75rem',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-1)',
  fontSize: '0.88rem',
  width: '100%',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  color: 'var(--text-2)',
  fontSize: '0.72rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 5,
}

function PlanEditForm({ plan, onSaved, onCancel }) {
  const [form, setForm] = useState({
    price_full: plan.price_full,
    price_coupon: plan.price_coupon,
    price_onboarding: plan.price_onboarding,
    has_onboarding_discount: plan.has_onboarding_discount,
    routes_per_day: plan.routes_per_day,
    max_stops: plan.max_stops,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        price_full: parseFloat(form.price_full),
        price_coupon: parseFloat(form.price_coupon),
        price_onboarding: parseFloat(form.price_onboarding),
        has_onboarding_discount: form.has_onboarding_discount,
        routes_per_day: parseInt(form.routes_per_day),
        max_stops: parseInt(form.max_stops),
      }
      if (isNaN(payload.price_full) || isNaN(payload.price_coupon) || isNaN(payload.price_onboarding)) {
        setError('Preços inválidos')
        return
      }
      if (isNaN(payload.routes_per_day) || isNaN(payload.max_stops)) {
        setError('Rotas e paradas devem ser números inteiros (-1 = ilimitado)')
        return
      }
      const res = await adminService.updatePlan(plan.key, payload)
      onSaved(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.6rem 0.75rem', color: '#f87171', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Valor cheio (R$)</label>
          <input
            style={inputStyle}
            type="number"
            min="0"
            step="0.01"
            value={form.price_full}
            onChange={e => set('price_full', e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Preço com cupom (R$)</label>
          <input
            style={inputStyle}
            type="number"
            min="0"
            step="0.01"
            value={form.price_coupon}
            onChange={e => set('price_coupon', e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Preço onboarding (R$)</label>
          <input
            style={inputStyle}
            type="number"
            min="0"
            step="0.01"
            value={form.price_onboarding}
            onChange={e => set('price_onboarding', e.target.value)}
            disabled={!form.has_onboarding_discount}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.88rem', paddingBottom: '0.55rem' }}>
            <input
              type="checkbox"
              checked={form.has_onboarding_discount}
              onChange={e => set('has_onboarding_discount', e.target.checked)}
            />
            Desconto onboarding ativo
          </label>
        </div>
        <div>
          <label style={labelStyle}>Rotas/dia (-1 = ilimitado)</label>
          <input
            style={inputStyle}
            type="number"
            min="-1"
            step="1"
            value={form.routes_per_day}
            onChange={e => set('routes_per_day', e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Paradas máx (-1 = ilimitado)</label>
          <input
            style={inputStyle}
            type="number"
            min="-1"
            step="1"
            value={form.max_stops}
            onChange={e => set('max_stops', e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ flex: 1 }}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{ flex: 1, padding: '0.65rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

function PlanCard({ plan, onUpdated }) {
  const [editing, setEditing] = useState(false)
  const tc = TIER_COLOR[plan.tier] || TIER_COLOR.consumer

  const handleSaved = (updated) => {
    setEditing(false)
    onUpdated(updated)
  }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: '1rem' }}>{plan.name}</div>
          <span style={{ background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text, borderRadius: 5, padding: '0.15rem 0.45rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>
            {TIER_LABEL[plan.tier] || plan.tier}
          </span>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            style={{ padding: '0.35rem 0.85rem', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: 6, color: 'var(--primary-light)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            Editar
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.5rem 0.65rem', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: '1rem' }}>R${plan.price_full}</div>
          <div style={{ color: 'var(--text-2)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cheio</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.5rem 0.65rem', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: '1rem' }}>R${plan.price_coupon}</div>
          <div style={{ color: 'var(--text-2)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cupom</div>
        </div>
        <div style={{ background: plan.has_onboarding_discount ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.5rem 0.65rem', textAlign: 'center' }}>
          <div style={{ color: plan.has_onboarding_discount ? '#34d399' : 'var(--text-2)', fontWeight: 700, fontSize: '1rem' }}>
            {plan.has_onboarding_discount ? `R$${plan.price_onboarding}` : '—'}
          </div>
          <div style={{ color: 'var(--text-2)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Onboard</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.4rem 0.65rem', textAlign: 'center' }}>
          <span style={{ color: 'var(--primary-light)', fontWeight: 700 }}>{fmtRoutes(plan.routes_per_day)}</span>
          <span style={{ color: 'var(--text-2)', fontSize: '0.72rem' }}> rota(s)/dia</span>
        </div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.4rem 0.65rem', textAlign: 'center' }}>
          <span style={{ color: 'var(--primary-light)', fontWeight: 700 }}>{fmtStops(plan.max_stops)}</span>
          <span style={{ color: 'var(--text-2)', fontSize: '0.72rem' }}> paradas</span>
        </div>
      </div>

      {editing && (
        <PlanEditForm
          plan={plan}
          onSaved={handleSaved}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  )
}

function PlanConfig() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    adminService.getPlans()
      .then(res => setPlans(res.data))
      .catch(() => setError('Erro ao carregar planos'))
      .finally(() => setLoading(false))
  }, [])

  const handleUpdated = (updated) => {
    setPlans(prev => prev.map(p => p.key === updated.key ? updated : p))
  }

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-2)', textAlign: 'center' }}>Carregando...</div>

  return (
    <div>
      <h2 style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Configuração de Planos</h2>
      <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Edite valores, descontos e limites. Alterações refletem imediatamente na página de planos.
      </p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem', color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {plans.map(plan => (
          <PlanCard key={plan.key} plan={plan} onUpdated={handleUpdated} />
        ))}
      </div>
    </div>
  )
}

export default PlanConfig
