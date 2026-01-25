import { z } from 'zod';
import type { AdminExperienceTypeDTO } from '../../../sdk/admin/admin-experience-types';

const numberOrUndefined = z.preprocess((val) => {
  if (val === '' || val === null || typeof val === 'undefined') {
    return undefined;
  }
  if (typeof val === 'number' && Number.isNaN(val)) {
    return undefined;
  }
  const num = typeof val === 'number' ? val : Number(val);
  return Number.isNaN(num) ? undefined : num;
}, z.number().optional());

const numberOrNull = z.preprocess((val) => {
  if (val === '' || typeof val === 'undefined') {
    return null;
  }
  if (val === null) {
    return null;
  }
  if (typeof val === 'number' && Number.isNaN(val)) {
    return null;
  }
  const num = typeof val === 'number' ? val : Number(val);
  return Number.isNaN(num) ? null : num;
}, z.number().nullable());

export const experienceTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  short_description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  ideal_for: z.string().optional().nullable(),
  pricing_type: z.enum(['per_person', 'per_item', 'product_based']).default('per_person'),
  price_per_unit: numberOrUndefined.optional().nullable(),
  duration_minutes: numberOrUndefined.optional().nullable(),
  duration_display: z.string().optional().nullable(),
  is_product_based: z.boolean().default(false),
  location_type: z.enum(['customer', 'fixed']).default('customer'),
  fixed_location_address: z.string().optional().nullable(),
  requires_advance_notice: z.boolean().default(true),
  advance_notice_days: numberOrUndefined.optional(),
  available_time_slots_input: z.string().optional().default(''),
  time_slot_start: z.string().optional().nullable(),
  time_slot_end: z.string().optional().nullable(),
  time_slot_interval_minutes: numberOrUndefined.optional(),
  min_party_size: numberOrUndefined.optional(),
  max_party_size: numberOrNull.optional(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  sort_order: numberOrUndefined.optional(),
  highlights_input: z.string().optional().default(''),
});

export type ExperienceTypeFormValues = z.infer<typeof experienceTypeSchema>;

const joinCsv = (arr?: string[] | null) => (arr && arr.length ? arr.join(', ') : '');

export const getDefaultExperienceTypeValues = (experienceType?: AdminExperienceTypeDTO): ExperienceTypeFormValues => {
  if (!experienceType) {
    return {
      name: '',
      slug: '',
      description: '',
      short_description: '',
      icon: '',
      image_url: '',
      ideal_for: '',
      pricing_type: 'per_person',
      price_per_unit: undefined,
      duration_minutes: undefined,
      duration_display: '',
      is_product_based: false,
      location_type: 'customer',
      fixed_location_address: '',
      requires_advance_notice: true,
      advance_notice_days: 7,
      available_time_slots_input: '',
      time_slot_start: '09:00',
      time_slot_end: '17:00',
      time_slot_interval_minutes: 30,
      min_party_size: 1,
      max_party_size: null,
      is_active: true,
      is_featured: false,
      sort_order: 0,
      highlights_input: '',
    };
  }

  return {
    name: experienceType.name,
    slug: experienceType.slug,
    description: experienceType.description ?? '',
    short_description: experienceType.short_description ?? '',
    icon: experienceType.icon ?? '',
    image_url: experienceType.image_url ?? '',
    ideal_for: experienceType.ideal_for ?? '',
    pricing_type: experienceType.pricing_type,
    price_per_unit: experienceType.price_per_unit ?? undefined,
    duration_minutes: experienceType.duration_minutes ?? undefined,
    duration_display: experienceType.duration_display ?? '',
    is_product_based: experienceType.is_product_based,
    location_type: experienceType.location_type,
    fixed_location_address: experienceType.fixed_location_address ?? '',
    requires_advance_notice: experienceType.requires_advance_notice,
    advance_notice_days: experienceType.advance_notice_days,
    available_time_slots_input: joinCsv(experienceType.available_time_slots ?? []),
    time_slot_start: experienceType.time_slot_start ?? '',
    time_slot_end: experienceType.time_slot_end ?? '',
    time_slot_interval_minutes: experienceType.time_slot_interval_minutes,
    min_party_size: experienceType.min_party_size,
    max_party_size: experienceType.max_party_size ?? null,
    is_active: experienceType.is_active,
    is_featured: experienceType.is_featured,
    sort_order: experienceType.sort_order,
    highlights_input: joinCsv(experienceType.highlights ?? []),
  };
};
