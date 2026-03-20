import { Wifi, WifiOff } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface DeviceStatus {
  name: string
  host: string
  status: 'up' | 'down'
  latency?: number
}

interface DeviceCardProps {
  device: DeviceStatus
  latencyHistory: (number | null)[]
}

const SPARKLINE_WIDTH = 80
const SPARKLINE_HEIGHT = 20
const LATENCY_SCALE_MAX_MS = 100

function Sparkline({ history }: { history: (number | null)[] }) {
  if (history.length < 2) return null

  const values = history.map((v) => (v === null ? 0 : v))
  const maxVal = Math.max(LATENCY_SCALE_MAX_MS, ...values.filter((v) => v > 0), 1)
  const points = values.map((val, i) => {
    const x = (i / (history.length - 1)) * SPARKLINE_WIDTH
    const y = SPARKLINE_HEIGHT - (val / maxVal) * SPARKLINE_HEIGHT
    return `${x},${y}`
  })
  const pathD = `M ${points.join(' L ')}`

  return (
    <svg
      width={SPARKLINE_WIDTH}
      height={SPARKLINE_HEIGHT}
      className="overflow-visible"
      aria-hidden
    >
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-muted-foreground/60"
      />
    </svg>
  )
}

export function DeviceCard({ device, latencyHistory }: DeviceCardProps) {
  const isUp = device.status === 'up'

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
        <div className="flex items-center gap-1.5">
          {isUp ? (
            <Wifi className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <WifiOff className="h-4 w-4 shrink-0 text-destructive" />
          )}
          <span className="text-sm font-semibold leading-tight">{device.name}</span>
        </div>
        <Badge variant={isUp ? 'success' : 'destructive'} className="text-xs">
          {isUp ? 'Up' : 'Down'}
        </Badge>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <p className="text-xs text-muted-foreground">{device.host}</p>
        {isUp && device.latency !== undefined && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {device.latency} ms
          </p>
        )}
        {latencyHistory.length >= 2 && (
          <div className="mt-1.5">
            <Sparkline history={latencyHistory} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
