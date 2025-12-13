import cachified from '@epic-web/cachified';
import { baseMedusaConfig, sdkCache } from '../client.server';
import { MILLIS } from '../cache-builder.server';

export interface StoreExperienceType {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string | null;
  icon?: string | null;
  image_url?: string | null;
  highlights?: string[] | null;
  ideal_for?: string | null;
  pricing_type: 'per_person' | 'per_item' | 'product_based';
  price_per_unit?: number | null;
  duration_minutes?: number | null;
  duration_display?: string | null;
  is_product_based: boolean;
  location_type: 'customer' | 'fixed';
  fixed_location_address?: string | null;
  requires_advance_notice: boolean;
  advance_notice_days: number;
  available_time_slots?: string[] | null;
  time_slot_start?: string | null;
  time_slot_end?: string | null;
  time_slot_interval_minutes: number;
  min_party_size: number;
  max_party_size?: number | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
}

export const fetchExperienceTypes = async (): Promise<StoreExperienceType[]> => {
  return await cachified({
    key: 'experience-types-list',
    cache: sdkCache,
    staleWhileRevalidate: MILLIS.ONE_HOUR,
    ttl: MILLIS.TEN_SECONDS,
    async getFreshValue() {
      const requestUrl = `${baseMedusaConfig.baseUrl}/store/experience-types`;

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-api-key': baseMedusaConfig.publishableKey || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch experience types: ${response.statusText}`);
      }

      const data = await response.json();
      return data.experience_types || [];
    },
  });
};

export const retrieveExperienceTypeBySlug = async (slug: string): Promise<StoreExperienceType | null> => {
  return await cachified({
    key: `experience-type-by-slug-${slug}`,
    cache: sdkCache,
    staleWhileRevalidate: MILLIS.ONE_HOUR,
    ttl: MILLIS.TEN_SECONDS,
    async getFreshValue() {
      const requestUrl = `${baseMedusaConfig.baseUrl}/store/experience-types/${slug}`;

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-api-key': baseMedusaConfig.publishableKey || '',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch experience type: ${response.statusText}`);
      }

      const data = await response.json();
      return data.experience_type || null;
    },
  });
};
