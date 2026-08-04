import { sql } from 'drizzle-orm'
import {
  bigint,
  bigserial,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import { organization, user } from './auth-schema'

const bytea = customType<{ data: Buffer }>({
  dataType: () => 'bytea',
})

export const documentVersionStatus = pgEnum('document_version_status', [
  'pending',
  'ready',
  'failed',
])
export const documentVersionOrigin = pgEnum('document_version_origin', [
  'upload',
  'checkpoint',
  'import',
])
export const documentBlockType = pgEnum('document_block_type', [
  'heading',
  'paragraph',
  'list_item',
  'table',
  'table_row',
  'table_cell',
  'page_break',
  'unsupported',
])
export const reviewRoundStatus = pgEnum('review_round_status', ['open', 'completed'])
export const reviewChangeType = pgEnum('review_change_type', [
  'replace',
  'insert',
  'delete',
  'comment',
  'question',
])
export const reviewPriority = pgEnum('review_priority', ['low', 'medium', 'high', 'critical'])
export const reviewItemStatus = pgEnum('review_item_status', [
  'open',
  'under_discussion',
  'accepted',
  'rejected',
  'superseded',
  'conflict',
  'resolved',
])
export const exportStatus = pgEnum('export_status', ['pending', 'ready', 'failed'])

export const projects = pgTable(
  'project',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    createdById: text('created_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => [index('project_organization_idx').on(table.organizationId)],
)

export const documents = pgTable(
  'document',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'restrict' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    title: varchar('title', { length: 300 }).notNull(),
    currentVersionId: uuid('current_version_id'),
    createdById: text('created_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => [
    index('document_organization_idx').on(table.organizationId),
    index('document_project_idx').on(table.projectId),
  ],
)

export const documentVersions = pgTable(
  'document_version',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'restrict' }),
    parentVersionId: uuid('parent_version_id'),
    versionNumber: integer('version_number').notNull(),
    origin: documentVersionOrigin('origin').notNull(),
    status: documentVersionStatus('status').notNull().default('pending'),
    originalFilename: varchar('original_filename', { length: 500 }),
    sourceObjectKey: text('source_object_key'),
    sourceSha256: varchar('source_sha256', { length: 64 }),
    sourceByteSize: bigint('source_byte_size', { mode: 'number' }),
    parserVersion: varchar('parser_version', { length: 40 }),
    parserWarnings: jsonb('parser_warnings').$type<string[]>().notNull().default([]),
    parseError: text('parse_error'),
    createdById: text('created_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('document_version_number_uq').on(table.documentId, table.versionNumber),
    index('document_version_document_idx').on(table.documentId),
    check('document_version_number_positive', sql`${table.versionNumber} > 0`),
  ],
)

export const documentBlocks = pgTable(
  'document_block',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentVersionId: uuid('document_version_id')
      .notNull()
      .references(() => documentVersions.id, { onDelete: 'restrict' }),
    parentBlockId: uuid('parent_block_id'),
    stableKey: varchar('stable_key', { length: 120 }).notNull(),
    ordinal: integer('ordinal').notNull(),
    blockType: documentBlockType('block_type').notNull(),
    text: text('text').notNull().default(''),
    headingLevel: integer('heading_level'),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    attributes: jsonb('attributes').$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    uniqueIndex('document_block_version_ordinal_uq').on(table.documentVersionId, table.ordinal),
    uniqueIndex('document_block_version_stable_key_uq').on(
      table.documentVersionId,
      table.stableKey,
    ),
    index('document_block_parent_idx').on(table.parentBlockId),
    check('document_block_ordinal_nonnegative', sql`${table.ordinal} >= 0`),
    check(
      'document_block_heading_level_valid',
      sql`${table.headingLevel} is null or (${table.headingLevel} between 1 and 6)`,
    ),
  ],
)

export const reviewRounds = pgTable(
  'review_round',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'restrict' }),
    documentVersionId: uuid('document_version_id')
      .notNull()
      .references(() => documentVersions.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 120 }).notNull(),
    status: reviewRoundStatus('status').notNull().default('open'),
    createdById: text('created_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedById: text('completed_by_id').references(() => user.id, { onDelete: 'restrict' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('review_round_document_idx').on(table.documentId),
    index('review_round_version_idx').on(table.documentVersionId),
  ],
)

export const reviewAssignments = pgTable(
  'review_assignment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reviewRoundId: uuid('review_round_id')
      .notNull()
      .references(() => reviewRounds.id, { onDelete: 'restrict' }),
    reviewerId: text('reviewer_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    assignedById: text('assigned_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('review_assignment_round_reviewer_uq').on(table.reviewRoundId, table.reviewerId),
  ],
)

