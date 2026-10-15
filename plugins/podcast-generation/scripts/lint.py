#!/usr/bin/env python3
"""Lint a podcast script, after drilling the lint on an invented fixture.

The renderer cannot read a digit, a path or a dash the way a person would, and a line
that is not a turn is never spoken at all. A script that lints clean is the only way to
know what will be read aloud. The lint is drilled before it is trusted on a real script:
every tagged line of the invented fixture must trip the exact rule it names, the lines
tagged to pass must pass, and the whole-script rules (word band, host split) must fire
on invented scripts built to break them. A check that has only ever seen agreeing input
has not been shown to disagree.

Usage:
    python lint.py                                  # the drill alone
    python lint.py SCRIPT.md --minutes 3            # drill, then the script
    python lint.py SCRIPT.md --low 500 --high 600   # an explicit word band instead
    python lint.py SCRIPT.md --minutes 3 --ban Acme --ban "Project Falcon"
    python lint.py SCRIPT.md --minutes 3 --lang es  # Spanish has voices for HOST_A to HOST_C only

The type of the episode is the word after the date, `<!-- 2026-01-01 panel -->`; without
one it is two-host. The type sets which speakers may talk, whether one speaker may hold
two turns in a row, and whose share of the words is checked (see TYPES).

Rules (each a finding that fails the script):
    the first line is not a date comment      <!-- YYYY-MM-DD [type] -->
    the type in the date line is unknown
    a line that is not a turn                 the renderer would drop it
    a speaker this type does not use          or one the language has no voice for
    too few speakers for this type
    two turns in a row by the same host       except where the type allows it
    em dash, en dash, a hyphen used as a dash
    a digit                                   every number is spoken as words
    a path, a file name, a URL or code        nothing a listener cannot hear
    a banned word                             anything passed with --ban
    the word count is outside the band        --minutes M or --low/--high
    the host split is outside the band        the share of the speaker the type names

Readings (printed, never failing): words, turns, words per host, projected minutes at
the words a minute you give, words per turn, the longest turn, turns a minute, and the
host split against earlier episodes found beside the script (files named E1_*.md,
E2_*.md and so on).

Exit codes: 0 PASSED, 1 FAILED, 2 the script could not be read.
"""

import argparse
import os
import re
import sys

EM, EN = chr(0x2014), chr(0x2013)    # by code point, so this file holds no dash itself
TURN = re.compile(r'^\*\*(HOST_[A-E]):\*\*\s+(.+)$')
DATELINE = re.compile(r'^<!--\s*\d{4}-\d{2}-\d{2}(?:\s+([a-z-]+))?\s*-->$')
SPACED_HYPHEN = re.compile(r'(^|\s)-{1,2}(\s|$)|\w--\w')
PATHLIKE = re.compile(
    r'~/'                                        # a home path
    r'|(?:^|[\s(])/[A-Za-z0-9._]+/'              # an absolute path
    r'|\b[\w-]+\.(?:py|md|json|jsonl|txt|sh|csv|ya?ml|html?|pdf|m4a|wav|mp3)\b'
    r'|https?://|\bwww\.'                        # a URL
    r'|`')                                       # inline code
# Per type: the speakers it may use, the fewest it needs, whether one speaker may take two
# turns in a row (a paragraph break), and whose share of the words must sit in which band.
TYPES = {
    'two-host':    dict(speakers='AB', least=2, repeat=False, split=('B', 55.0, 80.0)),
    'student':     dict(speakers='AB', least=2, repeat=False, split=('A', 55.0, 80.0)),
    'adversarial': dict(speakers='AB', least=2, repeat=False, split=('B', 40.0, 60.0)),
    'panel':       dict(speakers='ABCDE', least=4, repeat=False, split=('A', 10.0, 30.0)),
    'story':       dict(speakers='ABCDE', least=1, repeat=True, split=('A', 60.0, 100.0)),
    'professor':   dict(speakers='A', least=1, repeat=True, split=None),
}
LANG_SPEAKERS = {'en': 'ABCDE', 'es': 'ABC'}   # the voices each language has
LONG_TURN = 90               # words; long turns read fast and sound like a monologue
EPISODE_FILE = re.compile(r'^E\d+_.+\.md$')

