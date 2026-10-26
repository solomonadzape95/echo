import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '../db/db'
import { deviceBindings } from '../models/deviceBinding.schema'

/**
 * Device lock service.
 *
 * Policy (both rules are enforced together):
 *   1. a device may only ever be linked to one voter account
 *   2. a voter account may only ever be linked to one device
 *
 * A lost or replaced phone is unbound by an administrator, never by the user,
 * because a self-service transfer would make the lock pointless for anyone who
 * already knows the account password.
 *
 * This is identity metadata only. It is never joined to `votes`, `tokens` or
 * `issuances`, so it cannot link a voter to a ballot.
 */

export type DeviceBindingStatus = 400 | 403

export class DeviceBindingError extends Error {
  readonly status: DeviceBindingStatus

  constructor(message: string, status: DeviceBindingStatus = 403) {
    super(message)
    this.name = 'DeviceBindingError'
    this.status = status
  }
}

export interface DeviceContext {
  id: string
  platform?: string
}

const PEPPER = process.env.DEVICE_BINDING_PEPPER || 'blindvote-device-binding-v1'
const MIN_DEVICE_ID_LENGTH = 16
const MAX_DEVICE_ID_LENGTH = 256

/** Hash a client device id before it is stored or compared. */
export function hashDeviceId(deviceId: string): string {
  return createHash('sha256')
    .update(`${PEPPER}:${deviceId.trim().toLowerCase()}`)
    .digest('hex')
}

function assertDeviceId(deviceId: string) {
  const trimmed = deviceId.trim()
  if (trimmed.length < MIN_DEVICE_ID_LENGTH || trimmed.length > MAX_DEVICE_ID_LENGTH) {
    throw new DeviceBindingError('Device identification is missing or invalid.', 400)
  }
  return trimmed
}

export class DeviceBindingService {
  /**
   * Claim a device for a voter, or verify an existing claim.
   *
   * Safe to call on every login: a matching pair only refreshes `last_seen_at`.
   */
  async bind(voterId: string, deviceId: string, platform = 'unknown') {
    const normalized = assertDeviceId(deviceId)
    const deviceIdHash = hashDeviceId(normalized)

    try {
      return await db.transaction(async (tx) => {
        const [byDevice] = await tx
          .select()
          .from(deviceBindings)
          .where(eq(deviceBindings.deviceIdHash, deviceIdHash))
          .limit(1)

        if (byDevice && byDevice.voterId !== voterId) {
          throw new DeviceBindingError(
            'This device is already linked to another account. A device can only be used with one account.',
            403
          )
        }

        const [byVoter] = await tx
          .select()
          .from(deviceBindings)
          .where(eq(deviceBindings.voterId, voterId))
          .limit(1)

        if (byVoter && byVoter.deviceIdHash !== deviceIdHash) {
          throw new DeviceBindingError(
            'This account is locked to a different device. Contact the electoral committee to reset your device lock.',
            403
          )
        }

        if (byVoter) {
          const [updated] = await tx
            .update(deviceBindings)
            .set({ lastSeenAt: new Date(), platform, updatedAt: new Date() })
            .where(eq(deviceBindings.id, byVoter.id))
            .returning()
          return updated
        }

        const [created] = await tx
          .insert(deviceBindings)
          .values({
            voterId,
            deviceIdHash,
            platform,
          })
          .returning()
        return created
      })
    } catch (error) {
      if (error instanceof DeviceBindingError) throw error

      // A concurrent login can lose the unique-constraint race. Re-read and
      // turn the database error into the same friendly policy message.
      const [byDevice] = await db
        .select()
        .from(deviceBindings)
        .where(eq(deviceBindings.deviceIdHash, deviceIdHash))
        .limit(1)

      if (byDevice && byDevice.voterId !== voterId) {
        throw new DeviceBindingError(
          'This device is already linked to another account. A device can only be used with one account.',
          403
        )
      }

      const [byVoter] = await db
        .select()
        .from(deviceBindings)
        .where(eq(deviceBindings.voterId, voterId))
        .limit(1)

      if (byVoter && byVoter.deviceIdHash !== deviceIdHash) {
        throw new DeviceBindingError(
          'This account is locked to a different device. Contact the electoral committee to reset your device lock.',
          403
        )
      }

      throw error
    }
  }

  /** Pre-flight check used by registration, before a new voter row is created. */
  async assertDeviceAvailable(deviceId: string) {
    const normalized = assertDeviceId(deviceId)
    const deviceIdHash = hashDeviceId(normalized)
    const [byDevice] = await db
      .select()
      .from(deviceBindings)
      .where(eq(deviceBindings.deviceIdHash, deviceIdHash))
      .limit(1)

    if (byDevice) {
      throw new DeviceBindingError(
        'This device is already linked to another account. A device can only be used with one account.',
        403
      )
    }
    return normalized
  }

  /** Read the binding for an account (admin support view). */
  async getForVoter(voterId: string) {
    const [binding] = await db
      .select()
      .from(deviceBindings)
      .where(eq(deviceBindings.voterId, voterId))
      .limit(1)
    return binding ?? null
  }

  /** Remove the lock so the voter can sign in on a new device. */
  async reset(voterId: string) {
    const removed = await db
      .delete(deviceBindings)
      .where(eq(deviceBindings.voterId, voterId))
      .returning({ id: deviceBindings.id })
    return removed.length > 0
  }
}

export const deviceBindingService = new DeviceBindingService()
