import type { Register } from 'claude-code'

const PANE = 'design-hub'
const MEMORY = '.claude/PROJECT-MEMORY.md'
const DIR = '.claude/hub/threads'

type Thread = {
  id: string
  title: string
  task: string
  status: 'running' | 'done'
  agentId?: string
  startedAt: string
  result?: string
}

// One file per thread, so threads and routines can write at the same time
// without ever editing the same file.
const file = (id: string) => `${DIR}/${id}.json`

const RULES = [
  'You are a thread of the Gushwork design hub team. First read .claude/PROJECT-MEMORY.md and follow it.',
  'Reversible work (branches, draft PRs, scratch files) needs no asking. Open every PR as a DRAFT.',
  'Never merge, publish, deploy, delete things or message outside the project: stop and report instead.',
  'Do not edit foundation/, exports/, skills/, DECISIONS.md, templates/ or any component-registry.json.',
  'Finish with a short plain-words result: what you did, the PR link if any, and what needs a decision.',
].join('\n')

async function load($: any): Promise<Thread[]> {
  let entries: { name: string }[] = []
  try {
    entries = await $.fs.list(DIR)
  } catch {
    return []
  }
  const out: Thread[] = []
  for (const en of entries) {
    if (!en.name.endsWith('.json')) continue
    try {
      out.push(JSON.parse(String(await $.fs.read(`${DIR}/${en.name}`))))
    } catch {
      /* skip a half-written file */
    }
  }
  return out.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'hub',
      description: 'Open the design hub pane: project memory and threads',
    })
    await $.command.register({
      name: 'thread',
      description: 'Start a thread: /thread <short title>: <task>',
    })
    return next(e)
  })

  on('command.run', { command: 'hub' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Design hub' })
    return { text: 'Design hub pane opened.' }
  })

  on('command.run', { command: 'thread' }, async ($, e) => {
    const [head, ...rest] = e.args.split(':')
    const title = (head ?? '').trim()
    const task = rest.join(':').trim() || title
    if (!title) return { text: 'Usage: /thread <short title>: <task>' }

    const startedAt = new Date().toISOString()
    const id = `${startedAt.slice(0, 16).replace(/[-:T]/g, '')}-${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 30)}`
    const thread: Thread = { id, title, task, status: 'running', startedAt }
    await $.fs.write(file(id), JSON.stringify(thread, null, 2))

    const spawned = await $.agent.spawn({
      description: title,
      prompt: `${RULES}\n\nThread: ${title}\nTask: ${task}`,
    })
    if (spawned.deny !== undefined || spawned.agentId === undefined) {
      await $.fs.write(file(id), JSON.stringify({ ...thread, status: 'done', result: 'Could not start.' }, null, 2))
      return { text: `Could not start thread "${title}".` }
    }
    await $.fs.write(file(id), JSON.stringify({ ...thread, agentId: spawned.agentId }, null, 2))
    $.ui.invalidate('ui.render')
    await $.ui.open({ id: PANE, title: 'Design hub' })
    return { text: `Thread started: ${title}` }
  })

  // A thread's result goes to its file, not the main chat.
  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) {
      const mine = (await load($)).find(t => t.agentId === e.agentId)
      if (mine) {
        await $.fs.write(
          file(mine.id),
          JSON.stringify({ ...mine, status: 'done', result: e.answer.slice(0, 2000) }, null, 2),
        )
        $.ui.invalidate('ui.render')
        $.ui.toast(`Thread done: ${mine.title}`)
      }
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const threads = await load($)
    let memory: string[] = []
    try {
      memory = String(await $.fs.read(MEMORY)).split('\n').filter(l => l.trim() !== '')
    } catch {
      /* no memory file in this directory */
    }
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 6)
    const shown = threads.slice(0, Math.min(8, room))
    return (
      <Box flexDirection="column">
        <Text bold>Threads ({threads.length})</Text>
        {threads.length === 0 && <Text dimColor>None yet. Start one: /thread title: task</Text>}
        {shown.map(t => (
          <Box flexDirection="column">
            <Text>
              {t.status === 'running' ? 'running' : 'done   '} {t.title}
            </Text>
            {t.result && <Text dimColor>  {(t.result.split('\n')[0] ?? '').slice(0, 100)}</Text>}
          </Box>
        ))}
        <Text bold>Memory</Text>
        {memory.length === 0 && <Text dimColor>No {MEMORY} here. Run from the design-system repo.</Text>}
        {memory.slice(0, Math.max(1, room - shown.length * 2)).map(l => (
          <Text bold={l.startsWith('#')} dimColor={!l.startsWith('#') && !l.startsWith('-')}>
            {l}
          </Text>
        ))}
      </Box>
    )
  })
}
