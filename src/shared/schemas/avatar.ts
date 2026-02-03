import { z } from 'zod';

export const AvatarBodyProfileSchema = z.object({
  shoulder_width_class: z.enum(['narrow', 'average', 'wide']),
  hip_vs_shoulder: z.enum(['hips_wider', 'equal', 'shoulders_wider']),
  waist_definition: z.enum(['defined', 'moderate', 'low']),
  torso_vs_legs: z.enum(['short_torso', 'balanced', 'long_torso']),
  body_shape_label: z.enum(['hourglass', 'pear', 'rectangle', 'apple', 'inverted_triangle']),
  confidence: z.object({
    shoulder_width_class: z.number().min(0).max(1),
    hip_vs_shoulder: z.number().min(0).max(1),
    waist_definition: z.number().min(0).max(1),
    torso_vs_legs: z.number().min(0).max(1),
    body_shape_label: z.number().min(0).max(1),
  }),
  issues: z.array(z.string()).default([]),
});

export type AvatarBodyProfile = z.output<typeof AvatarBodyProfileSchema>;

export const AvatarAnalysisErrorCode = z.enum([
  'MULTIPLE_PEOPLE',
  'MULTIPLE_FACES',
  'NOT_FULL_BODY',
  'TOO_OCCLUDED',
  'LOW_QUALITY',
]);

export const AvatarAnalysisErrorSchema = z.object({
  code: AvatarAnalysisErrorCode,
  message: z.string(),
  issues: z.array(z.string()).default([]),
});

export type AvatarAnalysisError = z.output<typeof AvatarAnalysisErrorSchema>;

export const AvatarAnalysisResultSchema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: AvatarBodyProfileSchema,
  }),
  z.object({
    success: z.literal(false),
    error: AvatarAnalysisErrorSchema,
  }),
]);

export type AvatarAnalysisResult = z.output<typeof AvatarAnalysisResultSchema>;
