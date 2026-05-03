import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'access_token'

const api = axios.create({
  baseURL: `${API_URL}/api`,
})

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

// Attach Bearer token to every request
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers['Authorization'] = `Bearer ${token}`
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
}

export const billingService = {
  getPlans: () => api.get('/billing/plans'),
  subscribe: (plan, billingType, cpfCnpj) =>
    api.post('/billing/subscribe', { plan, billing_type: billingType, cpf_cnpj: cpfCnpj }),
  getSubscription: () => api.get('/billing/subscription'),
  cancelSubscription: () => api.delete('/billing/subscription'),
}

export default api
