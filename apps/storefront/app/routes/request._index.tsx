import { Container } from '@app/components/common/container/Container';
import { getMergedPageMeta } from '@libs/util/page';
import type { LoaderFunctionArgs, MetaFunction, ActionFunctionArgs } from 'react-router';
import { useLoaderData, useSearchParams, redirect } from 'react-router';
import { fetchMenus } from '@libs/util/server/data/menus.server';
import { createChefEventRequest } from '@libs/util/server/data/chef-events.server';
import { fetchExperienceTypes } from '@libs/util/server/data/experience-types.server';
import { fetchProducts } from '@libs/util/server/products.server';
import { getValidatedFormData } from 'remix-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EventRequestForm } from '@app/components/event-request/EventRequestForm';

// Form validation schema
const selectedProductSchema = z.object({
  product_id: z.string(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
});

const selectedProductsField = z.preprocess((val) => {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
  }
  return val;
}, z.array(selectedProductSchema).optional());

export const eventRequestSchema = z
  .object({
    // Step 1: Menu Selection (optional)
    menuId: z.string().optional(),
    selected_products: selectedProductsField,
    experienceTypeId: z.string().optional(),
    experienceTypeSlug: z.string().optional(),

    // Step 2: Event Type Selection
    eventType: z.enum(['plated_dinner', 'buffet_style', 'pickup'], {
      required_error: 'Please select an experience type',
    }),

    // Step 3: Date & Time
    requestedDate: z.string().min(1, 'Please select a date'),

    requestedTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time (HH:MM format)'),

    // Step 4: Party Size
    partySize: z.number().min(1, 'Minimum 1 guest required').max(200, 'Maximum 200 guests allowed'),

    // Step 5: Location (customer for events, fixed for pickup)
    locationAddress: z.string().max(500, 'Address is too long').optional(),

    // Step 6: Contact Details
    firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
    email: z.string().email('Please enter a valid email address').max(255, 'Email address is too long'),
    phone: z
      .string()
      .optional()
      .refine((phone) => {
        if (!phone) return true; // Optional field
        // Remove all non-digits to check length
        const digitsOnly = phone.replace(/\D/g, '');
        return digitsOnly.length === 10;
      }, 'Please enter a valid 10-digit phone number'),

    // Step 7: Special Requests
    specialRequirements: z
      .string()
      .optional()
      .refine((req) => {
        if (!req) return true;
        return req.length <= 1000;
      }, 'Special requirements must be less than 1000 characters'),
    notes: z
      .string()
      .optional()
      .refine((notes) => {
        if (!notes) return true;
        return notes.length <= 1000;
      }, 'Notes must be less than 1000 characters'),

    // Hidden fields
    currentStep: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    const selectedDate = new Date(data.requestedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (data.eventType === 'pickup') {
      if (selectedDate < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['requestedDate'],
          message: 'Pickup date cannot be in the past',
        });
      }
      if (!data.selected_products || data.selected_products.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['selected_products'],
          message: 'Select at least one product',
        });
      }
      // For pickup, location is fixed/admin-provided; no address required from customer.
      return;
    }

    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 7);
    minDate.setHours(0, 0, 0, 0);
    if (selectedDate < minDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['requestedDate'],
        message: 'Events must be scheduled at least 7 days in advance',
      });
    }
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 6);
    if (selectedDate > maxDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['requestedDate'],
        message: 'Events cannot be scheduled more than 6 months in advance',
      });
    }
    if (data.partySize < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['partySize'], message: 'Minimum 2 guests required' });
    }
    if (!data.locationAddress || data.locationAddress.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['locationAddress'],
        message: 'Please provide a complete address',
      });
    }
    const [hours, minutes] = data.requestedTime.split(':').map(Number);
    const startTime = 10 * 60; // 10:00 AM in minutes
    const endTime = 20 * 60 + 30; // 8:30 PM in minutes
    const timeInMinutes = hours * 60 + minutes;
    if (timeInMinutes < startTime || timeInMinutes > endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['requestedTime'],
        message: 'Please select a time between 10:00 AM and 8:30 PM for events',
      });
    }
  });

