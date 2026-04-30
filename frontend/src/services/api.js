import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,  // send httpOnly cookies on every request
})

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

// Attach CSRF token to state-changing requests (double-submit cookie pattern)
api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase()
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = getCsrfToken()
    if (csrf) config.headers['X-CSRF-Token'] = csrf
  }
  return config
})

// 401 → broadcast logout event so App can clear state and redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:logout'))
    }
    return Promise.reject(error)
  }
)

export const authService = {
  register: (email, password, fullName) =>
    api.post('/auth/register', { email, password, full_name: fullName }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
}

export const routeService = {
  uploadFile: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/routes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  optimizeRoute: (optimizationType, startAddress, endAddress, waypoints) =>
    api.post('/routes/optimize', {
      optimization_type: optimizationType,
      start_address: startAddress,
      end_address: endAddress,
      waypoints,
    }),
  saveRoute: (name, optimizationType, startAddress, endAddress, waypoints) =>
    api.post('/routes/save', {
      name,
      optimization_type: optimizationType,
      start_address: startAddress,
      end_address: endAddress,
      waypoints,
    }),
  getHistory: () => api.get('/routes/history'),
}

export default api
