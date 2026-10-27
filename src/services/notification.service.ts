import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '../db/db'
import { notifications } from '../models/notification.schema'
import { elections } from '../models/election.schema'
import { voters } from '../models/voter.schema'
import { classes } from '../models/class.schema'

export type NotificationType =
  | 'election_started'
  | 'election_ended'
  | 'results_published'

interface NotifyInput {
  electionId: string
  type: NotificationType
  title: string
  message: string
  link?: string
}

export class NotificationService {
  /** Voter IDs eligible for an election, excluding disabled accounts. */
  private async eligibleVoterIds(electionId: string): Promise<string[]> {
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, electionId))
      .limit(1)

    if (!election) return []

    if (election.type === 'class') {
      const rows = await db
        .select({ id: voters.id })
        .from(voters)
        .where(and(eq(voters.class, election.domainId), eq(voters.disabled, false)))
      return rows.map((row) => row.id)
    }

    const rows = await db
      .select({ id: voters.id })
      .from(voters)
      .innerJoin(classes, eq(voters.class, classes.id))
      .where(
        and(
          election.type === 'department'
            ? eq(classes.department, election.domainId as any)
            : eq(classes.faculty, election.domainId as any),
          eq(voters.disabled, false)
        )
      )

    return rows.map((row) => row.id)
  }

  /**
   * Fan a status event out to every eligible voter. The unique index on
   * (voter_id, election_id, type) makes repeated ticker runs idempotent.
   */
  async notifyEligibleVoters(input: NotifyInput) {
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, input.electionId))
      .limit(1)

    if (!election) return { sent: 0 }

    const voterIds = await this.eligibleVoterIds(input.electionId)
    if (voterIds.length === 0) return { sent: 0 }

    const rows = voterIds.map((voterId) => ({
      voterId,
      electionId: input.electionId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
    }))

    for (let index = 0; index < rows.length; index += 500) {
      await db
        .insert(notifications)
        .values(rows.slice(index, index + 500))
        .onConflictDoNothing()
    }

    return { sent: rows.length }
  }

  async notifyStarted(electionId: string, electionName: string, endDate: Date, slug: string) {
    return this.notifyEligibleVoters({
      electionId,
      type: 'election_started',
      title: 'Voting is open',
      message: `Voting is open in ${electionName} until ${endDate.toLocaleString('en-GB')}.`,
      link: `/elections/${slug}`,
    })
  }

  async notifyEnded(electionId: string, electionName: string, slug: string) {
    return this.notifyEligibleVoters({
      electionId,
      type: 'election_ended',
      title: 'Election ended',
      message: `Voting in ${electionName} has ended. Results will be available shortly.`,
      link: `/elections/${slug}/results`,
    })
  }

  async notifyResultsPublished(electionId: string, electionName: string, slug: string) {
    return this.notifyEligibleVoters({
      electionId,
      type: 'results_published',
      title: 'Results published',
      message: `Results for ${electionName} are now available.`,
      link: `/elections/${slug}/results`,
    })
  }

  /** Convenience for admin-triggered publication. */
  async notifyResultsPublishedById(electionId: string) {
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, electionId))
      .limit(1)

    if (!election) return { sent: 0 }
    return this.notifyResultsPublished(election.id, election.name, election.slug)
  }

  async listForVoter(voterId: string, page: number, limit: number) {
    const offset = (page - 1) * limit

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.voterId, voterId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset)

    const [countRow] = await db
      .select({ total: sql<number>`count(*)` })
      .from(notifications)
      .where(eq(notifications.voterId, voterId))

    const [unreadRow] = await db
      .select({ total: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.voterId, voterId), isNull(notifications.readAt)))

    return {
      data: rows,
      total: Number(countRow?.total ?? 0),
      unread: Number(unreadRow?.total ?? 0),
    }
  }

  async unreadCount(voterId: string) {
    const [row] = await db
      .select({ total: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.voterId, voterId), isNull(notifications.readAt)))

    return Number(row?.total ?? 0)
  }

  async markRead(voterId: string, notificationId: string) {
    const [updated] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.voterId, voterId)
        )
      )
      .returning({ id: notifications.id })

    return !!updated
  }

  async markAllRead(voterId: string) {
    const updated = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(eq(notifications.voterId, voterId), isNull(notifications.readAt))
      )
      .returning({ id: notifications.id })

    return updated.length
  }
}

export const notificationService = new NotificationService()
