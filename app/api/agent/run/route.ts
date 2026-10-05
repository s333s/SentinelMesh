import { z } from 'zod'
import { runAgent } from '@/lib/sentinel/store'

export const maxDuration = 30

const sources = [
  'external_email',
  'external_sms',
  'shared_document',
  'external_voice',
  'local_user',
  'trusted_schedule',
  'admin_console',
  'partner_api',
] as const

const bodySchema = z.union([
  z.object({ scenarioId: z.string().max(64), useAI: z.boolean() }),
  z.object({
    useAI: z.boolean(),
    custom: z.object({
      message: z.object({
        channel: z.string().max(32),
        from: z.string().min(1).max(160),
        subject: z.string().max(200).optional(),
        body: z.string().min(1).max(2000),
      }),
      source: z.enum(sources),
      senderTrust: z.enum(['spoofed', 'unknown', 'known', 'trusted', 'verified']),
      context: z.object({
        time: z.string().regex(/^\d{2}:\d{2}$/),
        user_present: z.boolean(),
        approved_delivery_window: z.boolean().optional(),
      }),
    }),
  }),
])

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })
  try {
    return Response.json(await runAgent(parsed.data))
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 })
  }
}
