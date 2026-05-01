import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { routeService } from '../services/api'

function Upload() {
  const [allWaypoints, setAllWaypoints] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filesProcessed, setFilesProcessed] = useState(0)
  const fileInputRef = useRef()
  const navigate = useNavigate()

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const res = await routeService.uploadFile(file)
      const addresses = res.data.extracted_data?.addresses || []
      const newWps = addresses
        .map(a => ({ address: a.address || a, selected: true }))
        .filter(w => w.address)
      setAllWaypoints(prev => [...prev, ...newWps])
      setFilesProcessed(n => n + 1)
      if (newWps.length === 0) setError('Nenhum endereço encontrado neste arquivo.')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(Array.isArray(detail) ? detail.map(e => e.msg).join(', ') : detail || 'Falha no upload.')
    } finally {
      setLoading(false)
    }
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
        {error && <div className="error">{error}</div>}

        {/* Upload zone */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">📤 Carregar Arquivo</div>
          <div
            className="drop-zone"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="drop-zone-icon">📄</div>
            <div className="drop-zone-label">
              {loading ? 'Processando...' : 'Clique para selecionar um arquivo'}
            </div>
            <div className="drop-zone-hint">XML, PDF, PNG, JPG — até 20 MB</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,.pdf,.png,.jpg,.jpeg"
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
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 400, color: 'var(--gray-500)' }}>
                {selectedCount} de {allWaypoints.length} selecionados
              </span>
            </div>

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
                disabled={selectedCount === 0}
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
