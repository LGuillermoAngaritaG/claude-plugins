import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Limit, Snapshot } from '../types'

const snap = atom({ plugin: 'status-bar', key: 'snap' } as const, null)

const ORANGE = '#ff8700'
const LABELS: Record<string, string> = { five_hour: '5h', seven_day: '7d' }

// A row is parts two cells apart; a part is groups one cell apart; a group is
// colored segments with nothing between. A narrow band drops the lowest `keep` first.
type Seg = readonly [text: string, color?: string]
export type Part = { keep: number; groups: Seg[][] }

const seg = (text: string, color?: string): Seg => [text, color]
const part = (keep: number, ...groups: Seg[][]): Part => ({ keep, groups })

export const modelName = (id: string) =>
  id.replace(
    /^claude-([a-z])([a-z]*)-(\d+)-(\d{1,2})(-\d{8})?/,
    (_, first: string, rest: string, major: string, minor: string) =>
      `${first.toUpperCase()}${rest} ${major}.${minor}`,
  )

export const fmtTokens = (n: number) => {
  const short = (v: number) => v.toFixed(1).replace(/\.0$/, '')

  return n >= 1e6 ? `${short(n / 1e6)}M` : n >= 1000 ? `${short(n / 1000)}k` : `${n}`
}

export const fmtUntil = (seconds: number) => {
  if (seconds <= 0) return 'now'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)

  return d > 0 ? `${d}d${h}h` : h > 0 ? `${h}h${m}m` : `${m}m`
}

export const fmtTimer = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const mm = Math.floor((seconds % 3600) / 60)
  const ss = String(Math.floor(seconds % 60)).padStart(2, '0')

  return h > 0 ? `${h}:${String(mm).padStart(2, '0')}:${ss}` : `${mm}:${ss}`
}

export const pctColor = (pct: number) => (pct >= 90 ? 'red' : pct >= 70 ? 'yellow' : 'green')

export const bar = (pct: number, width: number) => {
  const filled = Math.max(0, Math.min(width, Math.floor((pct * width) / 100)))

  return ['█'.repeat(filled), '░'.repeat(width - filled)] as const
}

// ponytail: counts an astral character (the folder icon) as two cells and the rest as one; exact only in a fixed-width font
const cells = (text: string) =>
  [...text].reduce((n, ch) => n + ((ch.codePointAt(0) ?? 0) > 0xffff ? 2 : 1), 0)

const width = (one: Part) =>
  one.groups.reduce((n, group) => n + 1 + group.reduce((m, [text]) => m + cells(text), 0), -1)

export const fit = (parts: Part[], columns: number): Part[] => {
  const total = parts.reduce((n, one) => n + 2 + width(one), -2)

  if (total <= columns || parts.length <= 1) return parts
  const weakest = parts.reduce((a, b) => (b.keep < a.keep ? b : a))

  return fit(
    parts.filter(one => one !== weakest),
    columns,
  )
}

export const rows = (s: Snapshot): Part[][] => {
  const [fill, pad] = bar(s.pct, 10)
  const diff =
    s.add > 0 || s.del > 0 ? [[seg(`+${s.add}`, 'green'), seg('/', 'gray'), seg(`-${s.del}`, 'red')]] : []

  return [
    [
      part(5, [seg(s.model, /opus|1m/i.test(s.model) ? ORANGE : 'cyan')]),
      part(2, [seg('📁', 'gray')], [seg(s.dir)]),
      ...(s.branch === null ? [] : [part(3, [seg('⎇', 'gray')], [seg(s.branch, 'magenta')], ...diff)]),
      part(4, [seg(`$${s.usd.toFixed(2)}`, 'yellow')]),
      part(1, [seg(fmtTimer((s.now - s.startedAt) / 1000), 'gray')]),
    ],
    [
      part(5, [seg(fill, pctColor(s.pct)), seg(pad, 'gray')]),
      part(6, [seg(`${s.pct}%`)]),
      part(2, [seg(`${fmtTokens(Math.floor((s.window * s.pct) / 100))}/${fmtTokens(s.window)}`)]),
      ...s.limits.map((one, index) => {
        const [used, free] = bar(one.pct, 5)

        return part(
          4 - index,
          [seg(`· ${one.label}`, 'gray')],
          [seg(used, pctColor(one.pct)), seg(free, 'gray')],
          [seg(`${one.pct}%`, pctColor(one.pct))],
          [seg(`↻${fmtUntil((one.resetsAt - s.now) / 1000)}`, 'gray')],
        )
      }),
    ],
  ]
}