export type EventRequestFormData = z.infer<typeof eventRequestSchema>;

export const loader = async (args: LoaderFunctionArgs) => {
  try {
    // Fetch menus for menu selector step
    const menusData = await fetchMenus({ limit: 20 });
    const experienceTypes = await fetchExperienceTypes();
    // Fetch products with proper fields to include prices and SKUs
    const products = await fetchProducts(args.request, { 
      limit: 50, 
      fields: 'id,title,thumbnail,variants.*,variants.prices.*,variants.sku' 
    });
    // Filter out event products - check both SKU pattern and title pattern
    const allProducts = products.products || [];
    const filteredProducts = allProducts.filter((p: any) => {
      const hasEventSku = p.variants?.some((v: any) => v.sku?.startsWith('EVENT-'));
      const hasEventTitle = p.title?.includes('Plated Dinner -') || p.title?.includes('Buffet Style -');
      return !hasEventSku && !hasEventTitle;
    });
    return {
      menus: menusData.menus || [],
      experienceTypes,
      products: filteredProducts,
      success: true,
    };
  } catch (error) {
    console.error('Failed to load menus for request page:', error);
    return {
      menus: [],
      experienceTypes: [],
      products: [],
      success: false,
    };
  }
};

export const action = async (actionArgs: ActionFunctionArgs) => {
  try {
    const { errors, data } = await getValidatedFormData<EventRequestFormData>(
      actionArgs.request,
      zodResolver(eventRequestSchema) as any,
    );

    if (errors) {
      return { errors, status: 400 };
    }

    const payload = {
      requestedDate: data.requestedDate,
      requestedTime: data.requestedTime,
      partySize: data.partySize,
      eventType: data.eventType,
      templateProductId: data.menuId,
      selected_products: data.selected_products,
      pickup_time_slot: data.requestedTime,
      pickup_location: data.locationAddress || '',
      experience_type_id: data.experienceTypeId,
      locationType: data.eventType === 'pickup' ? 'chef_location' : 'customer_location',
      locationAddress: data.locationAddress || '',
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      notes: data.notes,
      specialRequirements: data.specialRequirements,
    };

    // Create the chef event request
    const response = await createChefEventRequest(payload);

    const successUrl = `/request/success?eventId=${response.chefEvent.id}`;
    return redirect(successUrl);
  } catch (error) {
    console.error('Failed to create chef event request:', error);

    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }

    return {
      errors: {
        root: {
          message: 'Failed to submit request. Please try again.',
        },
      },
      status: 500,
    };
  }
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: 'Request Your Sushi Experience - Sushi Delivery of Austin' },
    {
      name: 'description',
      content:
        'Book a personalized sushi experience. Order bento boxes for pickup or request an omakase dinner in your home.',
    },
    { property: 'og:title', content: 'Request Your Sushi Experience - Sushi Delivery of Austin' },
    {
      property: 'og:description',
      content:
        'Submit a request for your personalized sushi experience. Your request will be reviewed and a custom proposal will be created for your event.',
    },
    { property: 'og:type', content: 'website' },
    {
      name: 'keywords',
      content:
        'request event, book sushi chef, omakase austin, bento box pickup, private sushi dining, sushi experience',
    },
  ];
};

export default function RequestPage() {
  const { menus, experienceTypes, products } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  // Get initial values from URL params (e.g., pre-selected menu or event type)
  const initialValues = {
    menuId: searchParams.get('menu') || undefined,
    eventType: (searchParams.get('type') as EventRequestFormData['eventType']) || undefined,
  };

  return (
    <Container className="py-12 lg:py-16 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-italiana text-primary-900 mb-4">Request Your Sushi Experience</h1>
        <p className="text-lg text-primary-600 max-w-2xl mx-auto">
          Tell us about your event and we'll create a personalized proposal for your sushi experience.
        </p>
      </div>

      <EventRequestForm
        menus={menus}
        experienceTypes={experienceTypes}
        products={products}
        initialValues={initialValues}
      />
    </Container>
  );
}
