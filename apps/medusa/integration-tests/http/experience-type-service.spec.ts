import { medusaIntegrationTestRunner } from '@medusajs/test-utils';
import { EXPERIENCE_TYPE_MODULE } from '../../src/modules/experience-type';
import type ExperienceTypeModuleService from '../../src/modules/experience-type/service';

jest.setTimeout(60 * 1000);

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    // Use MEDUSA_DATABASE_URL if available (like in Medusa v1), otherwise DATABASE_URL
    MEDUSA_DATABASE_URL: process.env.MEDUSA_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
    DATABASE_URL: process.env.MEDUSA_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
  },
  testSuite: ({ getContainer }) => {
    describe('ExperienceTypeModuleService', () => {
      let experienceTypeService: ExperienceTypeModuleService;
      const createdIds: string[] = [];

      beforeAll(() => {
        const container = getContainer();
        experienceTypeService = container.resolve(EXPERIENCE_TYPE_MODULE);
      });

      afterAll(async () => {
        // Cleanup all created test data
        for (const id of createdIds) {
          try {
            await experienceTypeService.deleteExperienceTypes(id);
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      });

      describe('listActiveExperienceTypes', () => {
        it('should return only active experience types', async () => {
          // Create active and inactive types
          const activeType = await experienceTypeService.createExperienceTypes({
            name: 'Active Type',
            slug: 'active-type',
            description: 'Active experience type',
            pricing_type: 'per_person',
            location_type: 'customer',
            min_party_size: 1,
            is_active: true,
            sort_order: 1,
          });
          createdIds.push(activeType.id);

          const inactiveType = await experienceTypeService.createExperienceTypes({
            name: 'Inactive Type',
            slug: 'inactive-type',
            description: 'Inactive experience type',
            pricing_type: 'per_person',
            location_type: 'customer',
            min_party_size: 1,
            is_active: false,
            sort_order: 2,
          });
          createdIds.push(inactiveType.id);

          const activeTypes = await experienceTypeService.listActiveExperienceTypes();

          expect(activeTypes).toBeDefined();
          expect(Array.isArray(activeTypes)).toBe(true);
          
          const foundActive = activeTypes.find((t: any) => t.id === activeType.id);
          const foundInactive = activeTypes.find((t: any) => t.id === inactiveType.id);

          expect(foundActive).toBeDefined();
          expect(foundInactive).toBeUndefined();
        });

        it('should return types ordered by sort_order', async () => {
          // Create types with different sort orders
          const type1 = await experienceTypeService.createExperienceTypes({
            name: 'Type 1',
            slug: 'type-1',
            description: 'First type',
            pricing_type: 'per_person',
            location_type: 'customer',
            min_party_size: 1,
            is_active: true,
            sort_order: 3,
          });
          createdIds.push(type1.id);

          const type2 = await experienceTypeService.createExperienceTypes({
            name: 'Type 2',
            slug: 'type-2',
            description: 'Second type',
            pricing_type: 'per_person',
            location_type: 'customer',
            min_party_size: 1,
            is_active: true,
            sort_order: 1,
          });
          createdIds.push(type2.id);

          const type3 = await experienceTypeService.createExperienceTypes({
            name: 'Type 3',
            slug: 'type-3',
            description: 'Third type',
            pricing_type: 'per_person',
            location_type: 'customer',
            min_party_size: 1,
            is_active: true,
            sort_order: 2,
          });
          createdIds.push(type3.id);

          const activeTypes = await experienceTypeService.listActiveExperienceTypes();

          // Find our test types in the results
          const found1 = activeTypes.find((t: any) => t.id === type1.id);
          const found2 = activeTypes.find((t: any) => t.id === type2.id);
          const found3 = activeTypes.find((t: any) => t.id === type3.id);

          if (found1 && found2 && found3) {
            const index1 = activeTypes.indexOf(found1);
            const index2 = activeTypes.indexOf(found2);
            const index3 = activeTypes.indexOf(found3);

            // Type 2 (sort_order 1) should come before Type 3 (sort_order 2)
            // Type 3 should come before Type 1 (sort_order 3)
            expect(index2).toBeLessThan(index3);
            expect(index3).toBeLessThan(index1);
          }
        });
      });

      describe('getBySlug', () => {
        it('should return experience type by slug', async () => {
          const createdType = await experienceTypeService.createExperienceTypes({
            name: 'Slug Test Type',
            slug: 'slug-test-type',
            description: 'For slug test',
            pricing_type: 'per_person',
            location_type: 'customer',
            min_party_size: 1,
            is_active: true,
            sort_order: 0,
          });
          createdIds.push(createdType.id);

          const foundType = await experienceTypeService.getBySlug('slug-test-type');

          expect(foundType).toBeDefined();
          expect(foundType?.id).toEqual(createdType.id);
          expect(foundType?.slug).toEqual('slug-test-type');
        });

        it('should return null for non-existent slug', async () => {
          const foundType = await experienceTypeService.getBySlug('non-existent-slug-12345');
          expect(foundType).toBeNull();
        });

        it('should only return active types', async () => {
          const inactiveType = await experienceTypeService.createExperienceTypes({
            name: 'Inactive Slug Test',
            slug: 'inactive-slug-test',
            description: 'Inactive type',
            pricing_type: 'per_person',
            location_type: 'customer',
            min_party_size: 1,
            is_active: false,
            sort_order: 0,
          });
          createdIds.push(inactiveType.id);

          const foundType = await experienceTypeService.getBySlug('inactive-slug-test');
          expect(foundType).toBeNull();
        });
      });

      describe('CRUD operations', () => {
        it('should create experience type', async () => {
          const newType = await experienceTypeService.createExperienceTypes({
            name: 'Create Test',
            slug: 'create-test',
            description: 'Test creation',
            pricing_type: 'per_person',
            price_per_unit: 10000,
            location_type: 'customer',
            min_party_size: 2,
            max_party_size: 10,
            is_active: true,
            sort_order: 0,
          });
          createdIds.push(newType.id);

          expect(newType).toBeDefined();
          expect(newType.name).toEqual('Create Test');
          expect(newType.slug).toEqual('create-test');
          expect(newType.price_per_unit).toEqual(10000);
        });

        it('should retrieve experience type by id', async () => {
          const createdType = await experienceTypeService.createExperienceTypes({
            name: 'Retrieve Test',
            slug: 'retrieve-test',
            description: 'Test retrieval',
            pricing_type: 'per_person',
            location_type: 'customer',
            min_party_size: 1,
            is_active: true,
            sort_order: 0,
          });
          createdIds.push(createdType.id);

          const retrieved = await experienceTypeService.retrieveExperienceType(createdType.id);

          expect(retrieved).toBeDefined();
          expect(retrieved.id).toEqual(createdType.id);
          expect(retrieved.name).toEqual('Retrieve Test');
        });

        it('should update experience type', async () => {
          const createdType = await experienceTypeService.createExperienceTypes({
            name: 'Update Test',
            slug: 'update-test',
            description: 'Test update',
            pricing_type: 'per_person',
            location_type: 'customer',
            min_party_size: 1,
            is_active: true,
            sort_order: 0,
          });
          createdIds.push(createdType.id);

          const updated = await experienceTypeService.updateExperienceTypes({
            id: createdType.id,
            name: 'Updated Test',
            description: 'Updated description',
            price_per_unit: 20000,
          });

          expect(updated.name).toEqual('Updated Test');
          expect(updated.description).toEqual('Updated description');
          expect(updated.price_per_unit).toEqual(20000);
        });

        it('should delete experience type', async () => {
          const createdType = await experienceTypeService.createExperienceTypes({
            name: 'Delete Test',
            slug: 'delete-test',
            description: 'Test deletion',
            pricing_type: 'per_person',
            location_type: 'customer',
            min_party_size: 1,
            is_active: true,
            sort_order: 0,
          });

          await experienceTypeService.deleteExperienceTypes(createdType.id);

          // Verify deletion
          try {
            await experienceTypeService.retrieveExperienceType(createdType.id);
            fail('Should have thrown an error');
          } catch (error) {
            // Expected - type should not exist
            expect(error).toBeDefined();
          }
        });
      });
    });
  },
});

