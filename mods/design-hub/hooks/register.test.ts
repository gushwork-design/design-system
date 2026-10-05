import { test, expect } from 'claude-code/testing'
import { register } from './register'

test('exports register', () => {
  expect(typeof register).toBe('function')
})
