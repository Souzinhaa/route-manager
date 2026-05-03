import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
})

// No-ops kept for import compatibility — auth is httpOnly cookie + CSRF header
export function getToken() { return null }
export function setToken(_token) {}

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

// Attach CSRF token on state-changing requests (double-submit cookie pattern)
api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
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
  register: (email, password, fullName, cpfCnpj, lgpdConsent) =>
    api.post('/auth/register', { email, password, full_name: fullName, cpf_cnpj: cpfCnpj, lgpd_consent: lgpdConsent }),
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
  optimizeRoute: (optimizationType, vehicleType, startAddress, endAddress, waypoints) =>
    api.post('/routes/optimize', {
      optimization_type: optimizationType,
      vehicle_type: vehicleType,
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

export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  patchUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  getUserRoutes: (id) => api.get(`/admin/users/${id}/routes`),
  deleteRoute: (userId, routeId) => api.delete(`/admin/users/${userId}/routes/${routeId}`),
  changePassword: (newPassword) => api.post('/admin/change-password', { new_password: newPassword }),
}

export const billingService = {
  getPlans: () => api.get('/billing/plans'),
  subscribe: (plan, billingType, cpfCnpj) =>
    api.post('/billing/subscribe', { plan, billing_type: billingType, cpf_cnpj: cpfCnpj }),
  getSubscription: () => api.get('/billing/subscription'),
  cancelSubscription: () => api.delete('/billing/subscription'),
  downgrade: () => api.post('/billing/downgrade'),
}

export default api
