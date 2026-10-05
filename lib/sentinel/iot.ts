import { TOOLS } from './catalog'
import type { DeviceState, ToolCall } from './types'

/**
 * Device adapters only accept commands that carry a gateway authorization.
 * Atlas never holds a reference to an adapter; only the SentinelMesh
 * gateway (store.ts) can call execute().
 */
export interface GatewayAuthorization {
  eventId: number
  decision: 'ALLOW' | 'APPROVED'
}

export interface DeviceAdapter {
  name: string
  execute(state: DeviceState, call: ToolCall, auth: GatewayAuthorization): DeviceState
}

export const simulatorAdapter: DeviceAdapter = {
  name: 'browser-simulator',
  execute(state, call, auth) {
    if (auth.decision !== 'ALLOW' && auth.decision !== 'APPROVED') {
      throw new Error('Unauthorized device command rejected by adapter')
    }
    return TOOLS[call.tool].apply(state, call.args)
  },
}
