export type Limit = { label: string; pct: number; resetsAt: number }

export type Snapshot = {
  model: string
  dir: string
  branch: string | null
  add: number
  del: number
  usd: number
  now: number
  startedAt: number
  pct: number
  window: number
  limits: Limit[]
  // When the main thread's last request started, and what re-caching its context would cost.
  cache: { at: number; usd: number } | null
}

declare module 'claude-code' {
  interface PluginState {
    'status-bar': { snap: Snapshot | null }
  }
}
