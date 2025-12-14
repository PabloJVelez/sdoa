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
  testSuite: ({ api, getContainer }) => {
    describe('Store Experience Types API', () => {
      let experienceTypeService: ExperienceTypeModuleService;

      beforeAll(() => {
        const container = getContainer();
        experienceTypeService = container.resolve(EXPERIENCE_TYPE_MODULE);
      });

      describe('GET /store/experience-types', () => {
        it('should return list of active experience types', async () => {
          const response = await api.get('/store/experience-types');
          expect(response.status).toEqual(200);
          expect(response.data).toHaveProperty('experience_types');
          expect(Array.isArray(response.data.experience_types)).toBe(true);
        });

        it('should return experience types ordered by sort_order', async () => {
          const response = await api.get('/store/experience-types');
          expect(response.status).toEqual(200);
          const types = response.data.experience_types;
          
          if (types.length > 1) {
            for (let i = 1; i < types.length; i++) {
              expect(types[i].sort_order).toBeGreaterThanOrEqual(types[i - 1].sort_order);
            }
          }
        });

        it('should only return active experience types', async () => {
          // Create an inactive experience type
          const inactiveType = await experienceTypeService.createExperienceTypes({
            name: 'Inactive Test Type',
            slug: 'inactive-test-type',
            description: 'This should not appear in store API',
            is_active: false,
            pricing_type: 'per_person',
            location_type: 'customer',
            min_party_size: 1,
            sort_order: 0,
          });

          const response = await api.get('/store/experience-types');
          expect(response.status).toEqual(200);
          const types = response.data.experience_types;
          
          const foundInactive = types.find((t: any) => t.id === inactiveType.id);
          expect(foundInactive).toBeUndefined();

          // Cleanup
          await experienceTypeService.deleteExperienceTypes(inactiveType.id);
        });
      });

      describe('GET /store/experience-types/:slug', () => {
        it('should return experience type by slug', async () => {
          // First, get list to find an existing slug
          const listResponse = await api.get('/store/experience-types');
          expect(listResponse.status).toEqual(200);
          
          const types = listResponse.data.experience_types;
          if (types.length > 0) {
            const firstType = types[0];
            const response = await api.get(`/store/experience-types/${firstType.slug}`);
            
            expect(response.status).toEqual(200);
            expect(response.data).toHaveProperty('experience_type');
            expect(response.data.experience_type.slug).toEqual(firstType.slug);
          }
        });

        it('should return 404 for non-existent slug', async () => {
          const response = await api.get('/store/experience-types/non-existent-slug-12345');
          expect(response.status).toEqual(404);
        });
      });
    });

    describe('Admin Experience Types API', () => {
      let experienceTypeService: ExperienceTypeModuleService;
      let createdTypeId: string;

      beforeAll(() => {
        const container = getContainer();
        experienceTypeService = container.resolve(EXPERIENCE_TYPE_MODULE);
      });

      afterAll(async () => {
        // Cleanup created test data
        if (createdTypeId) {
          try {
            await experienceTypeService.deleteExperienceTypes(createdTypeId);
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      });

      describe('GET /admin/experience-types', () => {
        it('should return list of all experience types (including inactive)', async () => {
          const response = await api.get('/admin/experience-types');
          expect(response.status).toEqual(200);
          expect(response.data).toHaveProperty('experience_types');
          expect(Array.isArray(response.data.experience_types)).toBe(true);
        });
      });

      describe('POST /admin/experience-types', () => {
        it('should create a new experience type', async () => {
          const newType = {
            name: 'Test Experience Type',
            slug: 'test-experience-type',
            description: 'A test experience type',
            pricing_type: 'per_person',
            price_per_unit: 15000, // $150.00 in cents
            location_type: 'customer',
            min_party_size: 2,
            max_party_size: 20,
            is_active: true,
            sort_order: 0,
          };

          const response = await api.post('/admin/experience-types', newType);
          expect(response.status).toEqual(201);
          expect(response.data).toHaveProperty('experience_type');
          expect(response.data.experience_type.name).toEqual(newType.name);
          expect(response.data.experience_type.slug).toEqual(newType.slug);
          
          createdTypeId = response.data.experience_type.id;
        });

        it('should auto-generate slug from name if not provided', async () => {
          const newType = {
            name: 'Auto Slug Test',
            description: 'Test with auto-generated slug',
            pricing_type: 'per_person',
            location_type: 'customer',
            min_party_size: 1,
            is_active: true,
            sort_order: 0,
          };

          const response = await api.post('/admin/experience-types', newType);
          expect(response.status).toEqual(201);
          expect(response.data.experience_type.slug).toBeDefined();
          expect(response.data.experience_type.slug).toContain('auto-slug-test');

          // Cleanup
          await experienceTypeService.deleteExperienceTypes(response.data.experience_type.id);
        });

        it('should return 400 for invalid data', async () => {
          const invalidType = {
            name: '', // Empty name should fail
            description: 'Invalid',
          };

          const response = await api.post('/admin/experience-types', invalidType);
          expect(response.status).toEqual(400);
          expect(response.data).toHaveProperty('errors');
        });
      });

      describe('GET /admin/experience-types/:id', () => {
        it('should return experience type by id', async () => {
          // Create a test type first
          const newType = await experienceTypeService.createExperienceTypes({
            name: 'Get Test Type',
            slug: 'get-test-type',
            description: 'For GET test',
            pricing_type: 'per_person',
            location_type: 'customer',
            min_party_size: 1,
            is_active: true,
            sort_order: 0,
          });

          const response = await api.get(`/admin/experience-types/${newType.id}`);
          expect(response.status).toEqual(200);
          expect(response.data.experience_type.id).toEqual(newType.id);
          expect(response.data.experience_type.name).toEqual(newType.name);

          // Cleanup
          await experienceTypeService.deleteExperienceTypes(newType.id);
        });

        it('should return 404 for non-existent id', async () => {
          const response = await api.get('/admin/experience-types/exp_123456789');
          expect(response.status).toEqual(404);
        });
      });

      describe('PUT /admin/experience-types/:id', () => {
        it('should update experience type', async () => {
          // Create a test type first
          const newType = await experienceTypeService.createExperienceTypes({
            name: 'Update Test Type',
            slug: 'update-test-type',
            description: 'For UPDATE test',
            pricing_type: 'per_person',
            location_type: 'customer',
            min_party_size: 1,
            is_active: true,
            sort_order: 0,
          });

          const updateData = {
            name: 'Updated Test Type',
            description: 'Updated description',
            price_per_unit: 20000, // $200.00
          };

          const response = await api.put(`/admin/experience-types/${newType.id}`, updateData);
          expect(response.status).toEqual(200);
          expect(response.data.experience_type.name).toEqual(updateData.name);
          expect(response.data.experience_type.description).toEqual(updateData.description);
          expect(response.data.experience_type.price_per_unit).toEqual(updateData.price_per_unit);

          // Cleanup
          await experienceTypeService.deleteExperienceTypes(newType.id);
        });
      });

      describe('DELETE /admin/experience-types/:id', () => {
        it('should delete experience type', async () => {
          // Create a test type first
          const newType = await experienceTypeService.createExperienceTypes({
            name: 'Delete Test Type',
            slug: 'delete-test-type',
            description: 'For DELETE test',
            pricing_type: 'per_person',
            location_type: 'customer',
            min_party_size: 1,
            is_active: true,
            sort_order: 0,
          });

          const response = await api.delete(`/admin/experience-types/${newType.id}`);
          expect(response.status).toEqual(200);
          expect(response.data.deleted).toBe(true);

          // Verify it's deleted
          const getResponse = await api.get(`/admin/experience-types/${newType.id}`);
          expect(getResponse.status).toEqual(404);
        });
      });
    });
  },
});

