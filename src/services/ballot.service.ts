import { eq, or } from 'drizzle-orm'
import { db } from '../db/db'
import { elections } from '../models/election.schema'
import { offices } from '../models/office.schema'
import { candidates } from '../models/candidate.schema'
import { voters } from '../models/voter.schema'

export class BallotService {
  /**
   * Get complete ballot data for an election (by ID or slug)
   * Returns election info, all offices, and candidates for each office
   */
  async getBallotData(electionIdentifier: string) {
    console.log('[BALLOT SERVICE] Getting ballot data for election:', electionIdentifier)

    // 1. Get election by ID or slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(electionIdentifier)
    const [election] = await db
      .select()
      .from(elections)
      .where(
        isUuid 
          ? eq(elections.id, electionIdentifier)
          : eq(elections.slug, electionIdentifier)
      )
      .limit(1)

    if (!election) {
      throw new Error('Election not found')
    }

    // 2. Get all offices for this election
    const electionOffices = await db
      .select()
      .from(offices)
      .where(eq(offices.election, electionId))

    // 3. Get candidates for each office with voter info
    const officesWithCandidates = await Promise.all(
      electionOffices.map(async (office) => {
        const officeCandidates = await db
          .select({
            id: candidates.id,
            officeId: candidates.office,
            quote: candidates.quote,
            manifesto: candidates.manifesto,
            image: candidates.image,
            voterId: candidates.voterId,
            voterUsername: voters.username,
            voterRegNumber: voters.regNumber,
          })
          .from(candidates)
          .leftJoin(voters, eq(candidates.voterId, voters.id))
          .where(eq(candidates.office, office.id))

        return {
          id: office.id,
          name: office.name,
          description: office.description,
          electionId: office.election,
          dependsOn: office.dependsOn,
          candidates: officeCandidates.map(c => ({
            id: c.id,
            name: c.voterUsername || 'Unknown',
            regNumber: c.voterRegNumber || '',
            quote: c.quote || '',
            manifesto: c.manifesto || '',
            image: c.image || '',
          })),
        }
      })
    )

    return {
      election: {
        id: election.id,
        name: election.name,
        description: election.description,
        type: election.type,
        status: election.status,
        startDate: election.startDate,
        endDate: election.endDate,
        domainId: election.domainId,
      },
      offices: officesWithCandidates,
    }
  }
}

export const ballotService = new BallotService()

