import { medusaIntegrationTestRunner } from '@medusajs/test-utils';
import { EXPERIENCE_TYPE_MODULE } from '../../src/modules/experience-type';
import { CHEF_EVENT_MODULE } from '../../src/modules/chef-event';
import type ExperienceTypeModuleService from '../../src/modules/experience-type/service';
import type ChefEventModuleService from '../../src/modules/chef-event/service';

jest.setTimeout(60 * 1000);

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    // Use MEDUSA_DATABASE_URL if available (like in Medusa v1), otherwise DATABASE_URL
    MEDUSA_DATABASE_URL: process.env.MEDUSA_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
    DATABASE_URL: process.env.MEDUSA_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
  },
  testSuite: ({ api, getContainer }) => {
    describe('Chef Events Flow', () => {
      let experienceTypeService: ExperienceTypeModuleService;
      let chefEventService: ChefEventModuleService;
      let pickupExperienceType: any;
      let eventExperienceType: any;

      beforeAll(async () => {
        const container = getContainer();
        experienceTypeService = container.resolve(EXPERIENCE_TYPE_MODULE);
        chefEventService = container.resolve(CHEF_EVENT_MODULE);

        // Find or create pickup experience type
        pickupExperienceType = await experienceTypeService.getBySlug('pickup');
        if (!pickupExperienceType) {
          pickupExperienceType = await experienceTypeService.createExperienceTypes({
            name: 'Pickup',
            slug: 'pickup',
            description: 'Pickup test type',
            pricing_type: 'product_based',
            is_product_based: true,
            location_type: 'fixed',
            fixed_location_address: '123 Test St, Austin, TX',
            requires_advance_notice: false,
            min_party_size: 1,
            is_active: true,
            sort_order: 1,
          });
        }

        // Find or create event experience type
        eventExperienceType = await experienceTypeService.getBySlug('plated_dinner');
        if (!eventExperienceType) {
          eventExperienceType = await experienceTypeService.createExperienceTypes({
            name: 'Plated Dinner',
            slug: 'plated_dinner',
            description: 'Plated dinner test type',
            pricing_type: 'per_person',
            price_per_unit: 14999,
            is_product_based: false,
            location_type: 'customer',
            requires_advance_notice: true,
            advance_notice_days: 7,
            min_party_size: 2,
            max_party_size: 20,
            is_active: true,
            sort_order: 2,
          });
        }
      });

      describe('Pickup Flow', () => {
        it('should create pickup chef event with selected products', async () => {
          const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
          const pickupEvent = {
            requestedDate: tomorrow.toISOString(), // Full ISO string for datetime
            requestedTime: '14:00',
            partySize: 1,
            eventType: 'pickup',
            experience_type_id: pickupExperienceType.id,
            selected_products: [
              { product_id: 'prod_test_1', quantity: 2 },
              { product_id: 'prod_test_2', quantity: 1 },
            ],
            pickup_time_slot: '14:00',
            pickup_location: pickupExperienceType.fixed_location_address,
            locationType: 'chef_location',
            locationAddress: pickupExperienceType.fixed_location_address,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '5125551234',
          };

          const response = await api.post('/store/chef-events', pickupEvent);
          expect(response.status).toEqual(201);
          expect(response.data.chefEvent).toBeDefined();
          expect(response.data.chefEvent.eventType).toEqual('pickup');
          expect(response.data.chefEvent.experience_type_id).toEqual(pickupExperienceType.id);
          expect(response.data.chefEvent.selected_products).toBeDefined();
          expect(Array.isArray(response.data.chefEvent.selected_products)).toBe(true);
          expect(response.data.chefEvent.selected_products.length).toBe(2);
          expect(response.data.chefEvent.pickup_time_slot).toEqual('14:00');
          expect(response.data.chefEvent.pickup_location).toBeDefined();

          // Cleanup
          await chefEventService.deleteChefEvents(response.data.chefEvent.id);
        });

        it('should require selected_products for pickup events', async () => {
          const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
          const pickupEvent = {
            requestedDate: tomorrow.toISOString(),
            requestedTime: '14:00',
            partySize: 1,
            eventType: 'pickup',
            experience_type_id: pickupExperienceType.id,
            // Missing selected_products
            locationType: 'chef_location',
            locationAddress: pickupExperienceType.fixed_location_address,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
          };

          const response = await api.post('/store/chef-events', pickupEvent);
          // Should fail validation or return error
          expect([400, 422]).toContain(response.status);
        });
      });

      describe('Event Flow (Regression)', () => {
        it('should create plated dinner event with menu', async () => {
          const eventDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000); // 8 days from now
          const event = {
            requestedDate: eventDate.toISOString(),
            requestedTime: '18:00',
            partySize: 4,
            eventType: 'plated_dinner',
            experience_type_id: eventExperienceType.id,
            templateProductId: 'menu_test_123',
            locationType: 'customer_location',
            locationAddress: '123 Customer St, Austin, TX 78701',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            phone: '5125555678',
            notes: 'Test event notes',
          };

          const response = await api.post('/store/chef-events', event);
          expect(response.status).toEqual(201);
          expect(response.data.chefEvent).toBeDefined();
          expect(response.data.chefEvent.eventType).toEqual('plated_dinner');
          expect(response.data.chefEvent.experience_type_id).toEqual(eventExperienceType.id);
          expect(response.data.chefEvent.partySize).toEqual(4);
          expect(response.data.chefEvent.locationAddress).toEqual(event.locationAddress);
          expect(response.data.chefEvent.templateProductId).toEqual('menu_test_123');

          // Cleanup
          await chefEventService.deleteChefEvents(response.data.chefEvent.id);
        });

        it('should require locationAddress for event types', async () => {
          const eventDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
          const event = {
            requestedDate: eventDate.toISOString(),
            requestedTime: '18:00',
            partySize: 4,
            eventType: 'plated_dinner',
            experience_type_id: eventExperienceType.id,
            templateProductId: 'menu_test_123',
            locationType: 'customer_location',
            // Missing locationAddress
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
          };

          const response = await api.post('/store/chef-events', event);
          // Should fail validation
          expect([400, 422]).toContain(response.status);
        });

        it('should require minimum party size for events', async () => {
          const eventDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
          const event = {
            requestedDate: eventDate.toISOString(),
            requestedTime: '18:00',
            partySize: 1, // Below minimum of 2
            eventType: 'plated_dinner',
            experience_type_id: eventExperienceType.id,
            templateProductId: 'menu_test_123',
            locationType: 'customer_location',
            locationAddress: '123 Customer St, Austin, TX 78701',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
          };

          const response = await api.post('/store/chef-events', event);
          // Should fail validation
          expect([400, 422]).toContain(response.status);
        });
      });

      describe('Experience Type Integration', () => {
        it('should link chef event to experience type', async () => {
          const eventDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
          const event = {
            requestedDate: eventDate.toISOString(),
            requestedTime: '18:00',
            partySize: 4,
            eventType: 'plated_dinner',
            experience_type_id: eventExperienceType.id,
            templateProductId: 'menu_test_123',
            locationType: 'customer_location',
            locationAddress: '123 Customer St, Austin, TX 78701',
            firstName: 'Integration',
            lastName: 'Test',
            email: 'integration@example.com',
          };

          const response = await api.post('/store/chef-events', event);
          expect(response.status).toEqual(201);
          expect(response.data.chefEvent.experience_type_id).toEqual(eventExperienceType.id);

          // Verify we can retrieve the experience type from the chef event
          const retrievedEvent = await chefEventService.retrieveChefEvent(response.data.chefEvent.id);
          expect(retrievedEvent.experience_type_id).toEqual(eventExperienceType.id);

          // Cleanup
          await chefEventService.deleteChefEvents(response.data.chefEvent.id);
        });
      });
    });
  },
});

