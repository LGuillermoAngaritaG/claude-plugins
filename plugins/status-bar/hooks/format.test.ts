import { expect, mock, test } from 'claude-code/testing'

import { bar, fmtTimer, fmtTokens, fmtUntil, modelName, pctColor } from './register'

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
})

test('band draws whole when wide, drops the least useful parts when narrow, refreshes on events', async ($, on) => {
  const NOW = 1_800_000_000_000
  const clock = mock.clock(on, { now: NOW })
  let usd = 1.5
  let gitRuns = 0
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/tmp/demo' }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', () => ({
    value: {
      startedAt: NOW - 65_000,
      context: { window: 200000, tokens: 90000, percent: 45 },
      rateLimits: [
        { kind: 'five_hour', percentUsed: 72.5, resetsAt: new Date(NOW + 7_500_000).toISOString() },
        { kind: 'seven_day', percentUsed: 55, resetsAt: new Date(NOW + 2 * 86_400_000).toISOString() },
      ],
      cost: { usd },
    },
  }))
  on('process.run', (_, e) => {
    gitRuns += 1

    return {
      value: {
        exitCode: 0,
        stdout: e.argv[1] === 'branch' ? 'main\n' : ' 1 file changed, 3 insertions(+), 2 deletions(-)\n',
        stderr: '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }
  })
  on('session.measure', (_, e) => ({ changed: e.changed }))
  const writes: { path: string; text: string }[] = []
  mock.env(on, { HOME: '/home/u' })
  on('fs.write', (_, e) => {
    writes.push({ path: e.path, text: e.text })

    return { value: undefined }
  })
  await $.session.start({ cwd: '/tmp/demo', surface: 'terminal', isInteractive: true })

  // The cache file keeps the shape status-line.sh wrote.
  expect(writes[0]?.path).toBe('/home/u/.claude/rate-limit-cache.json')
  expect(JSON.parse(writes[0]?.text ?? '{}')).toEqual({
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
  const before = gitRuns
  usd = 2.25
  const measured = { context: { window: 200000 }, rateLimits: [], changed: ['cost' as const] }
  await $.session.measure(measured)
  await $.session.measure(measured)
  await clock.advance(1000)
  expect(gitRuns - before).toBe(2)
  const after = await band('terminal', 120)
  expect(await has(after, '$2.25')).toBe(true)
  await after.unmount()
})
