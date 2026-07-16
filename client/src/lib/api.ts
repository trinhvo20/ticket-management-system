import axios from 'axios'
import { QueryClient } from '@tanstack/react-query'
import { Role, TicketStatus, TicketCategory, type Ticket, type TicketDetail, type TicketQueryParams, type TicketPage, type TicketReply, type Agent } from '@ticket/core'

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

export type { Ticket, TicketDetail, TicketQueryParams, TicketPage, TicketReply, Agent }

export const agentKeys = {
  all: ['agents'] as const,
}

export const ticketKeys = {
  all: ['tickets'] as const,
  list: (params: TicketQueryParams) => ['tickets', 'list', params] as const,
  detail: (id: number) => ['tickets', 'detail', id] as const,
}

export const replyKeys = {
  all: (ticketId: number) => ['tickets', ticketId, 'replies'] as const,
}

export async function getAgents(): Promise<Agent[]> {
  const { data } = await api.get<{ agents: Agent[] }>('/api/users/agents')
  return data.agents
}

export async function updateTicket(
  id: number,
  payload: { status?: TicketStatus; category?: TicketCategory | null; assignedToId?: string | null }
): Promise<void> {
  await api.patch(`/api/tickets/${id}`, payload)
}

export async function getTicket(id: number): Promise<TicketDetail> {
  const { data } = await api.get<{ ticket: TicketDetail }>(`/api/tickets/${id}`)
  return data.ticket
}

export async function getReplies(ticketId: number): Promise<TicketReply[]> {
  const { data } = await api.get<TicketReply[]>(`/api/tickets/${ticketId}/replies`)
  return data
}

export async function createReply(ticketId: number, body: string): Promise<TicketReply> {
  const { data } = await api.post<TicketReply>(`/api/tickets/${ticketId}/replies`, { body })
  return data
}

export async function getTickets(params: TicketQueryParams = {}): Promise<TicketPage> {
  const { data } = await api.get<TicketPage>('/api/tickets', {
    params: {
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      status: params.status,
      category: params.category,
      search: params.search,
      page: params.page,
      pageSize: params.pageSize,
    },
  })
  return data
}