FIXTURE = '''<!-- 2026-01-01 -->
**HOST_A:** This first line is ordinary, a well-known kind of line, and should pass. {{PASS}}
**HOST_B:** Here is a sentence with an em dash {{EM}} right there. {{RULE: em dash}}
**HOST_A:** And here is one with an en dash {{EN}} in it. {{RULE: en dash}}
**HOST_B:** Grind it fine {{HY}} but not too fine. {{RULE: a hyphen used as a dash}}
**HOST_A:** Use 15 grams of coffee for each cup. {{RULE: a digit}}
**HOST_B:** The notes live in ~/notes/coffee and nowhere else. {{RULE: a path, a file name, a URL or code}}
**HOST_A:** The guide is in brewing_notes.md if you want it. {{RULE: a path, a file name, a URL or code}}
**HOST_B:** There is a chart at https://example.org for that. {{RULE: a path, a file name, a URL or code}}
**HOST_A:** We tried the zorblat grinder this week. {{RULE: a banned word}}
**HOST_A:** This turn follows another by the same host. {{RULE: two turns in a row by the same host}}
This line has no host prefix at all and the renderer would drop it. {{RULE: a line that is not a turn}}
**HOST_B:** And this last line is ordinary and should also pass. {{PASS}}
'''
FIXTURE_BAN = ['zorblat']
TAG = re.compile(r'\s*\{\{(RULE|PASS)(?::\s*([^}]*))?\}\}')


def episode_type(text):
    """The type named in the date line, or two-host when there is none."""
    m = DATELINE.match(text.split('\n', 1)[0].strip())
    return (m.group(1) if m and m.group(1) else 'two-host')


def check(text, ban=(), band=None, split='type', lang='en'):
    """Every finding as (rule, line number), plus the readings. Line 0 is the whole script.

    The matched text is never echoed, only the rule and the line, so a lint report can be
    shared without carrying the script's content.
    """
    out = []
    lines = text.split('\n')
    prev_host = None
    turns, host_words = {}, {}
    lengths = []
    bans = [b.lower() for b in ban if b]
    kind = episode_type(text)
    spec = TYPES.get(kind)
    allowed = ''.join(s for s in (spec['speakers'] if spec else 'ABCDE') if s in LANG_SPEAKERS[lang])
    split_on = None
    if split == 'type':
        split_on = spec['split'] if spec else None
    elif split:
        split_on = ((spec['split'] or ('B',))[0] if spec else 'B', split[0], split[1])

    if not lines or not DATELINE.match(lines[0].strip()):
        out.append(('the first line is not a date comment', 1))
    elif not spec:
        out.append(('the type in the date line is unknown', 1))

    for i, raw in enumerate(lines, 1):
        line = raw.rstrip()
        if not line.strip():
            continue
        if i == 1 and DATELINE.match(line.strip()):
            continue
        m = TURN.match(line.strip())
        if not m:
            out.append(('a line that is not a turn', i))
            continue
        host, body = m.group(1), m.group(2)
        if host[-1] not in allowed:
            out.append(('a speaker this type does not use', i))
        if host == prev_host and not (spec and spec['repeat']):
            out.append(('two turns in a row by the same host', i))
        prev_host = host
        n = len(body.split())
        turns[host] = turns.get(host, 0) + 1
        host_words[host] = host_words.get(host, 0) + n
        lengths.append((n, i))
        low = body.lower()
        if EM in body:
            out.append(('em dash', i))
        if EN in body:
            out.append(('en dash', i))
        if SPACED_HYPHEN.search(body):
            out.append(('a hyphen used as a dash', i))
        if re.search(r'\d', body):
            out.append(('a digit', i))
        if PATHLIKE.search(body):
            out.append(('a path, a file name, a URL or code', i))
        if any(re.search(r'\b%s\b' % re.escape(b), low) for b in bans):
            out.append(('a banned word', i))

    words = sum(host_words.values())
    share = (100.0 * host_words.get('HOST_' + split_on[0], 0) / words
             if words and split_on else None)
    least = min(spec['least'], len(allowed)) if spec else 1
    if words and len(turns) < least:
        out.append(('too few speakers for this type', 0))
    if band:
        lo, hi = band
        if not (lo <= words <= hi):
            out.append(('the word count is outside the band', 0))
    if split_on and share is not None and not (split_on[1] <= share <= split_on[2]):
        out.append(('the host split is outside the band', 0))
    readings = {'words': words, 'turns': turns, 'host_words': host_words, 'type': kind,
                'split': split_on, 'share_b': share, 'lengths': lengths}
    return out, readings


