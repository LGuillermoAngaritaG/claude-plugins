import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, TurnUsage } from 'claude-code'

import type { Limit, Snapshot } from '../types'

const snap = atom({ plugin: 'status-bar', key: 'snap' } as const, null, { shape: 'cache-next' })

// When keep-warm stops pinging the cache, in `$.clock.now()` milliseconds.
const warm = atom({ plugin: 'status-bar', key: 'warmUntil' } as const, null)

const ORANGE = '#ff8700'
const LABELS: Record<string, string> = { five_hour: '5h', seven_day: '7d' }

// ponytail: assumes the 1-hour TTL Claude Code sends on a subscription; the engine reports the real one only on a model switch
const CACHE_TTL = 3600

// Keep-warm pings this many seconds before the cache lapses; the 30-second refresh checks.
const PING_BEFORE = 180

// ponytail: list prices in $ per million tokens, [base input, cache read], by model family; Bedrock, Vertex and fast mode bill differently
export const prices = (model: string, tokens: number): readonly [input: number, read: number] =>
  /fable-5-1|mythos-5-1/.test(model) ? [10, 0.25]
  : /fable|mythos/.test(model) ? [10, 1]
  : /opus-5-5/.test(model) ? [4, 0.2]
  : /opus/.test(model) ? [5, 0.5]
  : /sonnet-5/.test(model) ? [2, 0.2]
  : /sonnet/.test(model) ? [3, 0.3]
  : /haiku-5-5/.test(model) ? (tokens > 100_000 ? [0.5, 0.05] : [0.1, 0.01])
  : /haiku/.test(model) ? [1, 0.1]
  : [5, 0.5]

// The input side of the next request, the reply's own output left out. Warm, the last prompt is a cache read
// and the last reply a cache write; cold, the whole context is a write. A 1-hour write bills 2x base input.
export const nextUsd = (u: TurnUsage) => {
  const cached = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
  const [input, read] = prices(u.model, cached + u.output_tokens)

  return {
    warm: (cached * read + u.output_tokens * input * 2) / 1e6,
    cold: ((cached + u.output_tokens) * input * 2) / 1e6,
  }
}

// A row is parts two cells apart; a part is groups one cell apart; a group is
// colored segments with nothing between, then a part's button if it has one.
// A narrow band drops the lowest `keep` first.
type Seg = readonly [text: string, color?: string]
export type Part = { keep: number; groups: Seg[][]; button?: string }

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

// A button draws as `[ label ]` on the terminal.
const width = (one: Part) =>
  one.groups.reduce((n, group) => n + 1 + group.reduce((m, [text]) => m + cells(text), 0), -1) +
  (one.button ? 5 + cells(one.button) : 0)

export const fit = (parts: Part[], columns: number): Part[] => {
  const total = parts.reduce((n, one) => n + 2 + width(one), -2)

  if (total <= columns || parts.length <= 1) return parts
  const weakest = parts.reduce((a, b) => (b.keep < a.keep ? b : a))

  return fit(
    parts.filter(one => one !== weakest),
    columns,
  )
}

