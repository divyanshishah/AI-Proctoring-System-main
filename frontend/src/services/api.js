import axios from 'axios'
import { getApiBaseUrl } from './backend'

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach stored token on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally — clear token and redirect to login
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