def drill():
    """Each fixture line must trip exactly the rule it names; the pass lines must pass."""
    body = FIXTURE.replace('{{EM}}', EM).replace('{{EN}}', EN).replace('{{HY}}', chr(45))
    results = []
    for raw in body.split('\n'):
        m = TAG.search(raw)
        if not m:
            continue
        kind, name = m.group(1), (m.group(2) or 'a line that must pass').strip()
        stripped = TAG.sub('', raw).rstrip()
        # Each line is checked in place, with the date line kept so the header rule does
        # not fire on every entry, and the same host repeated for the consecutive case.
        if name == 'two turns in a row by the same host':
            probe = '<!-- 2026-01-01 -->\n**HOST_A:** a previous turn by this host.\n' + stripped
        else:
            probe = '<!-- 2026-01-01 -->\n' + stripped
        # A one-line probe is not a whole script, so the whole-script rules (line 0) are left out.
        found = {r for r, ln in check(probe, ban=FIXTURE_BAN, split=None)[0] if ln}
        ok = (name in found) if kind == 'RULE' else not found
        results.append({'kind': kind, 'name': name, 'ok': ok})

    def mini(a_words, b_words, pairs):
        t = ['<!-- 2026-01-01 -->']
        for _ in range(pairs):
            t.append('**HOST_A:** ' + ' '.join(['word'] * a_words) + '.')
            t.append('**HOST_B:** ' + ' '.join(['word'] * b_words) + '.')
        return '\n'.join(t)

    whole = [
        ('a script below the word band trips the band rule',
         mini(10, 30, 5), (300, 400), 'the word count is outside the band', True),
        ('a script above the word band trips the band rule',
         mini(10, 30, 20), (300, 400), 'the word count is outside the band', True),
        ('an even split trips the host split rule',
         mini(20, 20, 9), (300, 400), 'the host split is outside the band', True),
        ('a split of thirty to seventy inside the band passes',
         mini(12, 28, 9), (300, 400), None, False),
    ]
    def typed(kind, rows):
        return '\n'.join(['<!-- 2026-01-01 %s -->' % kind] +
                         ['**HOST_%s:** %s.' % (s, ' '.join(['word'] * n)) for s, n in rows])

    whole += [
        ('a professor holding many turns in a row passes',
         typed('professor', [('A', 40)] * 9), (300, 400), None, False),
        ('a second voice in a professor lecture trips the speaker rule',
         typed('professor', [('A', 40)] * 8 + [('B', 40)]), (300, 400),
         'a speaker this type does not use', True),
        ('a student who talks most passes',
         typed('student', [('A', 28), ('B', 12)] * 9), (300, 400), None, False),
        ('a student who talks least trips the host split rule',
         typed('student', [('A', 12), ('B', 28)] * 9), (300, 400),
         'the host split is outside the band', True),
        ('an even adversarial split passes',
         typed('adversarial', [('A', 20), ('B', 20)] * 9), (300, 400), None, False),
        ('a panel of a host and three experts passes',
         typed('panel', [('A', 10), ('B', 30), ('A', 10), ('C', 30), ('A', 10), ('D', 30)] * 3),
         (300, 400), None, False),
        ('a panel of two voices trips the too few rule',
         typed('panel', [('A', 10), ('B', 30)] * 9), (300, 400),
         'too few speakers for this type', True),
        ('an unknown type trips the type rule',
         typed('lecture', [('A', 12), ('B', 28)] * 9), (300, 400),
         'the type in the date line is unknown', True),
    ]
    # Spanish has three voices: a fourth speaker is refused, and a panel of three passes.
    es_panel = typed('panel', [('A', 10), ('B', 30), ('A', 10), ('C', 30)] * 4)
    es_four = es_panel + '\n**HOST_D:** ' + ' '.join(['word'] * 30) + '.'
    whole_es = [
        ('a Spanish panel of three voices passes', es_panel, (300, 400), None, False),
        ('a fourth voice in Spanish trips the speaker rule', es_four, (300, 400),
         'a speaker this type does not use', True),
    ]
    for lang, cases in (('en', whole), ('es', whole_es)):
        for name, text, band, rule, want in cases:
            found = {r for r, _ in check(text, band=band, lang=lang)[0]}
            ok = (rule in found) if want else not found
            results.append({'kind': 'RULE' if want else 'PASS', 'name': name, 'ok': ok})

    rule_n = sum(1 for r in results if r['kind'] == 'RULE')
    rule_ok = sum(1 for r in results if r['kind'] == 'RULE' and r['ok'])
    pass_n = sum(1 for r in results if r['kind'] == 'PASS')
    pass_ok = sum(1 for r in results if r['kind'] == 'PASS' and r['ok'])
    return {'entries': len(results), 'rule_entries': rule_n, 'rule_met': rule_ok,
            'pass_entries': pass_n, 'pass_met': pass_ok,
            'unmet': [r['name'] for r in results if not r['ok']]}


