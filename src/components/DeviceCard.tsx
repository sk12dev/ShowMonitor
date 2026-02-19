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

const SPARKLINE_WIDTH = 120
const SPARKLINE_HEIGHT = 28
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {isUp ? (
            <Wifi className="h-5 w-5 text-emerald-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-destructive" />
          )}
          <span className="font-semibold">{device.name}</span>
        </div>
        <Badge variant={isUp ? 'success' : 'destructive'}>
          {isUp ? 'Up' : 'Down'}
        </Badge>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground">{device.host}</p>
        {isUp && device.latency !== undefined && (
          <p className="mt-1 text-xs text-muted-foreground">
            {device.latency} ms latency
          </p>
        )}
        {latencyHistory.length >= 2 && (
          <div className="mt-2">
            <Sparkline history={latencyHistory} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
