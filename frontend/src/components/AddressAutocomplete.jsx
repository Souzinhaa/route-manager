import React, { useState, useRef, useEffect } from 'react'

const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY

async function loadGooglePlacesScript() {
  if (window.google?.maps?.places) return true
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn('VITE_GOOGLE_PLACES_API_KEY not set')
    return false
  }
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_PLACES_API_KEY}&libraries=places`
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })
}

function extractAddressComponents(place) {
  let street = ''
  let city = ''
  let state = ''
  let number = ''

  const components = place.address_components || []
  components.forEach(c => {
    if (c.types.includes('route')) street = c.long_name
    if (c.types.includes('administrative_area_level_2')) city = c.long_name
    if (c.types.includes('administrative_area_level_1')) state = c.short_name
    if (c.types.includes('street_number')) number = c.long_name
  })

  const address = [street, city && state ? `${city} - ${state}` : city || state].filter(Boolean).join(', ')
  return { address: address || place.formatted_address, number }
}

export default function AddressAutocomplete({ label, value, onAddressChange, onNumberChange, placeholder }) {
  const [address, setAddress] = useState(value || '')
  const [number, setNumber] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [apiReady, setApiReady] = useState(false)
  const inputRef = useRef(null)
  const serviceRef = useRef(null)

  useEffect(() => {
    loadGooglePlacesScript().then(ready => {
      if (ready && window.google?.maps?.places) {
        serviceRef.current = new window.google.maps.places.AutocompleteService()
        setApiReady(true)
      }
    })
  }, [])

  const handleAddressChange = async (e) => {
    const val = e.target.value
    setAddress(val)
    onAddressChange?.(val)
    setShowSuggestions(false)
    setSuggestions([])

    if (!apiReady || !serviceRef.current || val.length < 3) return

    try {
      const predictions = await new Promise((resolve) => {
        serviceRef.current.getPlacePredictions(
          { input: val, componentRestrictions: { country: 'br' } },
          (preds) => resolve(preds || [])
        )
      })
      setSuggestions(predictions)
      setShowSuggestions(predictions.length > 0)
    } catch (err) {
      console.warn('Places API error:', err)
    }
  }

  const handleSelectSuggestion = async (prediction) => {
    setAddress(prediction.main_text)
    setShowSuggestions(false)

    if (!window.google?.maps?.places) {
      onAddressChange?.(prediction.main_text)
      return
    }

    try {
      const service = new window.google.maps.places.PlacesService(document.createElement('div'))
      service.getDetails({ placeId: prediction.place_id }, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          const { address: extractedAddr, number: extractedNum } = extractAddressComponents(place)
          setAddress(extractedAddr)
          setNumber('')
          onAddressChange?.(extractedAddr)
          onNumberChange?.('')
          inputRef.current?.focus()
        }
      })
    } catch (err) {
      console.warn('Places details error:', err)
      onAddressChange?.(prediction.main_text)
    }
  }

  const handleNumberChange = (e) => {
    const num = e.target.value
    setNumber(num)
    onNumberChange?.(num)
  }

  return (
    <div className="form-group">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6, position: 'relative' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            value={address}
            onChange={handleAddressChange}
            placeholder={placeholder || 'Digite o endereço'}
            autoComplete="off"
            style={{ width: '100%', position: 'relative', zIndex: 1 }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                maxHeight: 200,
                overflowY: 'auto',
                zIndex: 10,
              }}
            >
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  onClick={() => handleSelectSuggestion(s)}
                  style={{
                    padding: '0.75rem',
                    cursor: 'pointer',
                    borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                    fontSize: '0.9rem',
                    color: 'var(--text-1)',
                  }}
                  onMouseEnter={e => (e.target.style.background = 'rgba(37,99,235,0.1)')}
                  onMouseLeave={e => (e.target.style.background = 'transparent')}
                >
                  {s.main_text}
                  {s.secondary_text && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: 2 }}>
                      {s.secondary_text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={number}
          onChange={handleNumberChange}
          placeholder="Nº"
          inputMode="numeric"
          style={{ flex: '0 0 70px', maxWidth: 70 }}
          maxLength={10}
        />
      </div>
    </div>
  )
}
