import { describe, expect, it, vi } from 'vitest'

import {
  TrustServiceBindingMismatchError,
  TrustServiceProfileMismatchError,
} from './trust-service-binding'
import {
  acceptTrustServiceWebhook,
  reconcileTrustServiceWebhook,
  TrustServiceProviderMismatchError,
  type StoredTrustServiceTransaction,
  type TrustServiceTransactionStore,
  type TrustServiceWebhookEnvelope,
  type TrustServiceWebhookInbox,
  UnknownTrustServiceTransactionError,
} from './trust-service-webhooks'

import type {
  TrustServiceAdapter,
  TrustServiceBinding,
  TrustServiceEvidence,
  TrustServiceTransactionSnapshot,
} from './trust-service-adapter'

const binding: TrustServiceBinding = {
  organizationId: 'organization-1',
  projectId: 'project-1',
  documentId: 'document-1',
  documentVersionId: 'version-1',
  signatureRequestId: 'request-1',
  contentSha256: 'a'.repeat(64),
}

const transaction: StoredTrustServiceTransaction = {
  id: 'transaction-1',
  providerId: 'sandbox-provider',
  providerTransactionId: 'provider-transaction-1',
  binding,
  profile: {
    assurance: 'advanced',
    jurisdiction: 'test-jurisdiction',
    signatureFormat: 'test-format',
    signatureProfile: 'test-profile',
  },
}

const snapshot: TrustServiceTransactionSnapshot = {
  providerTransactionId: transaction.providerTransactionId,
  binding,
  profile: transaction.profile,
  status: 'completed',
  providerStatus: 'provider-complete',
  providerUpdatedAt: '2026-10-26T10:01:00.000Z',
}

const evidence: TrustServiceEvidence = {
  providerTransactionId: transaction.providerTransactionId,
  binding,
  profile: snapshot.profile,
  providerId: transaction.providerId,
  validationStatus: 'valid',
  validatedAt: '2026-10-26T10:02:00.000Z',
  certificateChain: [],
  timestamps: [],
  revocationEvidence: [],
  artifacts: [],
}

const verifiedEvent = {
  providerEventId: 'event-1',
  providerTransactionId: transaction.providerTransactionId,
  eventType: 'provider.finished',
  occurredAt: '2026-10-26T10:00:00.000Z',
}

const envelope: TrustServiceWebhookEnvelope = {
  providerId: transaction.providerId,
  ...verifiedEvent,
  receivedAt: '2026-10-26T10:03:00.000Z',
  payloadSha256: 'b'.repeat(64),
  rawBody: null,
}

function buildAdapter(overrides: Partial<TrustServiceAdapter> = {}): TrustServiceAdapter {
  return {
    providerId: transaction.providerId,
    createTransaction: vi.fn<TrustServiceAdapter['createTransaction']>(),
    createSigningExperience: vi.fn<TrustServiceAdapter['createSigningExperience']>(),
    getTransaction: vi.fn<TrustServiceAdapter['getTransaction']>().mockResolvedValue(snapshot),
    cancelTransaction: vi.fn<TrustServiceAdapter['cancelTransaction']>(),
    verifyWebhook: vi.fn<TrustServiceAdapter['verifyWebhook']>().mockResolvedValue(verifiedEvent),
    retrieveEvidence: vi.fn<TrustServiceAdapter['retrieveEvidence']>().mockResolvedValue(evidence),
    ...overrides,
  }
}

function buildStore(
  stored: StoredTrustServiceTransaction | null = transaction,
): TrustServiceTransactionStore {
  return {
    findByProviderReference: vi
      .fn<TrustServiceTransactionStore['findByProviderReference']>()
      .mockResolvedValue(stored),
    applyReconciliation: vi
      .fn<TrustServiceTransactionStore['applyReconciliation']>()
      .mockResolvedValue(undefined),
  }
}