export const reviewItems = pgTable(
  'review_item',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'restrict' }),
    documentVersionId: uuid('document_version_id')
      .notNull()
      .references(() => documentVersions.id, { onDelete: 'restrict' }),
    reviewRoundId: uuid('review_round_id')
      .notNull()
      .references(() => reviewRounds.id, { onDelete: 'restrict' }),
    targetBlockId: uuid('target_block_id')
      .notNull()
      .references(() => documentBlocks.id, { onDelete: 'restrict' }),
    parentReviewItemId: uuid('parent_review_item_id'),
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    startOffset: integer('start_offset'),
    endOffset: integer('end_offset'),
    offsetEncoding: varchar('offset_encoding', { length: 20 }).notNull().default('utf16'),
    anchorPrefix: text('anchor_prefix'),
    anchorQuote: text('anchor_quote').notNull(),
    anchorSuffix: text('anchor_suffix'),
    targetContentHash: varchar('target_content_hash', { length: 64 }).notNull(),
    originalContent: text('original_content').notNull(),
    proposedContent: text('proposed_content'),
    changeType: reviewChangeType('change_type').notNull(),
    category: varchar('category', { length: 80 }).notNull(),
    priority: reviewPriority('priority').notNull(),
    rationale: text('rationale').notNull(),
    status: reviewItemStatus('status').notNull().default('open'),
    revision: integer('revision').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => [
    index('review_item_document_status_idx').on(table.documentId, table.status),
    index('review_item_round_idx').on(table.reviewRoundId),
    index('review_item_block_idx').on(table.targetBlockId),
    check(
      'review_item_offsets_valid',
      sql`(${table.startOffset} is null and ${table.endOffset} is null) or (${table.startOffset} >= 0 and ${table.endOffset} >= ${table.startOffset})`,
    ),
    check('review_item_rationale_not_blank', sql`length(trim(${table.rationale})) >= 3`),
    check('review_item_revision_positive', sql`${table.revision} > 0`),
  ],
)

export const reviewComments = pgTable(
  'review_comment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reviewItemId: uuid('review_item_id')
      .notNull()
      .references(() => reviewItems.id, { onDelete: 'restrict' }),
    parentCommentId: uuid('parent_comment_id'),
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
  },
  (table) => [
    index('review_comment_item_created_idx').on(table.reviewItemId, table.createdAt),
    check('review_comment_body_not_blank', sql`length(trim(${table.body})) > 0`),
  ],
)

export const reviewResolutions = pgTable(
  'review_resolution',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reviewItemId: uuid('review_item_id')
      .notNull()
      .references(() => reviewItems.id, { onDelete: 'restrict' }),
    decision: varchar('decision', { length: 20 }).notNull(),
    finalContent: text('final_content'),
    note: text('note'),
    resolverId: text('resolver_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('review_resolution_item_uq').on(table.reviewItemId),
    check('review_resolution_decision_valid', sql`${table.decision} in ('accept', 'reject')`),
  ],
)

export const collaborationSnapshots = pgTable(
  'collaboration_snapshot',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'restrict' }),
    documentVersionId: uuid('document_version_id')
      .notNull()
      .references(() => documentVersions.id, { onDelete: 'restrict' }),
    sequence: bigint('sequence', { mode: 'number' }).notNull(),
    state: bytea('state').notNull(),
    stateHash: varchar('state_hash', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('collaboration_snapshot_version_sequence_uq').on(
      table.documentVersionId,
      table.sequence,
    ),
  ],
)

export const collaborationUpdates = pgTable(
  'collaboration_update',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'restrict' }),
    documentVersionId: uuid('document_version_id')
      .notNull()
      .references(() => documentVersions.id, { onDelete: 'restrict' }),
    sequence: bigserial('sequence', { mode: 'number' }).notNull(),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    clientId: varchar('client_id', { length: 120 }).notNull(),
    update: bytea('update').notNull(),
    updateHash: varchar('update_hash', { length: 64 }).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('collaboration_update_sequence_uq').on(table.sequence),
    index('collaboration_update_version_sequence_idx').on(table.documentVersionId, table.sequence),
  ],
)

export const auditEvents = pgTable(
  'audit_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sequence: bigserial('sequence', { mode: 'number' }).notNull(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'restrict' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'restrict' }),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'restrict' }),
    documentVersionId: uuid('document_version_id').references(() => documentVersions.id, {
      onDelete: 'restrict',
    }),
    reviewRoundId: uuid('review_round_id').references(() => reviewRounds.id, {
      onDelete: 'restrict',
    }),
    reviewItemId: uuid('review_item_id').references(() => reviewItems.id, {
      onDelete: 'restrict',
    }),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    requestId: uuid('request_id'),
    previousHash: varchar('previous_hash', { length: 64 }),
    eventHash: varchar('event_hash', { length: 64 }).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('audit_event_sequence_uq').on(table.sequence),
    uniqueIndex('audit_event_hash_uq').on(table.eventHash),
    index('audit_event_document_sequence_idx').on(table.documentId, table.sequence),
  ],
)

export const exports = pgTable(
  'export',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'restrict' }),
    documentVersionId: uuid('document_version_id')
      .notNull()
      .references(() => documentVersions.id, { onDelete: 'restrict' }),
    requestedById: text('requested_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    format: varchar('format', { length: 20 }).notNull(),
    status: exportStatus('status').notNull().default('pending'),
    objectKey: text('object_key'),
    outputSha256: varchar('output_sha256', { length: 64 }),
    error: text('error'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [index('export_document_idx').on(table.documentId)],
)

export type DocumentBlock = typeof documentBlocks.$inferSelect
export type ReviewItem = typeof reviewItems.$inferSelect
