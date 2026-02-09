import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const generationStatusEnum = pgEnum('generation_status', [
  'pending',
  'running',
  'succeeded',
  'failed',
]);

const timestamps = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

// ============================================================
// UPLOADS - universal storage for uploaded images
// ============================================================
export const upload = pgTable(
  'upload',
  {
    id: text('id').primaryKey(),
    // Hash of original file for deduplication
    originalSha256: text('original_sha256').notNull(),
    originalMime: text('original_mime').notNull(),
    originalSizeBytes: bigint('original_size_bytes', { mode: 'number' }).notNull(),
    // Stored file data (converted JPEG)
    storedKey: text('stored_key').notNull(),
    storedMime: text('stored_mime').notNull().default('image/jpeg'),
    storedSizeBytes: bigint('stored_size_bytes', { mode: 'number' }).notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('upload_sha256_unique_idx').on(table.originalSha256)]
);

export const uploadRelations = relations(upload, ({ many }) => ({
  garments: many(garment),
  garmentDetections: many(garmentDetection),
}));

export const avatar = pgTable('avatar', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  photoUploadId: text('photo_upload_id').references(() => upload.id, { onDelete: 'restrict' }),
  bodyProfileJson: jsonb('body_profile_json'),
  heightCm: integer('height_cm'),
  ...timestamps,
});

export const avatarAnalysis = pgTable(
  'avatar_analysis',
  {
    id: text('id').primaryKey(),
    avatarId: text('avatar_id')
      .notNull()
      .references(() => avatar.id, { onDelete: 'cascade' }),
    photoHash: text('photo_hash').notNull(),
    modelVersion: text('model_version').notNull().default('gemini-avatar-v1'),
    responseJson: jsonb('response_json').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('avatar_analysis_photo_hash_model_version_idx').on(
      table.photoHash,
      table.modelVersion
    ),
    index('avatar_analysis_avatar_id_idx').on(table.avatarId),
  ]
);

export const garment = pgTable(
  'garment',
  {
    id: text('id').primaryKey(),
    uploadId: text('upload_id')
      .notNull()
      .references(() => upload.id, { onDelete: 'restrict' }),
    bboxNorm: jsonb('bbox_norm').$type<{ x: number; y: number; w: number; h: number }>(),
    name: text('name'),
    category: text('category'),
    garmentProfileJson: jsonb('garment_profile_json'),
    ...timestamps,
  },
  (table) => [
    index('garment_category_idx').on(table.category),
    index('garment_upload_id_idx').on(table.uploadId),
  ]
);

export const garmentDetection = pgTable(
  'garment_detection',
  {
    id: text('id').primaryKey(),
    uploadId: text('upload_id')
      .notNull()
      .references(() => upload.id, { onDelete: 'cascade' }),
    bboxNorm: jsonb('bbox_norm').$type<{ x: number; y: number; w: number; h: number }>().notNull(),
    categoryGuess: text('category_guess'),
    labelGuess: text('label_guess'),
    garmentProfileJson: jsonb('garment_profile_json'),
    confidence: real('confidence'), // 0..1
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('garment_detection_upload_id_idx').on(table.uploadId)]
);

