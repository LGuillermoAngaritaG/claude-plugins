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
}

declare module 'claude-code' {
  interface PluginState {
    'status-bar': { snap: Snapshot | null }
  }
}
