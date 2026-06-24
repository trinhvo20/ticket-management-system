import axios from 'axios'
import { QueryClient } from '@tanstack/react-query'
import { Role } from '@ticket/core'

const BASE = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001'

export const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error ?? err.message
    return Promise.reject(new Error(message))
  },
)

export const queryClient = new QueryClient()

export interface User {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
}

export const userKeys = {
  all: ['users'] as const,
}

export async function getUsers(): Promise<User[]> {
  const { data } = await api.get<{ users: User[] }>('/api/users')
  return data.users
}

export async function createUser(payload: {
  name: string
  email: string
  password: string
  role: Role
}): Promise<User> {
  const { data } = await api.post<{ user: User }>('/api/users', payload)
  return data.user
}

export async function updateUser(
  id: string,
  payload: { name: string; email: string; role: Role; password?: string }
): Promise<User> {
  const { data } = await api.patch<{ user: User }>(`/api/users/${id}`, payload)
  return data.user
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/api/users/${id}`)
}
