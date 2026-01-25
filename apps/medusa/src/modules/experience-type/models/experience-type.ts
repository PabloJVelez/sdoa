import { model } from '@medusajs/framework/utils';

export const ExperienceType = model.define('experience_type', {
  id: model.id().primaryKey(),

  // Basic Info
  name: model.text(),
  slug: model.text().unique(),
  description: model.text(),
  short_description: model.text().nullable(),

  // Display
  icon: model.text().nullable(), // emoji or image URL
  image_url: model.text().nullable(),
  highlights: model.json().nullable(), // string[]
  ideal_for: model.text().nullable(),

  // Pricing
  pricing_type: model.enum(['per_person', 'per_item', 'product_based']).default('per_person'),
  price_per_unit: model.bigNumber().nullable(), // price in smallest currency unit if per_person/per_item

  // Duration
  duration_minutes: model.number().nullable(),
  duration_display: model.text().nullable(),

  // Flow configuration
  is_product_based: model.boolean().default(false),
  location_type: model.enum(['customer', 'fixed']).default('customer'),
  fixed_location_address: model.text().nullable(),

  // Scheduling
  requires_advance_notice: model.boolean().default(true),
  advance_notice_days: model.number().default(7),

  // Time slots
  available_time_slots: model.json().nullable(), // optional explicit slots e.g. ["09:00","09:30"]
  time_slot_start: model.text().nullable(), // e.g. "09:00"
  time_slot_end: model.text().nullable(), // e.g. "17:00"
  time_slot_interval_minutes: model.number().default(30),

  // Capacity
  min_party_size: model.number().default(1),
  max_party_size: model.number().nullable(),

  // Status & ordering
  is_active: model.boolean().default(true),
  is_featured: model.boolean().default(false),
  sort_order: model.number().default(0),
});

export default ExperienceType;