def prior_shares(script_path):
    """The checked share in the earlier episodes of the same type beside this one (E1_*.md and so on).

    The yardstick is the material rather than a number somebody chose: it only says what
    the earlier episodes of the series actually did, so a departure can be named.
    """
    out = []
    d = os.path.dirname(os.path.abspath(script_path))
    here = os.path.basename(os.path.abspath(script_path))
    try:
        kind = episode_type(open(script_path, encoding='utf-8').read())
    except OSError:
        return []
    try:
        names = sorted(os.listdir(d))
    except OSError:
        return []
    for name in names:
        if name == here or not EPISODE_FILE.match(name):
            continue
        try:
            other = open(os.path.join(d, name), encoding='utf-8').read()
            if episode_type(other) != kind:
                continue
            sh = check(other)[1]['share_b']
        except OSError:
            continue
        if sh is not None:
            out.append((name, sh))
    return out


def drift(share, priors):
    """A departure from the observed spread, never a pass or a fail.

    Two readings are the fewest that make a spread, so below that there is no yardstick
    and the honest answer is that none was available, never that the episode agrees.
    """
    if share is None or len(priors) < 2:
        return None
    lo = min(sh for _n, sh in priors)
    hi = max(sh for _n, sh in priors)
    return {'low': lo, 'high': hi, 'departed': share < lo or share > hi, 'priors': len(priors)}


def drift_drill():
    """Drilled on invented readings rather than real files."""
    priors = [('a', 73.0), ('b', 74.0), ('c', 73.0)]
    cases = [
        ('a reading inside the observed spread is not a departure', 73.5, False),
        ('a reading above the observed spread is a departure', 86.0, True),
        ('a reading below the observed spread is a departure', 60.0, True),
        ('a reading exactly on the edge is not a departure', 74.0, False),
    ]
    results = []
    for name, sh, want in cases:
        d = drift(sh, priors)
        results.append({'name': name, 'ok': d is not None and d['departed'] == want})
    results.append({'name': 'one prior alone yields no yardstick rather than agreement',
                    'ok': drift(86.0, [('a', 73.0)]) is None})
    return results


