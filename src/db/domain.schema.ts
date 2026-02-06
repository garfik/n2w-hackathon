import { relations } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

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
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
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
  (table) => [
    // Deduplication by hash (one record per user+hash)
    uniqueIndex('upload_user_sha256_idx').on(table.userId, table.originalSha256),
    index('upload_sha256_idx').on(table.originalSha256),
    index('upload_user_id_idx').on(table.userId),
  ]
);

export const uploadRelations = relations(upload, ({ one, many }) => ({
  user: one(user, {
    fields: [upload.userId],
    references: [user.id],
  }),
  garments: many(garment),
  garmentDetections: many(garmentDetection),
}));

export const avatar = pgTable('avatar', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
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
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    avatarId: text('avatar_id')
      .notNull()
      .references(() => avatar.id, { onDelete: 'cascade' }),
    photoHash: text('photo_hash').notNull(),
    modelVersion: text('model_version').notNull().default('gemini-avatar-v1'),
    responseJson: jsonb('response_json').notNull(),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
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
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
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
    index('garment_user_id_idx').on(table.userId),
    index('garment_category_idx').on(table.category),
    index('garment_upload_id_idx').on(table.uploadId),
  ]
);

export const garmentDetection = pgTable(
  'garment_detection',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
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
  (table) => [
    index('garment_detection_user_id_idx').on(table.userId),
    index('garment_detection_upload_id_idx').on(table.uploadId),
  ]
);

export const outfitAnalysis = pgTable(
  'outfit_analysis',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    avatarId: text('avatar_id')
      .notNull()
      .references(() => avatar.id, { onDelete: 'cascade' }),
    garmentId: text('garment_id')
      .notNull()
      .references(() => garment.id, { onDelete: 'cascade' }),
    occasion: text('occasion').notNull(),
    modelVersion: text('model_version').notNull().default('gemini-mvp-v1'),
    scoreJson: jsonb('score_json').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('outfit_analysis_avatar_garment_occasion_version_idx').on(
      table.avatarId,
      table.garmentId,
      table.occasion,
      table.modelVersion
    ),
    index('outfit_analysis_user_id_idx').on(table.userId),
  ]
);

export const tryonResult = pgTable(
  'tryon_result',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    avatarPhotoKey: text('avatar_photo_key').notNull(),
    garmentPhotoKey: text('garment_photo_key').notNull(),
    modelVersion: text('model_version').notNull().default('gemini-mvp-v1'),
    resultImageKey: text('result_image_key').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('tryon_result_avatar_garment_version_idx').on(
      table.avatarPhotoKey,
      table.garmentPhotoKey,
      table.modelVersion
    ),
    index('tryon_result_user_id_idx').on(table.userId),
  ]
);

export const outfit = pgTable('outfit', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  avatarId: text('avatar_id')
    .notNull()
    .references(() => avatar.id, { onDelete: 'cascade' }),
  occasion: text('occasion').notNull(),
  resultImageKey: text('result_image_key'),
  scoreJson: jsonb('score_json'),
  ...timestamps,
});

export const outfitGarment = pgTable(
  'outfit_garment',
  {
    outfitId: text('outfit_id')
      .notNull()
      .references(() => outfit.id, { onDelete: 'cascade' }),
    garmentId: text('garment_id')
      .notNull()
      .references(() => garment.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.outfitId, table.garmentId] }),
    index('outfit_garment_outfit_id_idx').on(table.outfitId),
  ]
);

// Relations: user -> many domain entities (separate from auth userRelations)
export const userDomainRelations = relations(user, ({ many }) => ({
  avatars: many(avatar),
  avatarAnalyses: many(avatarAnalysis),
  garments: many(garment),
  garmentDetections: many(garmentDetection),
  outfitAnalyses: many(outfitAnalysis),
  tryonResults: many(tryonResult),
  outfits: many(outfit),
  uploads: many(upload),
}));

export const avatarRelations = relations(avatar, ({ one, many }) => ({
  user: one(user, {
    fields: [avatar.userId],
    references: [user.id],
  }),
  photoUpload: one(upload, {
    fields: [avatar.photoUploadId],
    references: [upload.id],
  }),
  analyses: many(avatarAnalysis),
}));

export const avatarAnalysisRelations = relations(avatarAnalysis, ({ one }) => ({
  user: one(user, {
    fields: [avatarAnalysis.userId],
    references: [user.id],
  }),
  avatar: one(avatar, {
    fields: [avatarAnalysis.avatarId],
    references: [avatar.id],
  }),
}));

export const garmentRelations = relations(garment, ({ one }) => ({
  user: one(user, {
    fields: [garment.userId],
    references: [user.id],
  }),
  upload: one(upload, {
    fields: [garment.uploadId],
    references: [upload.id],
  }),
}));

export const garmentDetectionRelations = relations(garmentDetection, ({ one }) => ({
  user: one(user, {
    fields: [garmentDetection.userId],
    references: [user.id],
  }),
  upload: one(upload, {
    fields: [garmentDetection.uploadId],
    references: [upload.id],
  }),
}));

export const outfitAnalysisRelations = relations(outfitAnalysis, ({ one }) => ({
  user: one(user, {
    fields: [outfitAnalysis.userId],
    references: [user.id],
  }),
  avatar: one(avatar, {
    fields: [outfitAnalysis.avatarId],
    references: [avatar.id],
  }),
  garment: one(garment, {
    fields: [outfitAnalysis.garmentId],
    references: [garment.id],
  }),
}));

export const tryonResultRelations = relations(tryonResult, ({ one }) => ({
  user: one(user, {
    fields: [tryonResult.userId],
    references: [user.id],
  }),
}));

export const outfitRelations = relations(outfit, ({ one, many }) => ({
  user: one(user, { fields: [outfit.userId], references: [user.id] }),
  avatar: one(avatar, { fields: [outfit.avatarId], references: [avatar.id] }),
  outfitGarments: many(outfitGarment),
}));

export const outfitGarmentRelations = relations(outfitGarment, ({ one }) => ({
  outfit: one(outfit, { fields: [outfitGarment.outfitId], references: [outfit.id] }),
  garment: one(garment, { fields: [outfitGarment.garmentId], references: [garment.id] }),
}));