// ============================================================
// OUTFITS — outfit combinations with score
// ============================================================
export const outfit = pgTable(
  'outfit',
  {
    id: text('id').primaryKey(),
    avatarId: text('avatar_id')
      .notNull()
      .references(() => avatar.id, { onDelete: 'cascade' }),
    occasion: text('occasion').notNull(),
    outfitKey: text('outfit_key').notNull(),
    tryonKey: text('tryon_key').notNull(),
    status: generationStatusEnum('status').notNull().default('pending'),
    scoreJson: jsonb('score_json'),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    generationStartedAt: timestamp('generation_started_at'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('outfit_avatar_outfit_key_idx').on(table.avatarId, table.outfitKey),
    index('outfit_avatar_id_idx').on(table.avatarId),
  ]
);

// ============================================================
// OUTFIT ITEMS — many-to-many: outfit ↔ garment
// ============================================================
export const outfitItem = pgTable(
  'outfit_item',
  {
    id: text('id').primaryKey(),
    outfitId: text('outfit_id')
      .notNull()
      .references(() => outfit.id, { onDelete: 'cascade' }),
    garmentId: text('garment_id')
      .notNull()
      .references(() => garment.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('outfit_item_outfit_garment_idx').on(table.outfitId, table.garmentId),
    index('outfit_item_outfit_id_idx').on(table.outfitId),
  ]
);

// ============================================================
// TRYONS — cached try-on results (by avatar + garments, no occasion)
// ============================================================
export const tryon = pgTable(
  'tryon',
  {
    id: text('id').primaryKey(),
    avatarId: text('avatar_id')
      .notNull()
      .references(() => avatar.id, { onDelete: 'cascade' }),
    tryonKey: text('tryon_key').notNull(),
    status: generationStatusEnum('status').notNull().default('pending'),
    imageUploadId: text('image_upload_id').references(() => upload.id, { onDelete: 'set null' }),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    generationStartedAt: timestamp('generation_started_at'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('tryon_avatar_tryon_key_idx').on(table.avatarId, table.tryonKey),
    index('tryon_avatar_id_idx').on(table.avatarId),
  ]
);

// ============================================================
// RELATIONS
// ============================================================

export const avatarRelations = relations(avatar, ({ one, many }) => ({
  photoUpload: one(upload, {
    fields: [avatar.photoUploadId],
    references: [upload.id],
  }),
  analyses: many(avatarAnalysis),
  outfits: many(outfit),
  tryons: many(tryon),
}));

export const avatarAnalysisRelations = relations(avatarAnalysis, ({ one }) => ({
  avatar: one(avatar, {
    fields: [avatarAnalysis.avatarId],
    references: [avatar.id],
  }),
}));

export const garmentRelations = relations(garment, ({ one }) => ({
  upload: one(upload, {
    fields: [garment.uploadId],
    references: [upload.id],
  }),
}));

export const garmentDetectionRelations = relations(garmentDetection, ({ one }) => ({
  upload: one(upload, {
    fields: [garmentDetection.uploadId],
    references: [upload.id],
  }),
}));

export const outfitRelations = relations(outfit, ({ one, many }) => ({
  avatar: one(avatar, { fields: [outfit.avatarId], references: [avatar.id] }),
  outfitItems: many(outfitItem),
}));

export const outfitItemRelations = relations(outfitItem, ({ one }) => ({
  outfit: one(outfit, { fields: [outfitItem.outfitId], references: [outfit.id] }),
  garment: one(garment, { fields: [outfitItem.garmentId], references: [garment.id] }),
}));

export const tryonRelations = relations(tryon, ({ one }) => ({
  avatar: one(avatar, { fields: [tryon.avatarId], references: [avatar.id] }),
  imageUpload: one(upload, { fields: [tryon.imageUploadId], references: [upload.id] }),
}));

// ============================================================
// GEMINI TOKEN USAGE LOGS — global per-request accounting
// ============================================================

export const tokenUsage = pgTable(
  'token_usage',
  {
    id: text('id').primaryKey(),
    model: text('model').notNull(),
    promptType: text('prompt_type'),
    relatedId: text('related_id'),
    promptTokens: integer('prompt_tokens').notNull().default(0),
    completionTokens: integer('completion_tokens').notNull().default(0),
    totalTokens: integer('total_tokens').notNull().default(0),
    /** Whether the request produced a usable result (valid JSON / image). */
    succeeded: boolean('succeeded').notNull().default(true),
    /** UTC calendar day of the request, for fast daily limits & aggregation. */
    usageDate: date('usage_date')
      .notNull()
      .default(sql`(now() AT TIME ZONE 'UTC')::date`),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('token_usage_usage_date_idx').on(table.usageDate)]
);
