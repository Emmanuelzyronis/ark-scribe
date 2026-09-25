'use client'

import { useState, useEffect, useCallback } from 'react'
import { auth } from '../lib/api'

interface Physician {
  id: string
  email: string
  full_name: string
  specialty?: string
  practice_name?: string
  ehr_preference: string
  custom_vocab_enabled: boolean
  created_at: string
  updated_at: string
}

interface AuthState {
  physician: Physician | null
  token: string | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    physician: null,
    token: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const token = localStorage.getItem('ark_token')
    const stored = localStorage.getItem('ark_physician')

    if (token && stored) {
      try {
        const physician = JSON.parse(stored) as Physician
        setState({ physician, token, loading: false, error: null })
        // Validate token in background
        auth.me().then(({ physician: fresh }) => {
          setState(s => ({ ...s, physician: fresh as Physician }))
          localStorage.setItem('ark_physician', JSON.stringify(fresh))
        }).catch(() => {
          // Token expired
          localStorage.removeItem('ark_token')
          localStorage.removeItem('ark_physician')
          setState({ physician: null, token: null, loading: false, error: null })
        })
      } catch {
        setState({ physician: null, token: null, loading: false, error: null })
      }
    } else {
      setState(s => ({ ...s, loading: false }))
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const { token, physician } = await auth.login({ email, password })
      localStorage.setItem('ark_token', token)
      localStorage.setItem('ark_physician', JSON.stringify(physician))
      setState({ physician: physician as Physician, token, loading: false, error: null })
      return true
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: (err as Error).message }))
      return false
    }
  }, [])

  const register = useCallback(async (data: {
    email: string
    password: string
    full_name: string
    specialty?: string
    practice_name?: string
  }) => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const { token, physician } = await auth.register(data)
      localStorage.setItem('ark_token', token)
      localStorage.setItem('ark_physician', JSON.stringify(physician))
      setState({ physician: physician as Physician, token, loading: false, error: null })
      return true
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: (err as Error).message }))
      return false
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('ark_token')
    localStorage.removeItem('ark_physician')
    setState({ physician: null, token: null, loading: false, error: null })
    window.location.href = '/login'
  }, [])

  return { ...state, login, register, logout }
}