// A toast in the app plus a desktop notification: terminal-notifier when it is installed
// (it keeps one notification per group instead of a pile), else macOS's own osascript.
// On other systems only the toast shows.
const notify = async ($: EngineInterface, group: string, text: string, sound: string) => {
  $.ui.toast(text)
  const dir = (await read($, snap))?.dir ?? ''
  const isSent = await $.process
    .run(['terminal-notifier', '-title', 'Claude Code', '-subtitle', dir, '-message', text, '-sound', sound, '-group', `claude-${group}`])
    .then(
      ran => ran.exitCode === 0,
      () => false,
    )

  if (!isSent) {
    const script = `display notification ${JSON.stringify(text)} with title "Claude Code" subtitle ${JSON.stringify(dir)} sound name ${JSON.stringify(sound)}`
    await $.process.run(['osascript', '-e', script]).catch(() => undefined)
  }
}

let lastAskAt = 0

// A question dialog can also raise a permission notice: one notification for both.
const notifyAsk = async ($: EngineInterface, text: string) => {
  const now = await $.clock.now()

  if (now - lastAskAt < 2000) return
  lastAskAt = now
  await notify($, 'ask', text, 'Ping')
}

let wasFull = false

const refresh = async ($: EngineInterface) => {
  const [usage, model, cwd, now] = await Promise.all([
    $.session.usage(),
    $.session.model(),
    $.session.cwd(),
    $.clock.now(),
  ])
  const git = (...args: string[]) =>
    $.process.run(['git', ...args], { cwd }).then(
      ran => (ran.exitCode === 0 ? ran.stdout.trim() : undefined),
      () => undefined,
    )
  const branch = (await git('branch', '--show-current')) || (await git('rev-parse', '--short', 'HEAD'))
  const stats = branch ? ((await git('diff', 'HEAD', '--shortstat')) ?? '') : ''
  const limits: Limit[] = usage.rateLimits.flatMap(one => {
    const label = LABELS[one.kind]

    return label && one.resetsAt
      ? [{ label, pct: Math.floor(one.percentUsed), resetsAt: Date.parse(one.resetsAt) }]
      : []
  })
  const next: Snapshot = {
    model: modelName(model),
    dir: cwd.split('/').pop() ?? cwd,
    branch: branch ?? null,
    add: Number(/(\d+) insertion/.exec(stats)?.[1] ?? 0),
    del: Number(/(\d+) deletion/.exec(stats)?.[1] ?? 0),
    usd: usage.cost?.usd ?? 0,
    now,
    startedAt: usage.startedAt,
    pct: Math.floor(usage.context.percent ?? 0),
    window: usage.context.window,
    limits,
  }
  await update($, snap, () => next)

  const isFull = next.pct >= 85

  if (isFull && !wasFull) void notify($, 'context', `Context is ${next.pct}% full`, 'Ping')
  wasFull = isFull

  // The file the old status-line.sh wrote; the autonomous-projects usage script reads it.
  // ponytail: plain write, not write-then-rename ($.fs has no rename); that reader treats a torn read as unknown
  const five = limits.find(one => one.label === '5h')
  const home = await $.env.get('HOME')

  if (five && home) {
    const entry = (one?: Limit) => ({
      used_percentage: one?.pct ?? null,
      resets_at: one ? Math.floor(one.resetsAt / 1000) : null,
    })
    const cache = {
      snapshot_at: Math.floor(now / 1000),
      five_hour: entry(five),
      seven_day: entry(limits.find(one => one.label === '7d')),
    }
    await $.fs
      .write(`${home}/.claude/rate-limit-cache.json`, `${JSON.stringify(cache)}\n`)
      .catch(() => undefined)
  }
}

let isQueued = false

// One refresh per burst of events, a quarter second later, so a tool's result never waits on git.
const soon = ($: EngineInterface) => {
  if (isQueued) return
  isQueued = true
  $.clock.after(250, () => {
    isQueued = false
    void refresh($)
  })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refresh($)
    // ponytail: slow tick only for the timer, the reset countdowns and git changes made outside the session
    $.clock.every(30_000, () => void refresh($))

    return next(e)
  })

  on('session.measure', ($, e, next) => {
    soon($)

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    if (e.tool === 'AskUserQuestion') void notifyAsk($, 'Claude has a question')
    const ran = await next(e)
    soon($)

    return ran
  })

  on('classic.Notification', ($, e, next) => {
    if (e.notification_type === 'permission_prompt') void notifyAsk($, 'Claude needs your approval')

    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined && !e.isAborted) {
      void notify($, 'stop', e.reason === 'error' ? 'Claude stopped on an error' : 'Claude finished', 'Glass')
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await read($, snap)

    if (e.props.hasSurvey || s === null) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {rows(s).map(row => (
          <Box gap={2}>
            {fit(row, e.props.bodyColumns).map(one => (
              <Box gap={1}>
                {one.groups.map(group => (
                  <Box>{group.map(([text, color]) => h(Text, color ? { color } : null, text))}</Box>
                ))}
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    )
  })
}
