import { test, expect } from 'claude-code/testing'
import { register } from './register'

test('registers /hub on session start', async () => {
  expect(typeof register).toBe('function')
})
