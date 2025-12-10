import { EXPERIENCE_TYPE_MODULE } from '../../modules/experience-type';
import type ExperienceTypeModuleService from '../../modules/experience-type/service';
import type { ExecArgs } from '@medusajs/types';

export async function seedExperienceTypes({ container }: ExecArgs) {
  const svc = container.resolve(EXPERIENCE_TYPE_MODULE) as ExperienceTypeModuleService;

  const existing = await svc.listExperienceTypes({});
  if (existing.length > 0) {
    return existing;
  }

  const seedData = [
    {
      name: 'Pickup',
      slug: 'pickup',
      description: 'Fresh sushi and bento boxes ready for pickup.',
      short_description: 'Quick & convenient',
      icon: '🥡',
      highlights: [
        'Chef will review your requested pickup time',
        'If the exact time is unavailable, a close alternative will be suggested',
        'Premium ingredients',
        'Eco-friendly packaging',
      ],
      ideal_for: 'Quick lunch, Office catering, Dinner at home',
      pricing_type: 'product_based',
      price_per_unit: null,
      is_product_based: true,
      location_type: 'fixed',
      fixed_location_address: '123 Main St, Austin, TX 78701', // placeholder
      requires_advance_notice: false,
      advance_notice_days: 0,
      time_slot_start: '09:00',
      time_slot_end: '17:00',
      time_slot_interval_minutes: 30,
      min_party_size: 1,
      max_party_size: null,
      is_active: true,
      is_featured: false,
      sort_order: 1,
    },
    {
      name: 'Plated Dinner',
      slug: 'plated_dinner',
      description: 'Elegant omakase-style dining with multiple courses served individually.',
      short_description: 'Restaurant-quality at home',
      icon: '🍽️',
      highlights: [
        'Multi-course omakase menu',
        'Premium fish selection',
        'Full-service dining',
        'Chef-presented courses',
      ],
      ideal_for: 'Anniversaries, proposals, formal celebrations',
      pricing_type: 'per_person',
      is_product_based: false,
      location_type: 'customer',
      requires_advance_notice: true,
      advance_notice_days: 7,
      duration_display: '4 hours',
      duration_minutes: 240,
      min_party_size: 2,
      max_party_size: null,
      is_active: true,
      is_featured: true,
      sort_order: 2,
    },
    {
      name: 'Buffet Style',
      slug: 'buffet_style',
      description: 'A variety of sushi and Japanese dishes served buffet-style.',
      short_description: 'Perfect for groups',
      icon: '🥘',
      highlights: ['Sushi platters', 'Hot & cold dishes', 'Self-service style', 'Great for mingling'],
      ideal_for: 'Birthday parties, family gatherings, corporate events',
      pricing_type: 'per_person',
      is_product_based: false,
      location_type: 'customer',
      requires_advance_notice: true,
      advance_notice_days: 7,
      duration_display: '2.5 hours',
      duration_minutes: 150,
      min_party_size: 2,
      max_party_size: null,
      is_active: true,
      is_featured: false,
      sort_order: 3,
    },
  ] as any[];

  const created = await svc.createExperienceTypes(seedData);
  return created;
}

// Medusa exec entrypoint
export default async function main(execArgs: ExecArgs) {
  await seedExperienceTypes(execArgs);
}
