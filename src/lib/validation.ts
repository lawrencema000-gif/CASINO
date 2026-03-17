import { z } from 'zod'

export const betSchema = z.object({
  gameType: z.string().min(1),
  betAmount: z.number().int().min(10).max(100000),
  clientSeed: z.string().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
  demoMode: z.boolean().optional(),
})

export const usernameSchema = z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/)
export const emailSchema = z.string().email()
export const passwordSchema = z.string().min(8).max(128)

export const depositSchema = z.object({
  action: z.literal('deposit'),
  amount: z.number().int().min(100).max(1000000),
})

export const withdrawSchema = z.object({
  action: z.literal('withdraw'),
  amount: z.number().int().min(100),
})

export const supportTicketSchema = z.object({
  category: z.enum(['account', 'payment', 'game', 'technical', 'other']),
  subject: z.string().min(5).max(200),
  message: z.string().min(10).max(5000),
  priority: z.enum(['low', 'medium', 'high']).optional(),
})

export type BetInput = z.infer<typeof betSchema>
export type DepositInput = z.infer<typeof depositSchema>
export type WithdrawInput = z.infer<typeof withdrawSchema>
export type SupportTicketInput = z.infer<typeof supportTicketSchema>
