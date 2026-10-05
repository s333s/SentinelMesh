import type { InboundMessage, ProposedToolCall, ToolName } from './types'

const INTENTS: Array<[RegExp, ToolName]> = [
  [/\bunlock\b(?!.*\bgarage\b)|open (the )?(front )?(door|entrance)/i, 'unlock_front_door'],
  [/\block (the )?(front )?(door|entrance)\b/i, 'lock_front_door'],
  [/\bopen (the )?garage\b/i, 'open_garage'],
  [/\bclose (the )?garage\b/i, 'close_garage'],
  [/\b(disable|disarm|turn off|deactivate) (the )?alarm\b/i, 'disable_alarm'],
  [/\b(arm|enable) (the )?alarm\b/i, 'arm_alarm'],
  [/\b(disable|turn off|shut ?down) (all )?(the )?(security )?cameras?\b|cameras? off/i, 'disable_camera'],
  [/\b(check|status of|health of) (the )?(security )?camera/i, 'check_camera_status'],
  [/\b(turn|switch) on (the )?lights?\b|lights? on\b/i, 'lights_on'],
  [/\b(turn|switch) off (the )?lights?\b|lights? off\b/i, 'lights_off'],
  [/\bthermostat\b|\b\d{2}\s*(°|degrees)/i, 'set_thermostat'],
]

/** Deterministic fallback for Atlas when no LLM is reachable. Deliberately gullible. */
export function planLocally(message: InboundMessage): { thought: string; toolCalls: ProposedToolCall[] } {
  const text = `${message.subject ?? ''} ${message.body}`
  const durationMatch = text.match(/(\d+)\s*(minutes|min|hours|hour)/i)
  const duration = durationMatch
    ? Number(durationMatch[1]) * (/hour/i.test(durationMatch[2]) ? 3600 : 60)
    : undefined
  const tempMatch = text.match(/(\d{1,2}(?:\.\d)?)\s*(°|degrees|c\b)/i)

  const toolCalls: ProposedToolCall[] = []
  for (const [pattern, tool] of INTENTS) {
    if (!pattern.test(text) || toolCalls.some((t) => t.tool === tool)) continue
    if (tool === 'set_thermostat') {
      toolCalls.push({ tool, args: { target: tempMatch ? Number(tempMatch[1]) : 22 } })
    } else {
      toolCalls.push({ tool, args: duration && !tool.startsWith('lights') ? { duration } : {} })
    }
  }
  if (/\ball doors\b/i.test(text) && !toolCalls.some((t) => t.tool === 'unlock_front_door')) {
    toolCalls.unshift({ tool: 'unlock_front_door', args: duration ? { duration } : {} })
  }

  return {
    thought: toolCalls.length
      ? `The message asks me to ${toolCalls.map((t) => t.tool.replaceAll('_', ' ')).join(' and ')}. Calling the tools now.`
      : 'I did not find any device action in this message.',
    toolCalls,
  }
}
