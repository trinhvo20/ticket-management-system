import { Role } from '../schemas/user'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
}
