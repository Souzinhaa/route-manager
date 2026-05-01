import React, { useState } from 'react'

async function fetchCep(cep) {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    const data = await res.json()
    if (data.erro) return null
    const parts = [
      data.logradouro,
      data.bairro,
      `${data.localidade} - ${data.uf}`,
      `CEP ${digits.slice(0, 5)}-${digits.slice(5)}`,
    ].filter(Boolean)
    return parts.join(', ')
  } catch {
    return null
  }
}

function formatCep(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`
  return digits
}

export default function CepInput({ label, value, onChange, placeholder }) {
  const [cepValue, setCepValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [found, setFound] = useState(false)

  const handleCepChange = async (e) => {
    const formatted = formatCep(e.target.value)
    setCepValue(formatted)
    setFound(false)
    const digits = formatted.replace(/\D/g, '')
    if (digits.length === 8) {
      setLoading(true)
      const addr = await fetchCep(digits)
      setLoading(false)
      if (addr) {
        onChange(addr)
        setFound(true)
      }
    }
  }

  return (
    <div className="form-group">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <input
          type="text"
          value={cepValue}
          onChange={handleCepChange}
          placeholder="00000-000"
          style={{ maxWidth: 130 }}
          maxLength={9}
        />
        {loading && <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--gray-400)' }}>🔍 Buscando...</span>}
        {found && <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--success)' }}>✅ CEP encontrado</span>}
      </div>
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setFound(false) }}
        placeholder={placeholder || 'Ou digite o endereço completo'}
      />
    </div>
  )
}

export { fetchCep, formatCep }
