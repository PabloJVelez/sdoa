import { ProductStatus } from '@medusajs/utils';
import type { CreateProductWorkflowInputDTO } from '@medusajs/framework/types';

/**
 * Bento products seed for pickup testing.
 * Run with:
 *   yarn medusa exec ./dist/scripts/seed/bento-products.js
 * or during dev (ts-node/register available):
 *   yarn medusa exec ./src/scripts/seed/bento-products.ts
 */

export const seedBentoProducts = ({
  sales_channels,
  shipping_profile_id,
}: {
  sales_channels: { id: string }[];
  shipping_profile_id: string;
}): CreateProductWorkflowInputDTO[] => [
  {
    title: 'Salmon Bento Box',
    description: 'Premium salmon sashimi, nigiri, and maki assortment with seasonal sides. Ready for pickup.',
    handle: 'salmon-bento-box',
    status: ProductStatus.PUBLISHED,
    shipping_profile_id,
    thumbnail: 'https://placehold.co/600x400?text=Salmon+Bento',
    images: [
      {
        url: 'https://placehold.co/1200x800?text=Salmon+Bento',
      },
    ],
    options: [
      {
        title: 'Portion',
        values: ['Single'],
      },
    ],
    sales_channels: sales_channels.map(({ id }) => ({ id })),
    variants: [
      {
        title: 'Single',
        sku: 'BENTO-SALMON-SINGLE',
        manage_inventory: false,
        options: {
          Portion: 'Single',
        },
        prices: [
          { amount: 2200, currency_code: 'usd' },
          { amount: 3000, currency_code: 'cad' },
        ],
      },
    ],
  },
  {
    title: 'Chef’s Omakase Bento',
    description: 'Chef-curated omakase bento featuring the best market selections of the day. Pickup only.',
    handle: 'omakase-bento-box',
    status: ProductStatus.PUBLISHED,
    shipping_profile_id,
    thumbnail: 'https://placehold.co/600x400?text=Omakase+Bento',
    images: [
      {
        url: 'https://placehold.co/1200x800?text=Omakase+Bento',
      },
    ],
    options: [
      {
        title: 'Portion',
        values: ['Single'],
      },
    ],
    sales_channels: sales_channels.map(({ id }) => ({ id })),
    variants: [
      {
        title: 'Single',
        sku: 'BENTO-OMAKASE-SINGLE',
        manage_inventory: false,
        options: {
          Portion: 'Single',
        },
        prices: [
          { amount: 3500, currency_code: 'usd' },
          { amount: 4700, currency_code: 'cad' },
        ],
      },
    ],
  },
];

export default async function main({ container }: any) {
  const { createProductsWorkflow, createShippingProfilesWorkflow, createSalesChannelsWorkflow } = await import(
    '@medusajs/medusa/core-flows'
  );
  const { Modules, ContainerRegistrationKeys } = await import('@medusajs/framework/utils');

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);

  // Resolve default shipping profile and sales channels
  let shippingProfiles = await fulfillmentModuleService.listShippingProfiles({ name: 'Default' });
  if (!shippingProfiles.length) {
    const { result: shippingProfileResult } = await createShippingProfilesWorkflow(container).run({
      input: {
        data: [
          {
            name: 'Default',
            type: 'default',
          },
        ],
      },
    });
    shippingProfiles = shippingProfileResult;
  }
  const shippingProfile = shippingProfiles[0];

  let salesChannels = await salesChannelModuleService.listSalesChannels({
    name: 'Default Sales Channel',
  });
  if (!salesChannels.length) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: 'Default Sales Channel',
          },
        ],
      },
    });
    salesChannels = salesChannelResult;
  }

  const productsInput = seedBentoProducts({
    sales_channels: salesChannels.map((sc: any) => ({ id: sc.id })),
    shipping_profile_id: shippingProfile.id,
  });

  logger.info('Seeding bento products...');
  await createProductsWorkflow(container).run({
    input: {
      products: productsInput,
    },
  });
  logger.info('Bento products seeded.');
}
