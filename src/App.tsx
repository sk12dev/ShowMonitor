import { useCallback, useEffect, useState } from "react";
import { DeviceCard } from "@/components/DeviceCard";
import type { DeviceStatus } from "@/components/DeviceCard";
import { VideoStreams } from "@/components/VideoStreams";

const LATENCY_HISTORY_SIZE = 20;

interface StatusResponse {
  devices: DeviceStatus[];
}

function App() {
  const [devices, setDevices] = useState<DeviceStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latencyHistory, setLatencyHistory] = useState<
    Record<string, (number | null)[]>
  >({});
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) throw new Error("Failed to fetch");
      const data: StatusResponse = await res.json();
      setDevices(data.devices);
      setError(null);
      setLatencyHistory((prev) => {
        const next = { ...prev };
        for (const d of data.devices) {
          const value =
            d.status === "up" && d.latency != null ? d.latency : null;
          const arr = [...(next[d.host] ?? []), value].slice(
            -LATENCY_HISTORY_SIZE,
          );
          next[d.host] = arr;
        }
        return next;
      });
    } catch {
      setError("Backend unavailable");
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return (
    <div className="min-h-screen bg-background p-4">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">ShowMonitor</h1>
          <p className="text-xs text-muted-foreground">
            Ping monitoring dashboard
          </p>
        </div>
        <div className="text-right text-xs font-medium tabular-nums text-muted-foreground">
          {now.toLocaleDateString(undefined, {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
          <br />
          {now.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })}
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid min-h-[calc(100vh-7rem)] grid-cols-2 gap-4 md:grid-cols-[1fr,minmax(320px,400px)] md:items-stretch">
        <div className="min-w-0 space-y-2 md:overflow-auto">
          {devices === null && !error ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl border bg-card"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
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
        <div className="flex min-h-[400px] flex-col md:min-h-0">
          <VideoStreams />
        </div>
      </div>
    </div>
  );
}

export default App;
