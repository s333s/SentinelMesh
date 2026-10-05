import { Bell, Camera, DoorClosed, Lightbulb, Thermometer, Warehouse, type LucideIcon } from 'lucide-react'
import type { DeviceId, DeviceState } from '@/lib/sentinel/types'
import { DEVICE_LABELS } from '@/lib/sentinel/catalog'
import { Panel } from './panel'

const ICONS: Record<DeviceId, LucideIcon> = {
  front_door: DoorClosed,
  garage: Warehouse,
  alarm: Bell,
  camera: Camera,
  lights: Lightbulb,
  thermostat: Thermometer,
}

const SECURE: Record<Exclude<DeviceId, 'thermostat' | 'lights'>, string> = {
  front_door: 'LOCKED',
  garage: 'CLOSED',
  alarm: 'ARMED',
  camera: 'ONLINE',
}

function tone(id: DeviceId, value: string | number) {
  if (id === 'thermostat' || id === 'lights') return 'text-foreground'
  return SECURE[id] === value ? 'text-safe' : 'text-danger'
}

export function DevicePanel({ devices }: { devices: DeviceState }) {
  const ids = Object.keys(DEVICE_LABELS) as DeviceId[]
  const exposed = ids.filter((id) => id in SECURE && SECURE[id as keyof typeof SECURE] !== devices[id]).length
  return (
    <Panel
      id="devices"
      title="Smart home"
      description="Simulated devices. Only the gateway executor can change state."
      action={
        <span className={`font-mono text-xs ${exposed ? 'text-danger' : 'text-safe'}`}>
          {exposed ? `${exposed} exposed` : 'Secure'}
        </span>
      }
    >
      <ul className="grid grid-cols-2 gap-2">
        {ids.map((id) => {
          const Icon = ICONS[id]
          const value = devices[id]
          return (
            <li key={id} className="flex items-center gap-3 rounded-md border border-border bg-background/40 p-3">
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{DEVICE_LABELS[id]}</p>
                <p className={`font-mono text-sm font-medium transition-colors ${tone(id, value)}`}>
                  {id === 'thermostat' ? `${value}°C` : value}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
