import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { bar, fmtTimer, fmtTokens, fmtUntil, modelName, nextUsd, pctColor, prices } from './register'

const NOW = 1_800_000_000_000
const RAN = { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
const START = { cwd: '/tmp/demo', surface: 'terminal', isInteractive: true } as const
const MEASURED = { context: { window: 200000 }, rateLimits: [], changed: ['cost' as const] }

// The world beneath the plugin, answered from memory: session figures, git, the notifier, the cache file.
const world = (on: On) => {
  const w = {
    clock: mock.clock(on, { now: NOW }),
    usd: 1.5,
    percent: 45,
    gitRuns: 0,
    hasNotifier: true,
    sent: [] as string[],
    toasts: [] as string[],
    writes: [] as { path: string; text: string }[],
  }
  mock.env(on, { HOME: '/home/u' })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/tmp/demo' }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', () => ({
    value: {
      startedAt: NOW - 65_000,
      context: { window: 200000, tokens: 90000, percent: w.percent },
      rateLimits: [
        { kind: 'five_hour', percentUsed: 72.5, resetsAt: new Date(NOW + 7_500_000).toISOString() },
        { kind: 'seven_day', percentUsed: 55, resetsAt: new Date(NOW + 2 * 86_400_000).toISOString() },
      ],
      cost: { usd: w.usd },
    },
  }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('process.run', (_, e) => {
    const [command] = e.argv

    if (command === 'git') {
      w.gitRuns += 1
      const stdout = e.argv[1] === 'branch' ? 'main\n' : ' 1 file changed, 3 insertions(+), 2 deletions(-)\n'

      return { value: { ...RAN, stdout } }
    }

    if (command === 'terminal-notifier' && !w.hasNotifier) {
      return { value: { ...RAN, exitCode: 1 } }
    }
    w.sent.push(e.argv.join(' '))

    return { value: RAN }
  })
  on('fs.write', (_, e) => {
    w.writes.push({ path: e.path, text: e.text })

    return { value: undefined }
  })
  on('ui.toast', (_, e) => {
    w.toasts.push(e.text)

    return { value: undefined }
  })
  on('turn.complete', () => ({ text: '' }))
  on('classic.Notification', () => ({}))
  on('tool.call', () => ({ deny: 'not run in this test' }))

  return w
}

test('formats match status-line.sh', async () => {
  expect(modelName('claude-opus-5-5')).toBe('Opus 5.5')
  expect(modelName('claude-haiku-4-5-20251001')).toBe('Haiku 4.5')
  expect(modelName('Opus 5.5')).toBe('Opus 5.5')
  expect(fmtTokens(999)).toBe('999')
  expect(fmtTokens(1000)).toBe('1k')
  expect(fmtTokens(45600)).toBe('45.6k')
  expect(fmtTokens(1000000)).toBe('1M')
  expect(fmtUntil(0)).toBe('now')
  expect(fmtUntil(59 * 60)).toBe('59m')
  expect(fmtUntil(2 * 3600 + 5 * 60)).toBe('2h5m')
  expect(fmtUntil(3 * 86400 + 4 * 3600)).toBe('3d4h')
  expect(fmtTimer(65)).toBe('1:05')
  expect(fmtTimer(3725)).toBe('1:02:05')
  expect(pctColor(69)).toBe('green')
  expect(pctColor(70)).toBe('yellow')
  expect(pctColor(90)).toBe('red')
  expect(bar(45, 10).join('|')).toBe('████|░░░░░░')
  expect(bar(150, 5).join('|')).toBe('█████|')
  expect(prices('claude-fable-5-1', 1)).toEqual([10, 0.25])
  expect(prices('claude-fable-5', 1)).toEqual([10, 1])
  expect(prices('claude-opus-5-5', 1)).toEqual([4, 0.2])
  expect(prices('claude-opus-4-8', 1)).toEqual([5, 0.5])
  expect(prices('claude-sonnet-5-5', 1)).toEqual([2, 0.2])
  expect(prices('claude-sonnet-4-6', 1)).toEqual([3, 0.3])
  expect(prices('claude-haiku-5-5', 50_000)).toEqual([0.1, 0.01])
  expect(prices('claude-haiku-5-5', 200_000)).toEqual([0.5, 0.05])
  expect(prices('claude-haiku-4-5', 1)).toEqual([1, 0.1])

  // 100k cached at $0.20 read plus 1k of reply written at $8; cold, all 101k written at $8.
  const next = nextUsd({ model: 'claude-opus-5-5', input_tokens: 0, cache_read_input_tokens: 100_000, cache_creation_input_tokens: 0, output_tokens: 1000 })
  expect(next.warm.toFixed(3)).toBe('0.028')
  expect(next.cold.toFixed(3)).toBe('0.808')
})

test('cache counts down beside the cost, with the next request priced warm and cold', async ($, on) => {
  const w = world(on)
  const usage = { model: 'claude-opus-5-5', input_tokens: 10, cache_read_input_tokens: 299_000, cache_creation_input_tokens: 900, output_tokens: 100 }
  on('turn.step', async function* (_, e) {
    const tokens = e.agentId === undefined ? usage : { ...usage, cache_read_input_tokens: 5_000_000 }

    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage: tokens }
  })
  await $.session.start(START)
  const step = async (agentId?: string) => {
    const stream = $.turn.step({ turnId: 't1', index: 0, model: 'claude-opus-5-5', messageCount: 3, agentId })
    for await (const _chunk of stream);
  }
  const band = () =>
    $.ui.mount({
      plugin: 'status-bar',
      surface: 'terminal',
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 160, scroll: { offset: 0, bodyRows: 10 }, view: {} },
    })
  const shown = async (...texts: (string | RegExp)[]) => {
    const ui = await band()
    const found = await Promise.all(texts.map(async text => (await ui.find({ type: 'Text', text })) !== undefined))
    await ui.unmount()

    return found
  }

  // Before any request there is no countdown.
  expect(await shown('59:59', '· next')).toEqual([false, false])

  // 299,910 cached tokens read at Opus 5.5's $0.20 and 100 written at $8: $0.06 warm.
  // All 300,010 written at $8: $2.40 cold. A subagent's request leaves both alone.
  await step()
  await step('a1')
  await w.clock.advance(1000)
  expect(await shown('$1.50', '59:59', '$0.06', '$2.40', /^cold$/)).toEqual([true, true, true, true, false])

  await w.clock.advance(3600_000)
  expect(await shown('59:59', '$0.06', /^cold$/, '$2.40')).toEqual([false, false, true, true])
})

