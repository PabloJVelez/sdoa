import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from 'zod';
import { createChefEventWorkflow } from '../../../workflows/create-chef-event';

// Validation schema for store chef event requests
const productSelectionSchema = z
  .array(
    z.object({
      product_id: z.string(),
      quantity: z.number().min(1),
    }),
  )
  .optional();

const createStoreChefEventSchema = z.object({
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
  locationAddress: z.string().min(3, 'Address must be at least 3 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  notes: z.string().optional(),
  specialRequirements: z.string().optional(),
});

// Pricing structure as defined in the business rules
const PRICING_STRUCTURE = {
  buffet_style: 99.99,
  plated_dinner: 149.99,
} as const;

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const logger = req.scope.resolve('logger');

  try {
    const validatedData = createStoreChefEventSchema.parse(req.body);

    // Auto-calculate pricing based on event type and party size
    const pricePerPerson = PRICING_STRUCTURE[validatedData.eventType as 'plated_dinner' | 'buffet_style'] ?? 0;
    const totalPrice =
      validatedData.eventType === 'pickup'
        ? 0 // pricing handled later via product page link
        : pricePerPerson * validatedData.partySize;

    // Create chef event request with calculated pricing and pending status
    const { result } = await createChefEventWorkflow(req.scope).run({
      input: {
        ...validatedData,
        status: 'pending', // Always pending for customer requests
        totalPrice,
        depositPaid: false, // No deposit required as per business rules
      },
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
