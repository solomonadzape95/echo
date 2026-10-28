import {
  blindSign,
  decodeBytes,
  encodeBytes,
  exportPublicKey,
  generateRAKeyPair,
  BLIND_RSA_VARIANT,
} from '../vendor/blindvote-shared'

/**
 * Ephemeral Registration Authority key used only by the in-app blind-signature
 * playground.
 *
 * It deliberately does NOT use the real RA key: a signature produced here can
 * never be accepted by the ballot box. The protocol is identical, so the demo
 * still shows every real input and output without creating a voting oracle.
 */
const demoKeyHolder = globalThis as typeof globalThis & {
  __blindVoteDemoRaKey?: Promise<CryptoKeyPair>
}

const MAX_BLINDED_MESSAGE_BYTES = 1024

export class DemoBlindSignatureService {
  private keyPair(): Promise<CryptoKeyPair> {
    if (!demoKeyHolder.__blindVoteDemoRaKey) {
      demoKeyHolder.__blindVoteDemoRaKey = generateRAKeyPair()
    }
    return demoKeyHolder.__blindVoteDemoRaKey
  }

  async getPublicKey() {
    const pair = await this.keyPair()
    return {
      publicKey: await exportPublicKey(pair.publicKey),
      variant: BLIND_RSA_VARIANT,
      note: 'Ephemeral demo key. Signatures from this playground are not valid for real ballots.',
    }
  }

  async sign(blindedMsgB64: string) {
    const blindedMsg = decodeBytes(blindedMsgB64)

    if (blindedMsg.byteLength === 0 || blindedMsg.byteLength > MAX_BLINDED_MESSAGE_BYTES) {
      throw new Error('Invalid blinded message')
    }

    const pair = await this.keyPair()
    const blindSignature = await blindSign(pair.privateKey, blindedMsg)

    return {
      blindSignature: encodeBytes(blindSignature),
      variant: BLIND_RSA_VARIANT,
    }
  }
}

export const demoBlindSignatureService = new DemoBlindSignatureService()
