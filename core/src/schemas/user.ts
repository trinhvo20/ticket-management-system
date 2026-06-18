import { z } from 'zod'

export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.email('Invalid email address'),
  password: z.string().trim().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'agent']),
})

export type CreateUserInput = z.infer<typeof createUserSchema>

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.email('Invalid email address'),
  role: z.enum(['admin', 'agent']),
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.trim().length >= 8, {
      message: 'Password must be at least 8 characters',
    }),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>
