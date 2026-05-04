import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
})

// No-ops kept for import compatibility — auth is httpOnly cookie + CSRF header
export function getToken() { return null }
export function setToken(_token) {}

// CSRF token is stored in localStorage because in cross-origin deployments (Vercel → Render)
// document.cookie cannot read cookies set by a different domain.
function getCsrfToken() {
  return localStorage.getItem('csrf_token')
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
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    if (res.data?.csrf_token) localStorage.setItem('csrf_token', res.data.csrf_token)
    return res
  },
  logout: async () => {
    const res = await api.post('/auth/logout')
    localStorage.removeItem('csrf_token')
    return res
  },
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
  autocompleteAddress: (q) => api.get('/routes/autocomplete', { params: { q } }),
}

export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  patchUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  getUserRoutes: (id) => api.get(`/admin/users/${id}/routes`),
  deleteRoute: (userId, routeId) => api.delete(`/admin/users/${userId}/routes/${routeId}`),
  changePassword: (newPassword) => api.post('/admin/change-password', { new_password: newPassword }),
  getUserCosts: (params) => api.get('/admin/user-costs', { params }),
}

export const billingService = {
  getPlans: () => api.get('/billing/plans'),
  subscribe: (plan, billingType, cpfCnpj, couponCode) =>
    api.post('/billing/subscribe', { plan, billing_type: billingType, cpf_cnpj: cpfCnpj, coupon_code: couponCode || undefined }),
  validateCoupon: (code) =>
    api.post('/billing/coupons/validate', { code }),
  getSubscription: () => api.get('/billing/subscription'),
  cancelSubscription: () => api.delete('/billing/subscription'),
  downgrade: () => api.post('/billing/downgrade'),
}

export const adminBillingService = {
  getPartners: () => api.get('/admin/partners'),
  createPartner: (data) => api.post('/admin/partners', data),
  getPartner: (id) => api.get(`/admin/partners/${id}`),
  withdrawCommission: (id, amount) => api.post(`/admin/partners/${id}/withdraw`, { amount }),
  getCoupons: () => api.get('/admin/coupons'),
  createCoupon: (data) => api.post('/admin/coupons', data),
  toggleCoupon: (id) => api.patch(`/admin/coupons/${id}`),
  getTransactions: (params) => api.get('/admin/transactions', { params }),
}

export default api
