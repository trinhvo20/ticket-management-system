import { Role } from '../schemas/user'

export const AI_AGENT_EMAIL = 'ai@system.local'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
}
