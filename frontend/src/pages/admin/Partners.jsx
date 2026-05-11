import React, { useState, useEffect } from 'react'
import { adminBillingService, adminService } from '../../services/api'

const cardStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '0.75rem' }
const inputStyle = { padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', fontSize: '0.88rem', width: '100%', boxSizing: 'border-box' }
const labelStyle = { display: 'block', color: 'var(--text-2)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }

function PortalLink({ token }) {
  const [copied, setCopied] = useState(false)
  if (!token) return null
  const url = `${window.location.origin}/parceiro/${token}`
  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div style={{ marginTop: '0.75rem', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ color: 'var(--text-2)', fontSize: '0.78rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {url}
      </span>
      <button
        onClick={copy}
        style={{ padding: '0.3rem 0.75rem', background: copied ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${copied ? 'rgba(52,211,153,0.4)' : 'var(--border)'}`, borderRadius: 6, color: copied ? '#34d399' : 'var(--text-2)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}
      >
        {copied ? '✓ Copiado' : 'Copiar link'}
      </button>
    </div>
  )
}

function PartnerEditForm({ partner, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name: partner.name,
    contact_email: partner.contact_email || '',
    phone: partner.phone || '',
    cpf_cnpj: partner.cpf_cnpj || '',
    pix_key: partner.pix_key || '',
    is_active: partner.is_active,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (f, v) => setForm(prev => ({ ...prev, [f]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Nome obrigatório'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        name: form.name.trim(),
        contact_email: form.contact_email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        cpf_cnpj: form.cpf_cnpj.replace(/\D/g, '') || undefined,
        pix_key: form.pix_key.trim() || undefined,
        is_active: form.is_active,
      }
      const res = await adminBillingService.updatePartner(partner.id, payload)
      onSaved(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.6rem', color: '#f87171', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.75rem' }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Nome *</label>
          <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input style={inputStyle} type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Telefone</label>
          <input style={inputStyle} placeholder="+55 11 99999-9999" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>CPF / CNPJ</label>
          <input style={inputStyle} placeholder="Apenas dígitos" value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Chave PIX</label>
          <input style={inputStyle} placeholder="CPF, email, telefone ou chave aleatória" value={form.pix_key} onChange={e => set('pix_key', e.target.value)} />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.88rem' }}>
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
            Parceiro ativo
          </label>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        <button onClick={onCancel} disabled={saving} style={{ flex: 1, padding: '0.65rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.88rem' }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

function PartnerCard({ partner, onUpdated }) {
  const [editing, setEditing] = useState(false)
  const [payingOut, setPayingOut] = useState(false)
  const [payoutMsg, setPayoutMsg] = useState('')

  const handlePayout = async () => {
    setPayingOut(true); setPayoutMsg('')
    try {
      const res = await adminBillingService.pixPayoutPartner(partner.id)
      setPayoutMsg(`PIX enviado: R$ ${res.data.amount?.toFixed(2)} ✓`)
      onUpdated({ ...partner, commission_balance: 0 })
    } catch (err) {
      setPayoutMsg(err.response?.data?.detail || 'Erro ao enviar PIX')
    } finally {
      setPayingOut(false)
    }
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: '1rem' }}>{partner.name}</span>
            <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: 4, background: partner.is_active ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.1)', color: partner.is_active ? '#34d399' : '#f87171', fontWeight: 700 }}>
              {partner.is_active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem', marginTop: 4 }}>
            {partner.contact_email && <span style={{ color: 'var(--text-2)', fontSize: '0.82rem' }}>✉ {partner.contact_email}</span>}
            {partner.phone && <span style={{ color: 'var(--text-2)', fontSize: '0.82rem' }}>📞 {partner.phone}</span>}
            {partner.cpf_cnpj && <span style={{ color: 'var(--text-2)', fontSize: '0.82rem' }}>Doc: {partner.cpf_cnpj}</span>}
          </div>
          {partner.pix_key && (
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>PIX ({partner.pix_key_type || '?'}): </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--primary-light)', fontWeight: 600 }}>{partner.pix_key}</span>
            </div>
          )}
          <div style={{ marginTop: 6 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Saldo a receber: </span>
            <span style={{ fontWeight: 700, color: '#34d399', fontSize: '1rem' }}>R$ {Number(partner.commission_balance).toFixed(2)}</span>
          </div>
          {payoutMsg && (
            <div style={{ marginTop: 4, fontSize: '0.8rem', color: payoutMsg.includes('✓') ? '#34d399' : '#f87171' }}>{payoutMsg}</div>
          )}
          <PortalLink token={partner.access_token} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              style={{ padding: '0.35rem 0.75rem', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: 6, color: 'var(--primary-light)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
            >
              Editar
            </button>
          )}
          {partner.pix_key && Number(partner.commission_balance) > 0 && (
            <button
              onClick={handlePayout}
              disabled={payingOut}
              style={{ padding: '0.35rem 0.75rem', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 6, color: '#34d399', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
            >
              {payingOut ? 'Enviando...' : 'PIX agora'}
            </button>
          )}
        </div>
      </div>
      {editing && (
        <PartnerEditForm
          partner={partner}
          onSaved={(updated) => { setEditing(false); onUpdated(updated) }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  )
}

function PayoutConfigSection() {
  const [config, setConfig] = useState(null)
  const [saving, setSaving] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    adminService.getPayoutConfig().then(r => setConfig(r.data)).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true); setMsg('')
    try {
      const res = await adminService.updatePayoutConfig(config)
      setConfig(res.data)
      setMsg('Configuração salva ✓')
    } catch { setMsg('Erro ao salvar') }
    finally { setSaving(false) }
  }

  const handleTrigger = async () => {
    if (!window.confirm('Executar repasse PIX para todos os parceiros agora?')) return
    setTriggering(true); setMsg('')
    try {
      const res = await adminService.triggerPayouts()
      setMsg(`Enviados: ${res.data.paid} · Ignorados: ${res.data.skipped} ✓`)
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Erro ao executar repasses')
    } finally { setTriggering(false) }
  }

  if (!config) return null

  return (
    <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
      <h3 style={{ color: 'var(--text-1)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Repasse PIX Automático</h3>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Dia do mês (1–28)</label>
          <input
            style={{ ...inputStyle, width: 80 }}
            type="number"
            min={1}
            max={28}
            value={config.payout_day}
            onChange={e => setConfig(c => ({ ...c, payout_day: parseInt(e.target.value) || 5 }))}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.88rem', paddingBottom: '0.1rem' }}>
          <input
            type="checkbox"
            checked={config.auto_enabled}
            onChange={e => setConfig(c => ({ ...c, auto_enabled: e.target.checked }))}
          />
          Automático ativo
        </label>
        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth: 100 }}>
          {saving ? 'Salvando...' : 'Salvar config'}
        </button>
        <button
          onClick={handleTrigger}
          disabled={triggering}
          style={{ padding: '0.6rem 1rem', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 8, color: '#34d399', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}
        >
          {triggering ? 'Enviando...' : 'Executar agora'}
        </button>
      </div>
      {config.last_run_month && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>Último repasse: {config.last_run_month}</div>
      )}
      {msg && <div style={{ marginTop: 6, fontSize: '0.82rem', color: msg.includes('✓') ? '#34d399' : '#f87171' }}>{msg}</div>}
    </div>
  )
}

function Partners() {
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', contact_email: '', phone: '', cpf_cnpj: '', pix_key: '' })
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const load = () => {
    setLoading(true)
    adminBillingService.getPartners()
      .then(res => setPartners(res.data))
      .catch(() => setError('Erro ao carregar parceiros'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const setF = (f, v) => setForm(prev => ({ ...prev, [f]: v }))

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setCreating(true)
    try {
      await adminBillingService.createPartner({
        name: form.name.trim(),
        contact_email: form.contact_email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        cpf_cnpj: form.cpf_cnpj.replace(/\D/g, '') || undefined,
        pix_key: form.pix_key.trim() || undefined,
      })
      setForm({ name: '', contact_email: '', phone: '', cpf_cnpj: '', pix_key: '' })
      setShowCreate(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao criar parceiro')
    } finally {
      setCreating(false)
    }
  }

  const handleUpdated = (updated) => {
    setPartners(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: '1.1rem' }}>Parceiros</h2>
        <button
          onClick={() => setShowCreate(s => !s)}
          className="btn-primary"
          style={{ minWidth: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          {showCreate ? 'Cancelar' : '+ Novo parceiro'}
        </button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem', color: '#f87171', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

      {showCreate && (
        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <h3 style={{ color: 'var(--text-1)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Novo parceiro</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Nome *</label>
                <input style={inputStyle} placeholder="Nome do parceiro" value={form.name} onChange={e => setF('name', e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} type="email" placeholder="email@exemplo.com" value={form.contact_email} onChange={e => setF('contact_email', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Telefone</label>
                <input style={inputStyle} placeholder="+55 11 99999-9999" value={form.phone} onChange={e => setF('phone', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>CPF / CNPJ</label>
                <input style={inputStyle} placeholder="Apenas dígitos" value={form.cpf_cnpj} onChange={e => setF('cpf_cnpj', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Chave PIX</label>
                <input style={inputStyle} placeholder="CPF, email, telefone ou chave aleatória" value={form.pix_key} onChange={e => setF('pix_key', e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Criando...' : 'Criar parceiro'}
            </button>
          </form>
        </div>
      )}

      <PayoutConfigSection />

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-2)', padding: '2rem' }}>Carregando...</div>
      ) : partners.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-2)', padding: '2rem' }}>Nenhum parceiro cadastrado</div>
      ) : (
        partners.map(p => (
          <PartnerCard key={p.id} partner={p} onUpdated={handleUpdated} />
        ))
      )}
    </div>
  )
}

export default Partners
