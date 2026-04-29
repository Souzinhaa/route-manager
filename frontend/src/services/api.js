import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${API_URL}/api`
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authService = {
  register: (email, password, fullName) =>
    api.post('/auth/register', { email, password, full_name: fullName }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  getCurrentUser: () =>
    api.get('/auth/me')
}

export const routeService = {
  uploadFile: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/routes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  optimizeRoute: (optimizationType, startAddress, endAddress, waypoints) =>
    api.post('/routes/optimize', {
      optimization_type: optimizationType,
      start_address: startAddress,
      end_address: endAddress,
      waypoints
    }),
  saveRoute: (name, optimizationType, startAddress, endAddress, waypoints) =>
    api.post('/routes/save', {
      name,
      optimization_type: optimizationType,
      start_address: startAddress,
      end_address: endAddress,
      waypoints
    }),
  getHistory: () =>
    api.get('/routes/history')
}

export default api
