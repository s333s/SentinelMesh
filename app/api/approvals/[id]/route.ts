import { z } from 'zod'
import { resolveApproval } from '@/lib/sentinel/store'

const bodySchema = z.object({ action: z.enum(['approve', 'block']) })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  const eventId = Number.parseInt(id, 10)
  if (!parsed.success || !Number.isFinite(eventId)) return Response.json({ error: 'Invalid request' }, { status: 400 })
  try {
    return Response.json(resolveApproval(eventId, parsed.data.action))
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 409 })
  }
}
