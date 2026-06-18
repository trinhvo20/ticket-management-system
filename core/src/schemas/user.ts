import { z } from 'zod'

export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.email('Invalid email address'),
  password: z.string().trim().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'agent']),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
