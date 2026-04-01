import { Calendar, ListBullet, Sparkles } from '@medusajs/icons';
import type { MenuConfig } from '@unlockable/vite-plugin-unlock/medusa';

/**
 * Patch core sidebar (main-layout useCoreRoutes).
 * - Drop Inventory and Price Lists.
 * - Add Menus, Events, and Experiences (experience-types route) as top-level items.
 * Paths in `add` match extension routes so those entries are hidden from the Extensions section.
 */
const config: MenuConfig = {
  remove: ['/inventory', '/price-lists'],
  add: [
    {
      icon: Calendar,
      label: 'Events',
      to: '/chef-events',
    },
    {
      icon: ListBullet,
      label: 'Menus',
      to: '/menus',
    },
    {
      icon: Sparkles,
      label: 'Experiences',
      to: '/experience-types',
    },
  ],
  order: [
    '/chef-events',
    '/orders',
    '/menus',
    '/experience-types',
    '/products',
    '/customers',
    '/promotions',
  ],
};

export default config;
