import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({ baseURL: BASE, timeout: 30000 })

// Attach token to every request automatically
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Auth
export async function registerUser({ name, email, password }) {
  const { data } = await api.post('/api/auth/register', { name, email, password })
  return data
}
export async function loginUser({ email, password }) {
  const { data } = await api.post('/api/auth/login', { email, password })
  return data
}
export async function getMe() {
  const { data } = await api.get('/api/auth/me')
  return data
}

// Email
export async function generateEmail({ prompt, tone, model }) {
  const { data } = await api.post('/api/generate', { prompt, tone, model })
  return data
}

export function generateEmailStream({ prompt, tone, model, onSubject, onBodyChunk, onDone, onError }) {
  const url = `${BASE}/api/generate/stream`
  const ctrl = new AbortController()
  const token = localStorage.getItem('token')

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ prompt, tone, model }),
    signal: ctrl.signal,
  }).then(async res => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      onError(err?.detail || `Server error ${res.status}`)
      return
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const parsed = JSON.parse(line.slice(6))
          if (parsed.type === 'subject') onSubject(parsed.content)
          else if (parsed.type === 'body') onBodyChunk(parsed.content)
          else if (parsed.type === 'done') onDone(parsed.id)
          else if (parsed.type === 'error') onError(parsed.content)
        } catch {}
      }
    }
  }).catch(err => { if (err.name !== 'AbortError') onError(err.message) })

  return () => ctrl.abort()
}

export async function fetchHistory() {
  const { data } = await api.get('/api/history')
  return data
}
export async function clearHistory() {
  const { data } = await api.delete('/api/history')
  return data
}
export async function fetchModels() {
  const { data } = await api.get('/api/models')
  return data
}