export const rows = (s: Snapshot, warmUntil: number | null = null): Part[][] => {
  const [fill, pad] = bar(s.pct, 10)
  const diff =
    s.add > 0 || s.del > 0 ? [[seg(`+${s.add}`, 'green'), seg('/', 'gray'), seg(`-${s.del}`, 'red')]] : []
  const usd = (n: number) => `$${n.toFixed(2)}`
  const left = s.cache ? (s.cache.at - s.now) / 1000 + CACHE_TTL : 0
  const button = warmUntil !== null && warmUntil > s.now ? `warm ${fmtUntil((warmUntil - s.now) / 1000)}` : 'keep warm'
  const cache = (
    !s.cache
      ? []
      : left > 0
        ? [
            part(
              4,
              [seg('cache', 'gray')],
              [seg(fmtTimer(left), pctColor(100 - (100 * left) / CACHE_TTL))],
              [seg('· next', 'gray')],
              [seg(usd(s.cache.warm), 'green')],
              [seg('· cold', 'gray')],
              [seg(usd(s.cache.cold), 'red')],
            ),
          ]
        : [part(4, [seg('cache', 'gray')], [seg('cold', 'red')], [seg('· next', 'gray')], [seg(usd(s.cache.cold), 'red')])]
  ).map(one => ({ ...one, button }))

  return [
    [
      part(5, [seg(s.model, /opus|1m/i.test(s.model) ? ORANGE : 'cyan')]),
      part(2, [seg('📁', 'gray')], [seg(s.dir)]),
      ...(s.branch === null ? [] : [part(3, [seg('⎇', 'gray')], [seg(s.branch, 'magenta')], ...diff)]),
      part(4, [seg(`$${s.usd.toFixed(2)}`, 'yellow')]),
      ...cache,
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

// A resumed session's last response, so the band prices the first request before it is sent.
let resumed: Snapshot['cache'] = null

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
    cache: null,
  }
  await update($, snap, prev => ({ ...next, cache: prev?.cache ?? resumed }))

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

let isPinging = false

// While keep-warm is on, a fork of the main thread reads its cached prefix shortly before it lapses,
// which restarts the TTL without adding to the transcript. A failed ping turns keep-warm off.
const keepWarm = async ($: EngineInterface) => {
  const [s, until, now] = await Promise.all([read($, snap), read($, warm), $.clock.now()])

  if (until === null || isPinging) return
  if (now >= until) return void (await update($, warm, () => null))
  const left = s?.cache ? (s.cache.at - now) / 1000 + CACHE_TTL : 0

  if (left <= 0 || left > PING_BEFORE) return
  isPinging = true
  const reply = await $.model.fork({ prompt: 'Keep-alive ping from the status bar. Reply with the single word ok.' })
  isPinging = false

  if (reply.isAnswered) {
    await update($, snap, x => x?.cache ? { ...x, cache: { ...x.cache, at: now } } : x)
  } else {
    await update($, warm, () => null)
    $.ui.toast(`Keep warm stopped: the ping failed (${reply.reason})`)
  }
}

// Asks how long to keep the cache warm; a typed number of hours works too, capped at 12.
const askWarm = async ($: EngineInterface) => {
  const [s, until, now] = await Promise.all([read($, snap), read($, warm), $.clock.now()])
  const isOn = until !== null && until > now
  const cost = s?.cache ? `Each hourly ping costs about $${s.cache.warm.toFixed(2)}. ` : ''
  const answer = await $.ui
    .ask(`${cost}Keep this session's cache warm for how long?`, {
      header: 'Keep warm',
      options: isOn ? ['1 hour', '4 hours', '12 hours', 'Stop'] : ['1 hour', '4 hours', '8 hours', '12 hours'],
    })
    .catch(() => undefined)

  if (answer === undefined) return
  const hours = Math.min(12, parseFloat(answer))
  await update($, warm, () => (hours > 0 ? now + hours * 3_600_000 : null))
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
    $.clock.every(30_000, () => {
      void refresh($)
      void keepWarm($)
    })

    // A one-second tick moves only the clock, for the cache countdown.
    $.clock.every(1000, () => void $.clock.now().then(now => update($, snap, s => s && { ...s, now })))

    return next(e)
  })

  // Each main-thread request reads or writes the prompt cache and restarts its TTL from the request's start.
  on('turn.step', async function* ($, e, next) {
    const at = await $.clock.now()
    const ran = yield* next(e)
    const u = ran.usage

    if (e.agentId === undefined && u) {
      const cache = { at, ...nextUsd(u) }
      await update($, snap, s => s && { ...s, cache })
    }

    return ran
  })

  // ponytail: a resume reports the context as one total, so warm prices all of it as a cache read
  on('classic.SessionStart', async ($, e, next) => {
    if (e.seconds_since_last_response !== undefined && e.context_tokens) {
      const [now, model] = await Promise.all([$.clock.now(), e.model ?? $.session.model()])
      const usage = { model, input_tokens: 0, cache_read_input_tokens: e.context_tokens, cache_creation_input_tokens: 0, output_tokens: 0 }
      const cache = { at: now - e.seconds_since_last_response * 1000, ...nextUsd(usage) }
      resumed = cache
      await update($, snap, s => s && { ...s, cache: s.cache ?? cache })
    }

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
    const [s, until] = await Promise.all([read($, snap), read($, warm)])

    if (e.props.hasSurvey || s === null) {
      return next(e)
    }

    const { Box, Text, Button } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {rows(s, until).map(row => (
          <Box gap={2}>
            {fit(row, e.props.bodyColumns).map(one => (
              <Box gap={1}>
                {one.groups.map(group => (
                  <Box>{group.map(([text, color]) => h(Text, color ? { color } : null, text))}</Box>
                ))}
                {one.button && <Button key="warm" label={one.button} dimColor onPress={() => void askWarm($)} />}
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    )
  })
}
