import { useState, useEffect } from 'react'
import { Plus, Trash2, Video } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

const STREAMS_STORAGE_KEY = 'showmonitor-rtsp-streams'

function loadStoredStreams(): string[] {
  try {
    const raw = localStorage.getItem(STREAMS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : []
  } catch {
    return []
  }
}

function saveStreams(streams: string[]) {
  localStorage.setItem(STREAMS_STORAGE_KEY, JSON.stringify(streams))
}

function streamLabel(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname + (u.pathname !== '/' ? u.pathname : '')
  } catch {
    return url.slice(0, 40) + (url.length > 40 ? '…' : '')
  }
}

export function VideoStreams() {
  const [streams, setStreams] = useState<string[]>(loadStoredStreams)
  const [input, setInput] = useState('')

  useEffect(() => {
    saveStreams(streams)
  }, [streams])

  const addStream = () => {
    const trimmed = input.trim()
    if (!trimmed || streams.includes(trimmed)) return
    setStreams((prev) => [...prev, trimmed])
    setInput('')
  }

  const removeStream = (url: string) => {
    setStreams((prev) => prev.filter((s) => s !== url))
  }

  const isRtsp = (url: string) => /^rtsp:\/\//i.test(url)
  const proxyUrl = (url: string) =>
    `/api/stream?url=${encodeURIComponent(url)}`

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Video Streams</span>
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="url"
            placeholder="rtsp:// or http(s):// stream URL"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addStream()}
            className="min-w-0 flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={addStream}
            className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 overflow-auto p-3 pt-0">
        {streams.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Add RTSP or HTTP stream URLs to monitor.
          </p>
        ) : (
          streams.map((url) => (
            <div
              key={url}
              className="rounded-lg border bg-muted/30 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 border-b bg-muted/50 px-2 py-1">
                <span className="truncate text-xs text-muted-foreground" title={url}>
                  {streamLabel(url)}
                </span>
                <button
                  type="button"
                  onClick={() => removeStream(url)}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                  aria-label="Remove stream"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="relative aspect-video bg-black">
                {isRtsp(url) ? (
                  <img
                    src={proxyUrl(url)}
                    alt=""
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      const el = e.currentTarget
                      el.style.display = 'none'
                      const fallback = el.nextElementSibling as HTMLElement | null
                      if (fallback) fallback.hidden = false
                    }}
                  />
                ) : (
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      const el = e.currentTarget
                      el.style.display = 'none'
                      const fallback = el.nextElementSibling as HTMLElement | null
                      if (fallback) fallback.hidden = false
                    }}
                  />
                )}
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black text-xs text-muted-foreground"
                  hidden
                  aria-hidden
                >
                  Stream unavailable
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
