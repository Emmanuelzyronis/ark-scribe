const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

class ApiError extends Error {
  constructor(public status: number, message: string, public data?: unknown) {
    super(message)
    this.name = 'ApiError'
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ark_token')
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: response.statusText }))
    throw new ApiError(response.status, data.error || `HTTP ${response.status}`, data)
  }

  if (response.status === 204) return {} as T

  return response.json()
}

// Auth
export const auth = {
  register: (data: { email: string; password: string; full_name: string; specialty?: string; practice_name?: string }) =>
    request<{ token: string; physician: unknown }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; physician: unknown }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => request<{ physician: unknown }>('/api/auth/me'),

  updateProfile: (data: Record<string, unknown>) =>
    request<{ physician: unknown }>('/api/physicians/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

// Encounters
export const encounters = {
  list: (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString() : ''
    return request<{ data: unknown[]; total: number; page: number; per_page: number; has_more: boolean }>(`/api/encounters${qs}`)
  },

  create: (data?: { title?: string; patient_ref?: string }) =>
    request<{ encounter: unknown; assemblyai_token: string }>('/api/encounters', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  get: (id: string) =>
    request<{ encounter: unknown; transcript: unknown; soap_note: unknown }>(`/api/encounters/${id}`),

  update: (id: string, data: Record<string, unknown>) =>
    request<{ encounter: unknown }>(`/api/encounters/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/api/encounters/${id}`, { method: 'DELETE' }),

  finalizeTranscript: (id: string, data: { raw_text: string; words?: unknown[] }) =>
    request<{ transcript: unknown; redaction_summary: unknown }>(`/api/encounters/${id}/transcript/finalize`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTranscript: (id: string) =>
    request<{ transcript: unknown }>(`/api/encounters/${id}/transcript`),

  generateNote: (id: string, transcript_text: string, specialty?: string) =>
    request<{ soap_note: unknown; generation_ms: number }>(`/api/encounters/${id}/note/generate`, {
      method: 'POST',
      body: JSON.stringify({ transcript_text, ...(specialty ? { specialty } : {}) }),
    }),

  getNote: (id: string) =>
    request<{ soap_note: unknown }>(`/api/encounters/${id}/note`),

  updateNote: (id: string, data: Record<string, string>) =>
    request<{ soap_note: unknown }>(`/api/encounters/${id}/note`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  rewriteSection: (id: string, data: { section: string; current_text: string; instruction?: string }) =>
    request<{ soap_note: unknown; rewritten_text: string }>(`/api/encounters/${id}/note/section/rewrite`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  exportNote: (id: string, format: string) =>
    request<{ formatted_note: string; format: string }>(`/api/encounters/${id}/note/export`, {
      method: 'POST',
      body: JSON.stringify({ format }),
    }),
}

// Vocabulary
export const vocabulary = {
  list: () => request<{ data: unknown[] }>('/api/vocabulary'),
  create: (data: { term: string; specialty?: string; phonetic_hint?: string; context_hint?: string }) =>
    request<{ vocabulary: unknown }>('/api/vocabulary', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/api/vocabulary/${id}`, { method: 'DELETE' }),
}

// Audit
export const audit = {
  list: (params?: { page?: number; limit?: number }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString() : ''
    return request<{ data: unknown[]; total: number }>(`/api/audit${qs}`)
  },
}

export { ApiError }
export default { auth, encounters, vocabulary, audit }
