import type { DeviceId, DeviceState, SenderTrust, Source, ToolCallArgs, ToolName } from './types'

export interface ToolSpec {
  name: ToolName
  device: DeviceId
  label: string
  severity: number
  readOnly?: boolean
  apply: (state: DeviceState, args: ToolCallArgs) => DeviceState
  consequence: (args: ToolCallArgs) => string
}

const minutes = (args: ToolCallArgs) =>
  args.duration ? ` for ${Math.round(args.duration / 60)} minute${args.duration >= 120 ? 's' : ''}` : ''

export const TOOLS: Record<ToolName, ToolSpec> = {
  unlock_front_door: {
    name: 'unlock_front_door',
    device: 'front_door',
    label: 'Unlock front door',
    severity: 0.95,
    apply: (s) => ({ ...s, front_door: 'UNLOCKED' }),
    consequence: (a) => `The front door would have been unlocked${minutes(a)}, giving physical access to the building.`,
  },
  lock_front_door: {
    name: 'lock_front_door',
    device: 'front_door',
    label: 'Lock front door',
    severity: 0.05,
    apply: (s) => ({ ...s, front_door: 'LOCKED' }),
    consequence: () => 'The front door would have been locked.',
  },
  open_garage: {
    name: 'open_garage',
    device: 'garage',
    label: 'Open garage',
    severity: 0.75,
    apply: (s) => ({ ...s, garage: 'OPEN' }),
    consequence: (a) => `The garage would have opened${minutes(a)}, exposing vehicles and an interior entry point.`,
  },
  close_garage: {
    name: 'close_garage',
    device: 'garage',
    label: 'Close garage',
    severity: 0.05,
    apply: (s) => ({ ...s, garage: 'CLOSED' }),
    consequence: () => 'The garage would have closed.',
  },
  disable_alarm: {
    name: 'disable_alarm',
    device: 'alarm',
    label: 'Disable alarm',
    severity: 0.98,
    apply: (s) => ({ ...s, alarm: 'DISARMED' }),
    consequence: (a) => `The intrusion alarm would have been disarmed${minutes(a)}, so a break-in would go unreported.`,
  },
  arm_alarm: {
    name: 'arm_alarm',
    device: 'alarm',
    label: 'Arm alarm',
    severity: 0.05,
    apply: (s) => ({ ...s, alarm: 'ARMED' }),
    consequence: () => 'The alarm would have been armed.',
  },
  disable_camera: {
    name: 'disable_camera',
    device: 'camera',
    label: 'Disable security camera',
    severity: 0.9,
    apply: (s) => ({ ...s, camera: 'OFFLINE' }),
    consequence: (a) => `The security camera would have gone offline${minutes(a)}, leaving no recording of who entered.`,
  },
  enable_camera: {
    name: 'enable_camera',
    device: 'camera',
    label: 'Enable security camera',
    severity: 0.05,
    apply: (s) => ({ ...s, camera: 'ONLINE' }),
    consequence: () => 'The security camera would have come back online.',
  },
  check_camera_status: {
    name: 'check_camera_status',
    device: 'camera',
    label: 'Check camera status',
    severity: 0.05,
    readOnly: true,
    apply: (s) => s,
    consequence: () => 'A read-only health check would have run on the camera.',
  },
  lights_on: {
    name: 'lights_on',
    device: 'lights',
    label: 'Turn lights on',
    severity: 0.05,
    apply: (s) => ({ ...s, lights: 'ON' }),
    consequence: () => 'The lights would have turned on.',
  },
  lights_off: {
    name: 'lights_off',
    device: 'lights',
    label: 'Turn lights off',
    severity: 0.05,
    apply: (s) => ({ ...s, lights: 'OFF' }),
    consequence: () => 'The lights would have turned off.',
  },
  set_thermostat: {
    name: 'set_thermostat',
    device: 'thermostat',
    label: 'Set thermostat',
    severity: 0.15,
    apply: (s, a) => ({ ...s, thermostat: typeof a.target === 'number' ? a.target : s.thermostat }),
    consequence: (a) => `The thermostat would have been set to ${a.target ?? '?'} °C.`,
  },
}

export const TOOL_NAMES = Object.keys(TOOLS) as ToolName[]

export const INITIAL_DEVICES: DeviceState = {
  front_door: 'LOCKED',
  garage: 'CLOSED',
  alarm: 'ARMED',
  camera: 'ONLINE',
  lights: 'OFF',
  thermostat: 23,
}

export const DEVICE_LABELS: Record<DeviceId, string> = {
  front_door: 'Front Door',
  garage: 'Garage',
  alarm: 'Alarm',
  camera: 'Security Camera',
  lights: 'Lights',
  thermostat: 'Thermostat',
}

export const EXTERNAL_SOURCES: Source[] = ['external_email', 'external_sms', 'shared_document', 'external_voice']

export const SOURCE_LABELS: Record<Source, string> = {
  external_email: 'External Email',
  external_sms: 'External SMS',
  shared_document: 'Shared Document',
  external_voice: 'External Voicemail',
  local_user: 'Verified App User',
  trusted_schedule: 'Trusted Schedule',
  admin_console: 'Admin Console',
  partner_api: 'Partner API',
}

export const TRUST_RISK: Record<SenderTrust, number> = {
  spoofed: 0.95,
  unknown: 0.8,
  known: 0.4,
  trusted: 0.12,
  verified: 0.02,
}

export const isExternal = (source: Source) => EXTERNAL_SOURCES.includes(source)
