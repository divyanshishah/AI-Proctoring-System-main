const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

function getBrowserLocation() {
  return typeof window !== 'undefined' ? window.location : null
}

function getLocalBackendOrigin(hostname) {
  const host = hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost'
  return `http://${host}:5000`
}

export function getBackendOrigin() {
  const configured = import.meta.env.VITE_API_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')

  const location = getBrowserLocation()
  if (!location) return 'http://localhost:5000'

  if (LOCAL_HOSTS.has(location.hostname)) {
    return getLocalBackendOrigin(location.hostname)
  }

  return location.origin
}

export function getApiBaseUrl() {
  return `${getBackendOrigin()}/api`
}