describe('trust-service webhooks', () => {
  it('verifies before enqueueing and retains only a hash when policy forbids raw evidence', async () => {
    const adapter = buildAdapter()
    const inbox: TrustServiceWebhookInbox = {
      enqueue: vi.fn<TrustServiceWebhookInbox['enqueue']>().mockResolvedValue('accepted'),
    }
    const rawBody = new TextEncoder().encode('{"event":"complete"}')

    const result = await acceptTrustServiceWebhook({
      adapter,
      transactionStore: buildStore(),
      inbox,
      evidencePolicy: { retainRawWebhook: () => false },
      headers: new Headers({ 'x-test-signature': 'valid' }),
      rawBody,
      receivedAt: envelope.receivedAt,
    })

    expect(adapter.verifyWebhook).toHaveBeenCalledOnce()
    expect(result.outcome).toBe('accepted')
    expect(result.event.rawBody).toBeNull()
    expect(result.event.payloadSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(inbox.enqueue).toHaveBeenCalledWith(result.event)
  })

  it('lets the inbox report a replay and retains raw evidence only when policy allows it', async () => {
    const rawBody = new TextEncoder().encode('signed payload')
    const result = await acceptTrustServiceWebhook({
      adapter: buildAdapter(),
      transactionStore: buildStore(),
      inbox: {
        enqueue: vi.fn<TrustServiceWebhookInbox['enqueue']>().mockResolvedValue('duplicate'),
      },
      evidencePolicy: { retainRawWebhook: () => true },
      headers: new Headers(),
      rawBody,
      receivedAt: envelope.receivedAt,
    })

    expect(result.outcome).toBe('duplicate')
    expect(result.event.rawBody).toBe(rawBody)
  })

  it('rejects unknown or mismatched provider transactions', async () => {
    await expect(
      acceptTrustServiceWebhook({
        adapter: buildAdapter(),
        transactionStore: buildStore(null),
        inbox: { enqueue: vi.fn<TrustServiceWebhookInbox['enqueue']>() },
        evidencePolicy: { retainRawWebhook: () => false },
        headers: new Headers(),
        rawBody: new Uint8Array(),
        receivedAt: envelope.receivedAt,
      }),
    ).rejects.toBeInstanceOf(UnknownTrustServiceTransactionError)

    await expect(
      acceptTrustServiceWebhook({
        adapter: buildAdapter(),
        transactionStore: buildStore({ ...transaction, providerId: 'wrong-provider' }),
        inbox: { enqueue: vi.fn<TrustServiceWebhookInbox['enqueue']>() },
        evidencePolicy: { retainRawWebhook: () => false },
        headers: new Headers(),
        rawBody: new Uint8Array(),
        receivedAt: envelope.receivedAt,
      }),
    ).rejects.toBeInstanceOf(TrustServiceProviderMismatchError)
  })

  it('reconciles an out-of-order callback against current provider state and stores evidence', async () => {
    const store = buildStore()
    const result = await reconcileTrustServiceWebhook({
      adapter: buildAdapter(),
      transactionStore: store,
      event: { ...envelope, eventType: 'provider.started' },
    })

    expect(result).toEqual({ snapshot, evidence })
    expect(store.applyReconciliation).toHaveBeenCalledWith({
      transaction,
      event: { ...envelope, eventType: 'provider.started' },
      snapshot,
      evidence,
    })
  })

  it('does not retrieve evidence before completion', async () => {
    const pendingSnapshot = { ...snapshot, status: 'processing' as const }
    const adapter = buildAdapter({
      getTransaction: vi
        .fn<TrustServiceAdapter['getTransaction']>()
        .mockResolvedValue(pendingSnapshot),
    })
    const store = buildStore()

    const result = await reconcileTrustServiceWebhook({
      adapter,
      transactionStore: store,
      event: envelope,
    })

    expect(result.evidence).toBeNull()
    expect(adapter.retrieveEvidence).not.toHaveBeenCalled()
  })

  it('rejects changed documents and mismatched provider references before persisting', async () => {
    const changedBinding = { ...binding, contentSha256: 'c'.repeat(64) }
    const store = buildStore()

    await expect(
      reconcileTrustServiceWebhook({
        adapter: buildAdapter({
          getTransaction: vi
            .fn<TrustServiceAdapter['getTransaction']>()
            .mockResolvedValue({ ...snapshot, binding: changedBinding }),
        }),
        transactionStore: store,
        event: envelope,
      }),
    ).rejects.toBeInstanceOf(TrustServiceBindingMismatchError)

    await expect(
      reconcileTrustServiceWebhook({
        adapter: buildAdapter({
          getTransaction: vi
            .fn<TrustServiceAdapter['getTransaction']>()
            .mockResolvedValue({ ...snapshot, providerTransactionId: 'unexpected' }),
        }),
        transactionStore: store,
        event: envelope,
      }),
    ).rejects.toBeInstanceOf(UnknownTrustServiceTransactionError)
  })

  it('rejects evidence bound to another request and provider mismatches during reconciliation', async () => {
    await expect(
      reconcileTrustServiceWebhook({
        adapter: buildAdapter({
          retrieveEvidence: vi.fn<TrustServiceAdapter['retrieveEvidence']>().mockResolvedValue({
            ...evidence,
            binding: { ...binding, signatureRequestId: 'other-request' },
          }),
        }),
        transactionStore: buildStore(),
        event: envelope,
      }),
    ).rejects.toBeInstanceOf(TrustServiceBindingMismatchError)

    await expect(
      reconcileTrustServiceWebhook({
        adapter: buildAdapter({ providerId: 'other-provider' }),
        transactionStore: buildStore(),
        event: envelope,
      }),
    ).rejects.toBeInstanceOf(TrustServiceProviderMismatchError)
  })

  it('rejects an assurance or profile downgrade before applying provider state', async () => {
    await expect(
      reconcileTrustServiceWebhook({
        adapter: buildAdapter({
          getTransaction: vi.fn<TrustServiceAdapter['getTransaction']>().mockResolvedValue({
            ...snapshot,
            profile: { ...snapshot.profile, signatureProfile: 'weaker-profile' },
          }),
        }),
        transactionStore: buildStore(),
        event: envelope,
      }),
    ).rejects.toBeInstanceOf(TrustServiceProfileMismatchError)
  })
})
