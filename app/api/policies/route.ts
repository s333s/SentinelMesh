import { z } from 'zod'
import { setPolicyEnabled } from '@/lib/sentinel/store'

const bodySchema = z.object({ id: z.string().max(64), enabled: z.boolean() })

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })
  try {
    return Response.json(setPolicyEnabled(parsed.data.id, parsed.data.enabled))
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 404 })
  }
}
