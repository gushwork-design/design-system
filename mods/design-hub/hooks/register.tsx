import type { Register } from 'claude-code'

const PANE = 'design-hub'
const MEMORY = '.claude/PROJECT-MEMORY.md'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'hub',
      description: 'Show the design hub project memory: how we work, routines, state',
    })
    return next(e)
  })

  on('command.run', { command: 'hub' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Design hub' })
    return { text: 'Design hub pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    let text = ''
    try {
      text = String(await $.fs.read(MEMORY))
    } catch {
      return <Text dimColor>No {MEMORY} here. Run /hub from the design-system repo.</Text>
    }
    const lines = text.split('\n').filter(l => l.trim() !== '')
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 4)
    return (
      <Box flexDirection="column">
        {lines.slice(0, room).map(l => (
          <Text bold={l.startsWith('#')} dimColor={!l.startsWith('#') && !l.startsWith('-')}>
            {l}
          </Text>
        ))}
      </Box>
    )
  })
}
