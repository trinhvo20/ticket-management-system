const BASE = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  if (res.status === 204) return undefined as T

  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? `Request failed: ${res.status}`)
  return body
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'agent'
  createdAt: string
}

export function getUsers(): Promise<{ users: User[] }> {
  return request('/api/users')
}

export function createUser(data: {
  name: string
  email: string
  password: string
  role: 'admin' | 'agent'
}): Promise<{ user: User }> {
  return request('/api/users', { method: 'POST', body: JSON.stringify(data) })
}

export function deleteUser(id: string): Promise<void> {
  return request(`/api/users/${id}`, { method: 'DELETE' })
}