test('band draws whole when wide, drops the least useful parts when narrow, refreshes on events', async ($, on) => {
  const w = world(on)
  await $.session.start(START)

  // The cache file keeps the shape status-line.sh wrote.
  expect(w.writes[0]?.path).toBe('/home/u/.claude/rate-limit-cache.json')
  expect(JSON.parse(w.writes[0]?.text ?? '{}')).toEqual({
    snapshot_at: NOW / 1000,
    five_hour: { used_percentage: 72, resets_at: (NOW + 7_500_000) / 1000 },
    seven_day: { used_percentage: 55, resets_at: (NOW + 2 * 86_400_000) / 1000 },
  })

  const band = (surface: 'terminal' | 'desktop', bodyColumns: number) =>
    $.ui.mount({
      plugin: 'status-bar',
      surface,
      component: 'AbovePrompt',
      props: {
        hasSurvey: false,
        isWorking: false,
        maxRows: 10,
        bodyColumns,
        scroll: { offset: 0, bodyRows: 10 },
        view: {},
      },
    })
  const has = async (ui: Awaited<ReturnType<typeof band>>, text: string | RegExp) =>
    (await ui.find({ type: 'Text', text })) !== undefined

  for (const surface of ['terminal', 'desktop'] as const) {
    const wide = await band(surface, 120)
    for (const text of ['Opus 5.5', 'demo', 'main', '+3', '-2', '$1.50', '1:05', '45%', '90k/200k', '72%', '↻2h5m', '55%', '↻2d0h']) {
      expect(await has(wide, text)).toBe(true)
    }
    expect(await has(wide, /^in$/)).toBe(false)
    expect(await has(wide, /^out$/)).toBe(false)
    await wide.unmount()

    const narrow = await band(surface, 30)
    for (const text of ['Opus 5.5', 'main', '$1.50', '45%']) {
      expect(await has(narrow, text)).toBe(true)
    }
    for (const text of ['demo', '1:05', '90k/200k', '72%', '55%']) {
      expect(await has(narrow, text)).toBe(false)
    }
    await narrow.unmount()
  }

  // A burst of measurements folds into one refresh; nothing polls in between.
  const before = w.gitRuns
  w.usd = 2.25
  await $.session.measure(MEASURED)
  await $.session.measure(MEASURED)
  await w.clock.advance(1000)
  expect(w.gitRuns - before).toBe(2)
  const after = await band('terminal', 120)
  expect(await has(after, '$2.25')).toBe(true)
  await after.unmount()
  expect(w.toasts).toEqual([])
})

test('notifies on a finished turn, a question, an approval prompt and a full context', async ($, on) => {
  const w = world(on)
  await $.session.start(START)
  const turn = { answer: 'done', durationMs: 1000, turnId: 't1', isAborted: false, reason: 'answer' } as const
  const prompt = { message: 'Claude needs your permission to use Bash', notification_type: 'permission_prompt' }

  await $.turn.complete(turn)
  await w.clock.advance(1)
  expect(w.toasts).toEqual(['Claude finished'])
  expect(w.sent[0]).toContain('terminal-notifier')
  expect(w.sent[0]).toContain('-subtitle demo -message Claude finished -sound Glass -group claude-stop')

  // An interrupted turn and a subagent's turn stay quiet.
  await $.turn.complete({ ...turn, isAborted: true, reason: 'aborted' })
  await $.turn.complete({ ...turn, agentId: 'a1' })
  await w.clock.advance(1)
  expect(w.toasts.length).toBe(1)

  // A question that also raises a permission notice is one notification.
  await $.tool.call({
    tool: 'AskUserQuestion',
    questions: [
      {
        question: 'Which one?',
        header: 'Pick',
        multiSelect: false,
        options: [
          { label: 'A', description: 'first' },
          { label: 'B', description: 'second' },
        ],
      },
    ],
  })
  await $.classic.Notification(prompt)
  await w.clock.advance(1)
  expect(w.toasts.slice(1)).toEqual(['Claude has a question'])
  await w.clock.advance(3000)
  await $.classic.Notification(prompt)
  await w.clock.advance(1)
  expect(w.toasts.at(-1)).toBe('Claude needs your approval')

  // Without terminal-notifier it falls back to osascript.
  w.hasNotifier = false
  await $.turn.complete({ ...turn, reason: 'error' })
  await w.clock.advance(1)
  expect(w.sent.at(-1)).toContain('osascript -e display notification "Claude stopped on an error" with title "Claude Code" subtitle "demo"')

  // Context: once when it passes 85%, not again while it stays there.
  w.percent = 90
  await $.session.measure(MEASURED)
  await w.clock.advance(1000)
  await $.session.measure(MEASURED)
  await w.clock.advance(1000)
  expect(w.toasts.filter(text => text === 'Context is 90% full').length).toBe(1)
})
