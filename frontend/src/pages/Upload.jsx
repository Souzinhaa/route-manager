import React, { useState } from 'react'
import { routeService } from '../services/api'

function Upload({ user }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [extracted, setExtracted] = useState([])
  const [waypoints, setWaypoints] = useState([])

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
    setError('')
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await routeService.uploadFile(file)
      const data = res.data.extracted_data?.addresses || []
      setExtracted(data)
      setWaypoints(data.map(d => ({ address: d.address || d, selected: true })))
      setSuccess('File uploaded and parsed successfully!')
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const toggleWaypoint = (index) => {
    const updated = [...waypoints]
    updated[index].selected = !updated[index].selected
    setWaypoints(updated)
  }

  const handleUseWaypoints = () => {
    const selected = waypoints.filter(wp => wp.selected)
    localStorage.setItem('uploadedWaypoints', JSON.stringify(selected))
    setSuccess('Waypoints saved! Go to Dashboard to create route.')
  }

  return (
    <div className="main">
      <h2>Upload NFE / Addresses</h2>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <form onSubmit={handleUpload} style={{ marginBottom: '30px' }}>
          <div className="form-group">
            <label>File (XML, PDF, PNG, JPG)</label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".xml,.pdf,.png,.jpg,.jpeg"
              required
            />
          </div>
          <button type="submit" disabled={!file || loading}>
            {loading ? 'Uploading...' : 'Upload File'}
          </button>
        </form>

        {waypoints.length > 0 && (
          <div style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '20px',
            marginTop: '20px'
          }}>
            <h3>Extracted Addresses ({waypoints.length})</h3>
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              marginBottom: '20px'
            }}>
              {waypoints.map((wp, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px',
                  borderBottom: '1px solid #eee'
                }}>
                  <input
                    type="checkbox"
                    checked={wp.selected}
                    onChange={() => toggleWaypoint(i)}
                    style={{ marginRight: '10px' }}
                  />
                  <span>{wp.address}</span>
                </div>
              ))}
            </div>
            <button onClick={handleUseWaypoints} style={{
              background: '#28a745',
              width: '100%'
            }}>
              Use Selected ({waypoints.filter(w => w.selected).length}) as Route
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Upload
