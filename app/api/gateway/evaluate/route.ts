import { z } from 'zod'
import { TOOL_NAMES } from '@/lib/sentinel/catalog'
import { dryRun } from '@/lib/sentinel/store'
import type { ToolName } from '@/lib/sentinel/types'

const bodySchema = z.object({
  tool: z.enum(TOOL_NAMES as [ToolName, ...ToolName[]]),
  source: z.enum(['external_email', 'external_sms', 'shared_document', 'external_voice', 'local_user', 'trusted_schedule', 'admin_console', 'partner_api']),
  senderTrust: z.enum(['spoofed', 'unknown', 'known', 'trusted', 'verified']),
  context: z.object({ time: z.string().regex(/^\d{2}:\d{2}$/), user_present: z.boolean() }),
})

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })
  return Response.json(dryRun(parsed.data))
}
