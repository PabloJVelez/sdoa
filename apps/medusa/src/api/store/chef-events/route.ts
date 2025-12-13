import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from 'zod';
import { createChefEventWorkflow } from '../../../workflows/create-chef-event';
import { EXPERIENCE_TYPE_MODULE } from '../../../modules/experience-type';
import type ExperienceTypeModuleService from '../../../modules/experience-type/service';

// Validation schema for store chef event requests
const productSelectionSchema = z
  .array(
    z.object({
      product_id: z.string(),
      quantity: z.number().min(1),
    }),
  )
  .optional();

const createStoreChefEventSchema = z
  .object({
    requestedDate: z.string().datetime(),
    requestedTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    partySize: z.number().min(1, 'Minimum party size is 1').max(200, 'Party size too large'),
    eventType: z.enum(['plated_dinner', 'buffet_style', 'pickup']),
    templateProductId: z.string().optional(),
    selected_products: productSelectionSchema,
    pickup_time_slot: z.string().optional().nullable(),
    pickup_location: z.string().optional().nullable(),
    experience_type_id: z.string().optional().nullable(),
    locationType: z.enum(['customer_location', 'chef_location']),
    locationAddress: z.string().optional(),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().optional(),
    notes: z.string().optional(),
    specialRequirements: z.string().optional(),
  })
  .refine((data) => {
    if (data.eventType === 'pickup') {
      return true;
    }
    return !!data.locationAddress && data.locationAddress.length >= 3;
  }, 'Address must be at least 3 characters for events');

// Fallback pricing structure (used only if experience type not found or has no price)
const FALLBACK_PRICING = {
  buffet_style: 99.99,
  plated_dinner: 149.99,
} as const;

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const logger = req.scope.resolve('logger');

  try {
    const validatedData = createStoreChefEventSchema.parse(req.body);

    // Calculate pricing based on experience type if available, otherwise use fallback
    let pricePerPerson = 0;
    if (validatedData.eventType !== 'pickup') {
      if (validatedData.experience_type_id) {
        try {
          const experienceTypeService = req.scope.resolve(EXPERIENCE_TYPE_MODULE) as ExperienceTypeModuleService;
          const experienceType = await (experienceTypeService as any).retrieveExperienceType(
            validatedData.experience_type_id,
          );

          if (experienceType?.price_per_unit != null) {
            // price_per_unit is stored in smallest currency unit (cents), convert to dollars
            const priceInCents =
              typeof experienceType.price_per_unit === 'object' && 'value' in experienceType.price_per_unit
                ? Number(experienceType.price_per_unit.value)
                : Number(experienceType.price_per_unit);
            pricePerPerson = priceInCents / 100;
          } else {
            // Fallback to hardcoded pricing if experience type has no price
            pricePerPerson = FALLBACK_PRICING[validatedData.eventType as 'plated_dinner' | 'buffet_style'] ?? 0;
          }
        } catch (error) {
          logger.warn(
            `Failed to retrieve experience type ${validatedData.experience_type_id}, using fallback pricing: ${error instanceof Error ? error.message : String(error)}`,
          );
          // Fallback to hardcoded pricing if experience type retrieval fails
          pricePerPerson = FALLBACK_PRICING[validatedData.eventType as 'plated_dinner' | 'buffet_style'] ?? 0;
        }
      } else {
        // No experience_type_id provided, use fallback
        pricePerPerson = FALLBACK_PRICING[validatedData.eventType as 'plated_dinner' | 'buffet_style'] ?? 0;
      }
    }

    const totalPrice =
      validatedData.eventType === 'pickup'
        ? 0 // pricing handled later via product page link
        : pricePerPerson * validatedData.partySize;

    const resolvedLocationAddress =
      validatedData.eventType === 'pickup' ? validatedData.pickup_location || '' : validatedData.locationAddress || '';

    // Normalize experience_type_id: convert empty string to null
    const normalizedExperienceTypeId =
      validatedData.experience_type_id && validatedData.experience_type_id.trim() !== ''
        ? validatedData.experience_type_id
        : null;

    // Normalize templateProductId: convert empty string to undefined for optional field
    const normalizedTemplateProductId =
      validatedData.templateProductId && validatedData.templateProductId.trim() !== ''
        ? validatedData.templateProductId
        : undefined;

    // Create chef event request with calculated pricing and pending status
    const workflowInput = {
      ...validatedData,
      experience_type_id: normalizedExperienceTypeId,
      templateProductId: normalizedTemplateProductId,
      locationAddress: resolvedLocationAddress,
      pickup_time_slot:
        validatedData.eventType === 'pickup' ? validatedData.requestedTime : validatedData.pickup_time_slot,
      status: 'pending' as const, // Always pending for customer requests
      totalPrice,
      depositPaid: false, // No deposit required as per business rules
    };

    const { result } = await createChefEventWorkflow(req.scope).run({
      input: workflowInput,
    });

    res.status(200).json({
      chefEvent: result.chefEvent,
      message: 'Event request submitted successfully. You will receive a response within 24-48 hours.',
    });
  } catch (error) {
    logger.error(`Error creating store chef event request: ${error instanceof Error ? error.message : String(error)}`);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        message: 'Validation error',
        errors: error.errors,
      });
      return;
    }

    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