def main():
    ap = argparse.ArgumentParser(description='Lint a podcast script.')
    ap.add_argument('script', nargs='?', help='the script file; without it only the drill runs')
    ap.add_argument('--minutes', type=float,
                    help='target length; sets the word band to ten percent either side of '
                         'minutes times words a minute')
    ap.add_argument('--low', type=int, help='lowest word count allowed (with --high)')
    ap.add_argument('--high', type=int, help='highest word count allowed (with --low)')
    ap.add_argument('--wpm', type=float, default=180.0,
                    help='words a minute used for projections (default 180, measured on '
                         'two-host English at the renderer\'s default speed)')
    ap.add_argument('--split-low', type=float,
                    help='lowest share of the checked speaker, in percent (default: the type\'s)')
    ap.add_argument('--split-high', type=float,
                    help='highest share of the checked speaker, in percent (default: the type\'s)')
    ap.add_argument('--lang', choices=sorted(LANG_SPEAKERS), default='en',
                    help='en or es; Spanish has voices for HOST_A to HOST_C only')
    ap.add_argument('--ban', action='append', default=[],
                    help='a word or phrase that must never be read aloud (repeatable)')
    args = ap.parse_args()

    d = drill()
    print('FIXTURE DRILL (invented): entries %d, rule entries %d met %d, '
          'pass entries %d met %d' % (d['entries'], d['rule_entries'], d['rule_met'],
                                      d['pass_entries'], d['pass_met']))
    if d['unmet']:
        print('DRILL FAILED, unmet by name: ' + '; '.join(d['unmet']))
        return 1
    dd = drift_drill()
    bad = [r['name'] for r in dd if not r['ok']]
    print('DRIFT DRILL (invented readings): cases %d, met %d' % (len(dd), len(dd) - len(bad)))
    if bad:
        print('DRIFT DRILL FAILED, unmet by name: ' + '; '.join(bad))
        return 1
    print('DRILL PASSED: every rule entry tripped the rule it names, every pass entry '
          'passed, and every drift case behaved as named')

    if not args.script:
        return 0

    try:
        text = open(args.script, encoding='utf-8').read()
    except OSError as e:
        print('ERROR: cannot read the script: %s' % e)
        return 2

    if args.low is not None and args.high is not None:
        band = (args.low, args.high)
    elif args.minutes:
        target = args.minutes * args.wpm
        band = (int(round(target * 0.9)), int(round(target * 1.1)))
    else:
        band = None
    split = ((args.split_low, args.split_high)
             if args.split_low is not None and args.split_high is not None else 'type')
    found, rd = check(text, ban=args.ban, band=band, split=split, lang=args.lang)

    words, turns, hw, share = rd['words'], rd['turns'], rd['host_words'], rd['share_b']
    total = sum(turns.values())
    mins = words / args.wpm if args.wpm else 0
    print('SCRIPT %s, type %s' % (os.path.basename(args.script), rd['type']))
    print('words %d (%s); turns %d: %s'
          % (words, 'band %d to %d' % band if band else 'no band set, pass --minutes', total,
             ', '.join('%s %d' % (h, turns[h]) for h in sorted(turns))))
    print('words by host: %s' % ', '.join('%s %d' % (h, hw[h]) for h in sorted(hw)))
    if rd['split']:
        s, lo, hi = rd['split']
        print('HOST_%s share %.0f percent (band %.0f to %.0f)' % (s, share or 0.0, lo, hi))
    if total:
        longest, at = max(rd['lengths'])
        print('projected %.1f minutes at %.0f words a minute; %.1f turns a minute; '
              '%.0f words a turn on average; longest turn %d words (line %d)'
              % (mins, args.wpm, total / mins if mins else 0, words / total, longest, at))
        long_turns = [ln for n, ln in rd['lengths'] if n > LONG_TURN]
        if long_turns:
            print('  hint: %d turn(s) over %d words (lines %s); long turns read fast and '
                  'sound like a monologue, so consider splitting them with a short reply'
                  % (len(long_turns), LONG_TURN, long_turns))

    if found:
        by_rule = {}
        for r, ln in found:
            by_rule.setdefault(r, []).append(ln)
        print('FINDINGS %d:' % len(found))
        for r in sorted(by_rule):
            lines = by_rule[r]
            print('  %s: %s' % (r, 'whole script' if lines == [0] else 'lines %s' % lines))
        print('VERDICT FAILED')
        return 1

    priors = prior_shares(args.script)
    dr = drift(share, priors)
    print('earlier episodes found beside this one: %d' % len(priors))
    if dr is None:
        print('  no yardstick: fewer than two earlier episodes, so no spread could be formed. '
              'This is an absence of a comparison, not an agreement.')
    else:
        print('  their HOST_%s share runs %.0f to %.0f percent%s'
              % (rd['split'][0], dr['low'], dr['high'],
                 '; DEPARTURE: this episode sits outside that spread, a departure to '
                 'explain rather than a failure' if dr['departed'] else ''))
    print('em dashes 0, en dashes 0, spaced hyphens 0, digits 0, paths 0, banned words 0, '
          'same host twice 0, lines not turns 0')
    print('VERDICT PASSED' + ('' if band else ' (word band not checked)'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
