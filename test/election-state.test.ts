import { describe, expect, test } from 'bun:test'
import { getElectionPhase } from '../src/helpers/electionState.helpers'

const start = new Date('2026-10-27T10:00:00.000Z')
const end = new Date('2026-10-27T11:00:00.000Z')

describe('getElectionPhase', () => {
  test('pending before the start date', () => {
    expect(getElectionPhase(
      { status: 'pending', startDate: start, endDate: end },
      new Date('2026-10-27T09:59:59.000Z')
    )).toBe('pending')
  })

  test('active inside the window even if the stored status is stale', () => {
    expect(getElectionPhase(
      { status: 'pending', startDate: start, endDate: end },
      new Date('2026-10-27T10:30:00.000Z')
    )).toBe('active')
  })

  test('closed after the end date even if the stored status is stale', () => {
    expect(getElectionPhase(
      { status: 'active', startDate: start, endDate: end },
      new Date('2026-10-27T11:00:01.000Z')
    )).toBe('closed')
  })

  test('completed status always wins', () => {
    expect(getElectionPhase(
      { status: 'completed', startDate: start, endDate: end },
      new Date('2026-10-27T10:30:00.000Z')
    )).toBe('closed')
  })
})
