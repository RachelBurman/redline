import { createHash } from 'node:crypto'

import { assertTrustServiceBinding, assertTrustServiceProfile } from './trust-service-binding'

import type {
  TrustServiceAdapter,
  TrustServiceEvidence,
  TrustServiceTransactionSnapshot,
  VerifiedTrustServiceWebhook,
} from './trust-service-adapter'

export interface StoredTrustServiceTransaction {
  id: string
  providerId: string
  providerTransactionId: string
  binding: TrustServiceTransactionSnapshot['binding']
  profile: TrustServiceTransactionSnapshot['profile']
}

export interface TrustServiceWebhookEnvelope {
  providerId: string
  providerEventId: string
  providerTransactionId: string
  eventType: string
  occurredAt: string
  receivedAt: string
  payloadSha256: string
  rawBody: Uint8Array | null
}

export interface TrustServiceTransactionStore {
  findByProviderReference(
    providerId: string,
    providerTransactionId: string,
  ): Promise<StoredTrustServiceTransaction | null>
  applyReconciliation(input: {
    transaction: StoredTrustServiceTransaction
    event: TrustServiceWebhookEnvelope
    snapshot: TrustServiceTransactionSnapshot
    evidence: TrustServiceEvidence | null
  }): Promise<void>
}

export interface TrustServiceWebhookInbox {
  enqueue(event: TrustServiceWebhookEnvelope): Promise<'accepted' | 'duplicate'>
}

export interface TrustServiceEvidencePolicy {
  retainRawWebhook(input: StoredTrustServiceTransaction): boolean
}

export class UnknownTrustServiceTransactionError extends Error {
  constructor() {
    super('The provider transaction is not bound to a Redline signature request.')
    this.name = 'UnknownTrustServiceTransactionError'
  }
}

export class TrustServiceProviderMismatchError extends Error {
  constructor() {
    super('The trust-service adapter does not match the stored provider transaction.')
    this.name = 'TrustServiceProviderMismatchError'
  }
}

function sha256(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex')
}

async function findBoundTransaction(input: {
  adapter: TrustServiceAdapter
  event: VerifiedTrustServiceWebhook
  transactionStore: TrustServiceTransactionStore
}) {
  const transaction = await input.transactionStore.findByProviderReference(
    input.adapter.providerId,
    input.event.providerTransactionId,
  )
  if (!transaction) throw new UnknownTrustServiceTransactionError()
  if (transaction.providerId !== input.adapter.providerId) {
    throw new TrustServiceProviderMismatchError()
  }
  return transaction
}

export async function acceptTrustServiceWebhook(input: {
  adapter: TrustServiceAdapter
  transactionStore: TrustServiceTransactionStore
  inbox: TrustServiceWebhookInbox
  evidencePolicy: TrustServiceEvidencePolicy
  headers: Headers
  rawBody: Uint8Array
  receivedAt: string
}) {
  const verified = await input.adapter.verifyWebhook({
    headers: input.headers,
    rawBody: input.rawBody,
    receivedAt: input.receivedAt,
  })
  const transaction = await findBoundTransaction({
    adapter: input.adapter,
    event: verified,
    transactionStore: input.transactionStore,
  })
  const event: TrustServiceWebhookEnvelope = {
    providerId: input.adapter.providerId,
    providerEventId: verified.providerEventId,
    providerTransactionId: verified.providerTransactionId,
    eventType: verified.eventType,
    occurredAt: verified.occurredAt,
    receivedAt: input.receivedAt,
    payloadSha256: sha256(input.rawBody),
    rawBody: input.evidencePolicy.retainRawWebhook(transaction) ? input.rawBody : null,
  }

  return { outcome: await input.inbox.enqueue(event), event }
}

export async function reconcileTrustServiceWebhook(input: {
  adapter: TrustServiceAdapter
  transactionStore: TrustServiceTransactionStore
  event: TrustServiceWebhookEnvelope
}) {
  const transaction = await input.transactionStore.findByProviderReference(
    input.event.providerId,
    input.event.providerTransactionId,
  )
  if (!transaction) throw new UnknownTrustServiceTransactionError()
  if (
    transaction.providerId !== input.adapter.providerId ||
    input.event.providerId !== input.adapter.providerId
  ) {
    throw new TrustServiceProviderMismatchError()
  }

  const snapshot = await input.adapter.getTransaction(transaction.providerTransactionId)
  if (snapshot.providerTransactionId !== transaction.providerTransactionId) {
    throw new UnknownTrustServiceTransactionError()
  }
  assertTrustServiceBinding(transaction.binding, snapshot.binding)
  assertTrustServiceProfile(transaction.profile, snapshot.profile)

  const evidence =
    snapshot.status === 'completed'
      ? await input.adapter.retrieveEvidence(transaction.providerTransactionId)
      : null
  if (evidence) {
    if (evidence.providerTransactionId !== transaction.providerTransactionId) {
      throw new UnknownTrustServiceTransactionError()
    }
    assertTrustServiceBinding(transaction.binding, evidence.binding)
    assertTrustServiceProfile(transaction.profile, evidence.profile)
  }

  await input.transactionStore.applyReconciliation({
    transaction,
    event: input.event,
    snapshot,
    evidence,
  })
  return { snapshot, evidence }
}
