export type ElectionPhase = 'pending' | 'active' | 'closed'

interface ElectionWindow {
  status: string
  startDate: Date | string
  endDate: Date | string
}

/**
 * The authoritative open/closed state for voting.
 *
 * Dates are the source of truth. `elections.status` is refreshed lazily when
 * an election list is fetched, so a vote request can arrive while the stored
 * status still says `active` even though the end date has passed.
 */
export function getElectionPhase(
  election: ElectionWindow,
  now: Date = new Date()
): ElectionPhase {
  if (election.status === 'completed') return 'closed'

  const start = new Date(election.startDate).getTime()
  const end = new Date(election.endDate).getTime()
  const current = now.getTime()

  if (Number.isNaN(start) || Number.isNaN(end)) return 'closed'
  if (current < start) return 'pending'
  if (current > end) return 'closed'
  return 'active'
}

export function electionPhaseMessage(phase: ElectionPhase): string {
  switch (phase) {
    case 'pending':
      return 'Voting has not started for this election.'
    case 'closed':
      return 'Voting has closed for this election.'
    default:
      return 'Voting is open.'
  }
}
