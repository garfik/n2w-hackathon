import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth.schema";

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const avatar = pgTable("avatar", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sourcePhotoKey: text("source_photo_key"),
  bodyProfileJson: jsonb("body_profile_json"),
  heightCm: integer("height_cm"),
  ...timestamps,
});

export const garment = pgTable("garment", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  originalImageKey: text("original_image_key").notNull(),
  garmentProfileJson: jsonb("garment_profile_json"),
  ...timestamps,
});

export const outfitAnalysis = pgTable(
  "outfit_analysis",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    avatarId: text("avatar_id")
      .notNull()
      .references(() => avatar.id, { onDelete: "cascade" }),
    garmentId: text("garment_id")
      .notNull()
      .references(() => garment.id, { onDelete: "cascade" }),
    occasion: text("occasion").notNull(),
    modelVersion: text("model_version").notNull().default("gemini-mvp-v1"),
    scoreJson: jsonb("score_json").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("outfit_analysis_avatar_garment_occasion_version_idx").on(
      table.avatarId,
      table.garmentId,
      table.occasion,
      table.modelVersion,
    ),
    index("outfit_analysis_user_id_idx").on(table.userId),
  ],
);

export const tryonResult = pgTable(
  "tryon_result",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    avatarPhotoKey: text("avatar_photo_key").notNull(),
    garmentPhotoKey: text("garment_photo_key").notNull(),
    modelVersion: text("model_version").notNull().default("gemini-mvp-v1"),
    resultImageKey: text("result_image_key").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("tryon_result_avatar_garment_version_idx").on(
      table.avatarPhotoKey,
      table.garmentPhotoKey,
      table.modelVersion,
    ),
    index("tryon_result_user_id_idx").on(table.userId),
  ],
);

// Relations: user -> many domain entities (separate from auth userRelations)
export const userDomainRelations = relations(user, ({ many }) => ({
  avatars: many(avatar),
  garments: many(garment),
  outfitAnalyses: many(outfitAnalysis),
  tryonResults: many(tryonResult),
}));

export const avatarRelations = relations(avatar, ({ one }) => ({
  user: one(user, {
    fields: [avatar.userId],
    references: [user.id],
  }),
}));

export const garmentRelations = relations(garment, ({ one }) => ({
  user: one(user, {
    fields: [garment.userId],
    references: [user.id],
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
