import { useCallback, useEffect, useState } from 'react'
import { DeviceCard } from '@/components/DeviceCard'
import type { DeviceStatus } from '@/components/DeviceCard'

const LATENCY_HISTORY_SIZE = 20

interface StatusResponse {
  devices: DeviceStatus[]
}

function App() {
  const [devices, setDevices] = useState<DeviceStatus[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [latencyHistory, setLatencyHistory] = useState<
    Record<string, (number | null)[]>
  >({})

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status')
      if (!res.ok) throw new Error('Failed to fetch')
      const data: StatusResponse = await res.json()
      setDevices(data.devices)
      setError(null)
      setLatencyHistory((prev) => {
        const next = { ...prev }
        for (const d of data.devices) {
          const value = d.status === 'up' && d.latency != null ? d.latency : null
          const arr = [...(next[d.host] ?? []), value].slice(-LATENCY_HISTORY_SIZE)
          next[d.host] = arr
        }
        return next
      })
    } catch {
      setError('Backend unavailable')
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">ShowMonitor</h1>
        <p className="text-sm text-muted-foreground">
          Ping monitoring dashboard
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {devices === null && !error ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border bg-card"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {devices?.map((device) => (
            <DeviceCard
              key={device.host}
              device={device}
              latencyHistory={latencyHistory[device.host] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default App
