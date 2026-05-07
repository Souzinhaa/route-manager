import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { routeService } from '../services/api'

function Upload({ user }) {
  const [allWaypoints, setAllWaypoints] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filesProcessed, setFilesProcessed] = useState(0)
  const fileInputRef = useRef()
  const navigate = useNavigate()

  const maxStops = user?.max_stops ?? 50

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setLoading(true)
    setError('')

    let added = 0
    let errors = []

    for (const file of files) {
      try {
        const res = await routeService.uploadFile(file)
        const addresses = res.data.extracted_data?.addresses || []
        const newWps = addresses
          .map(a => ({ address: a.address || a, selected: true }))
          .filter(w => w.address)
        setAllWaypoints(prev => [...prev, ...newWps])
        added += newWps.length
        setFilesProcessed(n => n + 1)
      } catch (err) {
        const detail = err.response?.data?.detail
        errors.push(
          `${file.name}: ${Array.isArray(detail) ? detail.map(e => e.msg).join(', ') : detail || 'Falha no upload.'}`
        )
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
    if (added === 0 && errors.length === 0) setError('Nenhum endereço encontrado nos arquivos.')
    if (errors.length > 0) setError(errors.join('\n'))
    setLoading(false)
  }

  const toggleWaypoint = (i) => {
    setAllWaypoints(prev => {
      const updated = [...prev]
      updated[i] = { ...updated[i], selected: !updated[i].selected }
      return updated
    })
  }

  const removeWaypoint = (i) => setAllWaypoints(prev => prev.filter((_, idx) => idx !== i))

  const selectedCount = allWaypoints.filter(w => w.selected).length
  const overLimit = maxStops !== -1 && selectedCount > maxStops

  const handleUseWaypoints = () => {
    const selected = allWaypoints.filter(w => w.selected)
    localStorage.setItem('uploadedWaypoints', JSON.stringify(selected))
    navigate('/dashboard')
  }

  return (
    <div className="main container">
      <div className="page-title">Importar NFe</div>
      <div className="page-subtitle">
        Faça upload de XMLs, PDFs ou imagens de Notas Fiscais para extrair endereços automaticamente.
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        {error && <div className="error" style={{ whiteSpace: 'pre-line' }}>{error}</div>}

        {/* Upload zone */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">📤 Carregar Arquivos</div>
          <div
            className="drop-zone"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="drop-zone-icon">📄</div>
            <div className="drop-zone-label">
              {loading ? 'Processando...' : 'Clique para selecionar um ou mais arquivos'}
            </div>
            <div className="drop-zone-hint">XML, PDF, PNG, JPG — até 20 MB por arquivo</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,.pdf,.png,.jpg,.jpeg"
            multiple
            onChange={handleUpload}
            style={{ display: 'none' }}
          />
          {filesProcessed > 0 && (
            <p style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--gray-500)', textAlign: 'center' }}>
              ✅ {filesProcessed} arquivo{filesProcessed > 1 ? 's' : ''} processado{filesProcessed > 1 ? 's' : ''}
              — pode adicionar mais
            </p>
          )}
        </div>

        {/* Extracted addresses */}
        {allWaypoints.length > 0 && (
          <div className="card">
            <div className="card-title">
              📍 Endereços Extraídos
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 400, color: overLimit ? 'var(--danger)' : 'var(--gray-500)' }}>
                {selectedCount} de {allWaypoints.length} selecionados
                {maxStops !== -1 && ` · limite: ${maxStops}`}
              </span>
            </div>

            {overLimit && (
              <div className="error" style={{ marginBottom: 12 }}>
                Seleção excede o limite de {maxStops} paradas do seu plano. Desmarque {selectedCount - maxStops} endereço{selectedCount - maxStops > 1 ? 's' : ''}.
              </div>
            )}

            <div style={{ border: '1.5px solid var(--gray-200)', borderRadius: 8, overflow: 'hidden', marginBottom: 16, maxHeight: 400, overflowY: 'auto' }}>
              {allWaypoints.map((wp, i) => (
                <div key={i} className="address-item">
                  <input
                    type="checkbox"
                    id={`wp-${i}`}
                    checked={wp.selected}
                    onChange={() => toggleWaypoint(i)}
                  />
                  <label htmlFor={`wp-${i}`} style={{ flex: 1 }}>{wp.address}</label>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => removeWaypoint(i)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setAllWaypoints(prev => prev.map(w => ({ ...w, selected: !w.selected })))}
              >
                Inverter seleção
              </button>
              <button
                className="btn-primary"
                style={{ flex: 2 }}
                disabled={selectedCount === 0 || overLimit}
                onClick={handleUseWaypoints}
              >
                🗺️ Usar {selectedCount} endereços na rota
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Upload
