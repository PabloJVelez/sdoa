import { useState, useEffect } from 'react';
import { Button } from '@app/components/common/buttons/Button';
import { ActionList } from '@app/components/common/actions-list/ActionList';
import type { StoreMenuDTO } from '@app/../types/menus';
import type { StoreProduct } from '@medusajs/types';
import type { StoreExperienceType } from '@libs/util/server/data/experience-types.server';
import type { EventRequestFormData } from '@app/routes/request._index';
import { RemixFormProvider, useRemixForm } from 'remix-hook-form';
import { useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { eventRequestSchema } from '@app/routes/request._index';
import { useActionData } from 'react-router';
import clsx from 'clsx';
import type { FC } from 'react';
import { Disclosure } from '@headlessui/react';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';

// Real form step components
import { MenuSelector } from './MenuSelector';
import { EventTypeSelector } from './EventTypeSelector';
import { PartySizeSelector } from './PartySizeSelector';
import { DateTimeForm } from './DateTimeForm';
import { LocationForm } from './LocationForm';
import { ContactDetails } from './ContactDetails';
import { SpecialRequests } from './SpecialRequests';
import { RequestSummary } from './RequestSummary';
import { ProductSelector } from './ProductSelector';
import { PickupLocationDisplay } from './PickupLocationDisplay';

export interface EventRequestFormProps {
  menus: StoreMenuDTO[];
  experienceTypes: StoreExperienceType[];
  products: StoreProduct[];
  initialValues?: Partial<EventRequestFormData>;
}

// Type for action response
interface ActionResponse {
  success?: boolean;
  eventId?: string;
  redirectTo?: string;
  message?: string;
  errors?: any;
}

const STEPS = [
  {
    id: 1,
    title: 'Experience & Menu',
    subtitle: 'Choose your culinary experience, select a menu template, and tell us how many guests',
  },
  {
    id: 2,
    title: 'Schedule, Contact & Location',
    subtitle: 'Select date/time, provide contact info, and enter the event address',
  },
  { id: 3, title: 'Special Requests', subtitle: 'Any dietary restrictions or notes?' },
  { id: 4, title: 'Review & Submit', subtitle: 'Confirm your event details' },
];

export const EventRequestForm: FC<EventRequestFormProps> = ({
  menus,
  experienceTypes,
  products,
  initialValues = {},
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const actionData = useActionData() as ActionResponse;

  const defaultValues: Partial<EventRequestFormData> = {
    currentStep: 1,
    partySize: 4, // Default party size
    requestedTime: '',
    requestedDate: '',
    firstName: '',
    lastName: '',
    email: '',
    locationAddress: '',
    selected_products: [],
    ...initialValues,
  };

  const form = useRemixForm<EventRequestFormData>({
    resolver: zodResolver(eventRequestSchema) as any,
    defaultValues,
    mode: 'onChange', // Validate on change for better UX
  });

  // Handle action data errors
  useEffect(() => {
    // Process action data if present
  }, [actionData]);

  // Scroll to top whenever step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Auto-set location and defaults when switching to pickup (product-based)
  const currentEventType = useWatch({
    control: form.control,
    name: 'eventType',
  });

  useEffect(() => {
    const v = form.getValues();
    const exp = experienceTypes.find((e) => e.slug === currentEventType);
    if (!exp || !exp.is_product_based) return;

    if (exp.fixed_location_address && v.locationAddress !== exp.fixed_location_address) {
      form.setValue('locationAddress', exp.fixed_location_address, { shouldValidate: true, shouldDirty: false });
    }

    if (!v.partySize || v.partySize < 1) {
      form.setValue('partySize', 1, { shouldValidate: true, shouldDirty: false });
    }
  }, [form, experienceTypes, currentEventType]);

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    const values = form.getValues();
    const errors = form.formState.errors;
    const experience = experienceTypes.find((e) => e.slug === values.eventType);

    switch (currentStep) {
      case 1:
        // Experience required, party size required
        if (experience?.is_product_based) {
          return (
            !!values.eventType &&
            !errors.eventType &&
            (values.selected_products?.length || 0) > 0 &&
            !errors.selected_products
          );
        }
        return (
          !!values.eventType &&
          !errors.eventType &&
          !!values.menuId &&
          values.partySize >= (experience?.min_party_size ?? 2) &&
          (experience?.max_party_size ? values.partySize <= experience.max_party_size : true) &&
          !errors.partySize
        );
      case 2: {
        const isProductBased = experience?.is_product_based;
        const locationOk = isProductBased
          ? true
          : !!values.locationAddress && values.locationAddress.length >= 10 && !errors.locationAddress;
        return (
          !!values.requestedDate &&
          !!values.requestedTime &&
          !errors.requestedDate &&
          !errors.requestedTime &&
          !!values.firstName &&
          !!values.lastName &&
          !!values.email &&
          !errors.firstName &&
          !errors.lastName &&
          !errors.email &&
          (!values.phone || !errors.phone) &&
          locationOk
        );
      }
      case 3:
        // Special requests optional but must be valid if provided
        return !errors.specialRequirements && !errors.notes;
      case 4:
        // No validation errors on final step
        return Object.keys(errors).length === 0;
      default:
        return false;
    }
  };

  const isAllComplete = () => {
    const v = form.getValues();
    const e = form.formState.errors;
    const exp = experienceTypes.find((x) => x.slug === v.eventType);
    const step1 = exp?.is_product_based
      ? !!v.eventType && !e.eventType && (v.selected_products?.length || 0) > 0 && !e.selected_products
      : !!v.menuId &&
        !!v.eventType &&
        !e.eventType &&
        v.partySize >= (exp?.min_party_size ?? 2) &&
        (exp?.max_party_size ? v.partySize <= exp.max_party_size : true) &&
        !e.partySize;
    const step2Date = !!v.requestedDate && !!v.requestedTime && !e.requestedDate && !e.requestedTime;
    const step2Contact =
      !!v.firstName && !!v.lastName && !!v.email && !e.firstName && !e.lastName && !e.email && (!v.phone || !e.phone);
    const step2Location =
      exp?.is_product_based || (!!v.locationAddress && v.locationAddress.length >= 10 && !e.locationAddress);
    return step1 && step2Date && step2Contact && step2Location; // step3 (special requests) is optional
  };

  const renderSectionHeader = (label: string, opts?: { complete?: boolean; optional?: boolean }) => (
    <div className="flex items-center gap-3">
      <h4 className="text-base font-semibold text-primary-900">{label}</h4>
      <span
        className={clsx(
          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs',
          opts?.optional
            ? 'border-gray-300 text-gray-600'
            : opts?.complete
              ? 'border-green-300 text-green-700 bg-green-50'
              : 'border-gray-300 text-gray-600 bg-gray-50',
        )}
      >
        {opts?.optional ? 'Optional' : opts?.complete ? 'Complete' : 'Incomplete'}
      </span>
    </div>
  );

  const renderDisclosure = (args: {
    defaultOpen?: boolean;
    header: React.ReactNode;
    children: React.ReactNode;
    key?: string;
  }) => (
    <Disclosure key={args.key} defaultOpen={args.defaultOpen}>
      {({ open }) => (
        <div
          className={clsx(
            'rounded-lg border bg-white transition-colors shadow-sm',
            open ? 'border-accent-300 ring-1 ring-accent-200' : 'border-gray-200 hover:border-gray-300',
          )}
        >
          <Disclosure.Button className="w-full px-4 py-3 text-left">
            <div className="flex items-center justify-between">
              <div>{args.header}</div>
              <ChevronDownIcon className={clsx('h-5 w-5 text-gray-500 transition-transform', open && 'rotate-180')} />
            </div>
          </Disclosure.Button>
          <Disclosure.Panel className="px-4 pb-4">{args.children}</Disclosure.Panel>
        </div>
      )}
    </Disclosure>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {(() => {
              const v = form.getValues();
              const e = form.formState.errors;
              const experience = experienceTypes.find((ex) => ex.slug === v.eventType);
              const isProductBased = experience?.is_product_based;
              const minParty = experience?.min_party_size ?? 2;
              const maxParty = experience?.max_party_size ?? 50;
              const isEventTypeComplete = !!v.eventType && !e.eventType;
              const isPartySizeComplete =
                v.partySize >= minParty && (!experience?.max_party_size || v.partySize <= maxParty) && !e.partySize;
              const isMenuSelected = !!v.menuId;
              const isProductsSelected = (v.selected_products?.length || 0) > 0;
              return (
                <>
                  {renderDisclosure({
                    key: `step1-experience-${currentStep}`,
                    defaultOpen: true,
                    header: renderSectionHeader('Experience Type', { complete: isEventTypeComplete }),
                    children: <EventTypeSelector experienceTypes={experienceTypes} />,
                  })}

                  {isProductBased
                    ? renderDisclosure({
                        key: `step1-products-${currentStep}`,
                        defaultOpen: isEventTypeComplete,
                        header: renderSectionHeader('Select Products', {
                          complete: isProductsSelected,
                        }),
                        children: <ProductSelector products={products} />,
                      })
                    : renderDisclosure({
                        key: `step1-menu-${currentStep}`,
                        defaultOpen: isEventTypeComplete,
                        header: renderSectionHeader('Select a Menu', { complete: isMenuSelected }),
                        children: <MenuSelector menus={menus} />,
                      })}

                  {!isProductBased &&
                    renderDisclosure({
                      key: `step1-guests-${currentStep}`,
                      defaultOpen: false,
                      header: renderSectionHeader('Number of Guests', { complete: isPartySizeComplete }),
                      children: <PartySizeSelector />,
                    })}
                </>
              );
            })()}
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            {(() => {
              const v = form.getValues();
              const e = form.formState.errors;
              const experience = experienceTypes.find((ex) => ex.slug === v.eventType);
              const isProductBased = experience?.is_product_based;
              const isDateComplete = !!v.requestedDate && !!v.requestedTime && !e.requestedDate && !e.requestedTime;
              const isContactComplete =
                !!v.firstName &&
                !!v.lastName &&
                !!v.email &&
                !e.firstName &&
                !e.lastName &&
                !e.email &&
                (!v.phone || !e.phone);
              const isLocationComplete = !!v.locationAddress && v.locationAddress.length >= 10 && !e.locationAddress;

              return (
                <>
                  {renderDisclosure({
                    key: `step2-date-${currentStep}`,
                    defaultOpen: true,
                    header: renderSectionHeader('Date & Time', { complete: isDateComplete }),
                    children: <DateTimeForm experienceType={experienceTypes.find((e) => e.slug === v.eventType)} />,
                  })}

                  {renderDisclosure({
                    key: `step2-contact-${currentStep}`,
                    defaultOpen: false,
                    header: renderSectionHeader('Contact Information', { complete: isContactComplete }),
                    children: <ContactDetails />,
                  })}

                  {isProductBased ? (
                    <PickupLocationDisplay address={experience?.fixed_location_address || v.locationAddress} />
                  ) : (
                    renderDisclosure({
                      key: `step2-location-${currentStep}`,
                      defaultOpen: false,
                      header: renderSectionHeader('Event Address', { complete: isLocationComplete }),
                      children: <LocationForm />,
                    })
                  )}
                </>
              );
            })()}
          </div>
        );
      case 3:
        return <SpecialRequests />;
      case 4:
        return (
          <RequestSummary
            menus={menus}
            experienceTypes={experienceTypes}
            products={products}
            onEditStep={(step: number, section?: string) => {
              setCurrentStep(step);
              // brief timeout to allow render then expand intended section
              setTimeout(() => {
                const sectionMap: Record<string, string[]> = {
                  // Step 1
                  menu: ['Select a Menu'],
                  experience: ['Experience Type'],
                  guests: ['Number of Guests'],
                  // Step 2
                  date: ['Date & Time'],
                  contact: ['Contact Information'],
                  location: ['Event Address'],
                  // Step 3
                  special: ['Special Requests'],
                };

                const labels = section && sectionMap[section];
                if (!labels) return;
                // Find disclosure button by header text and click to open
                labels.forEach((text) => {
                  const btn = Array.from(document.querySelectorAll('button')).find((b) =>
                    b.textContent?.trim().startsWith(text),
                  );
                  if (btn) (btn as HTMLButtonElement).click();
                });
              }, 0);
            }}
            onSubmit={() => {
              // #region agent log
              const formValuesBefore = form.getValues();
              fetch('http://127.0.0.1:7243/ingest/d5974850-2a8e-400f-94b8-c1dc9368bb2d', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  location: 'EventRequestForm.tsx:390',
                  message: 'onSubmit entry - form values before processing',
                  data: {
                    formValues: formValuesBefore,
                    eventType: formValuesBefore.eventType,
                    isPickup: formValuesBefore.eventType === 'pickup',
                    selectedProducts: formValuesBefore.selected_products,
                    requestedDate: formValuesBefore.requestedDate,
                    requestedTime: formValuesBefore.requestedTime,
                    experienceTypeId: formValuesBefore.experienceTypeId,
                  },
                  timestamp: Date.now(),
                  sessionId: 'debug-session',
                  runId: 'post-fix',
                  hypothesisId: 'A',
                }),
              }).catch(() => {});
              // #endregion

              // Update form state with combined date/time before submission
              // remix-hook-form reads from form state, not DOM, so we must update the state
              const formValues = form.getValues();

              // Store original date string before combining
              const originalDateString = formValues.requestedDate;

              // Combine date and time into ISO datetime string for backend validation
              let combinedDateTime: string | undefined;
              if (originalDateString && formValues.requestedTime) {
                const dateTime = new Date(`${originalDateString}T${formValues.requestedTime}:00`);
                combinedDateTime = dateTime.toISOString();

                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/d5974850-2a8e-400f-94b8-c1dc9368bb2d', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    location: 'EventRequestForm.tsx:422',
                    message: 'date/time combination - updating form state',
                    data: {
                      originalDate: originalDateString,
                      originalTime: formValues.requestedTime,
                      combinedDateTime: combinedDateTime,
                    },
                    timestamp: Date.now(),
                    sessionId: 'debug-session',
                    runId: 'post-fix',
                    hypothesisId: 'A',
                  }),
                }).catch(() => {});
                // #endregion

                // Update form state with combined datetime
                form.setValue('requestedDate', combinedDateTime, { shouldValidate: false, shouldDirty: false });
              }

              // Update hidden inputs - remix-hook-form reads from request body, not form state
              // So we need to ensure hidden inputs have the correct values
              Object.entries(formValues).forEach(([key, value]) => {
                const input = document.querySelector(`input[name="${key}"]`) as HTMLInputElement;
                if (input && input.type === 'hidden') {
                  let processedValue = String(value || '');

                  if (key === 'requestedDate' && combinedDateTime) {
                    processedValue = combinedDateTime;
                  } else if (key === 'selected_products') {
                    // Ensure selected_products is properly JSON stringified for hidden input
                    // This is critical - the form will serialize this as a string
                    processedValue = JSON.stringify(value || []);
                  }

                  input.value = processedValue;
                }
              });

              // #region agent log
              const selectedProductsInput = document.querySelector(
                'input[name="selected_products"]',
              ) as HTMLInputElement;
              fetch('http://127.0.0.1:7243/ingest/d5974850-2a8e-400f-94b8-c1dc9368bb2d', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  location: 'EventRequestForm.tsx:463',
                  message: 'selected_products hidden input value check',
                  data: {
                    hiddenInputValue: selectedProductsInput?.value,
                    hiddenInputValueParsed: selectedProductsInput
                      ? JSON.parse(selectedProductsInput.value || '[]')
                      : null,
                    formStateValue: formValues.selected_products,
                  },
                  timestamp: Date.now(),
                  sessionId: 'debug-session',
                  runId: 'post-fix',
                  hypothesisId: 'B',
                }),
              }).catch(() => {});
              // #endregion

              // #region agent log
              const formValuesAfter = form.getValues();
              fetch('http://127.0.0.1:7243/ingest/d5974850-2a8e-400f-94b8-c1dc9368bb2d', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  location: 'EventRequestForm.tsx:455',
                  message: 'form values after processing - before submit',
                  data: {
                    requestedDate: formValuesAfter.requestedDate,
                    requestedTime: formValuesAfter.requestedTime,
                    selectedProducts: formValuesAfter.selected_products,
                    experienceTypeId: formValuesAfter.experienceTypeId,
                  },
                  timestamp: Date.now(),
                  sessionId: 'debug-session',
                  runId: 'post-fix',
                  hypothesisId: 'A',
                }),
              }).catch(() => {});
              // #endregion

              const form_element = document.querySelector('form') as HTMLFormElement;
              if (form_element) {
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/d5974850-2a8e-400f-94b8-c1dc9368bb2d', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    location: 'EventRequestForm.tsx:472',
                    message: 'submitting form',
                    data: { formAction: form_element.action, formMethod: form_element.method },
                    timestamp: Date.now(),
                    sessionId: 'debug-session',
                    runId: 'post-fix',
                    hypothesisId: 'E',
                  }),
                }).catch(() => {});
                // #endregion
                form_element.requestSubmit();
              }
            }}
            isSubmitting={form.formState.isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, index) => (
            <div key={step.id} className={clsx('flex items-center', index < STEPS.length - 1 && 'flex-1')}>
              <button
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  currentStep >= step.id ? 'bg-accent-500 text-white' : 'bg-gray-200 text-gray-600',
                )}
                onClick={() => setCurrentStep(step.id)}
              >
                {step.id}
              </button>
              {index < STEPS.length - 1 && (
                <div className={clsx('flex-1 h-0.5 mx-4', currentStep > step.id ? 'bg-accent-500' : 'bg-gray-200')} />
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-semibold text-primary-900 mb-1">{STEPS[currentStep - 1].title}</h2>
          <p className="text-primary-600">{STEPS[currentStep - 1].subtitle}</p>
        </div>
      </div>

      {/* Form Content */}
      <RemixFormProvider {...form}>
        <form
          method="post"
          className="space-y-8"
          onSubmit={(e) => {
            // Ensure selected_products is properly serialized in hidden input before submission
            // remix-hook-form's getValidatedFormData reads from the request body, which includes hidden inputs
            const formValues = form.getValues();
            const selectedProductsInput = document.querySelector('input[name="selected_products"]') as HTMLInputElement;
            if (selectedProductsInput) {
              selectedProductsInput.value = JSON.stringify(formValues.selected_products || []);
            }

            // Also ensure requestedDate is updated if needed
            if (formValues.requestedDate && formValues.requestedTime && !formValues.requestedDate.includes('T')) {
              const dateTime = new Date(`${formValues.requestedDate}T${formValues.requestedTime}:00`);
              const requestedDateInput = document.querySelector('input[name="requestedDate"]') as HTMLInputElement;
              if (requestedDateInput) {
                requestedDateInput.value = dateTime.toISOString();
              }
            }

            // Don't prevent default - let remix-hook-form handle the submission
          }}
        >
          <input type="hidden" name="currentStep" value={currentStep} />

          {/* Hidden inputs to ensure form data is properly submitted */}
          <input type="hidden" name="menuId" value={form.watch('menuId') || ''} />
          <input type="hidden" name="eventType" value={form.watch('eventType') || ''} />
          <input type="hidden" name="requestedDate" value={form.watch('requestedDate') || ''} />
          <input type="hidden" name="requestedTime" value={form.watch('requestedTime') || ''} />
          <input type="hidden" name="partySize" value={form.watch('partySize') || ''} />
          <input type="hidden" name="experienceTypeId" value={form.watch('experienceTypeId') || ''} />
          <input type="hidden" name="experienceTypeSlug" value={form.watch('experienceTypeSlug') || ''} />
          <input type="hidden" name="selected_products" value={JSON.stringify(form.watch('selected_products') || [])} />
          <input type="hidden" name="locationAddress" value={form.watch('locationAddress') || ''} />
          <input type="hidden" name="firstName" value={form.watch('firstName') || ''} />
          <input type="hidden" name="lastName" value={form.watch('lastName') || ''} />
          <input type="hidden" name="email" value={form.watch('email') || ''} />
          <input type="hidden" name="phone" value={form.watch('phone') || ''} />
          <input type="hidden" name="specialRequirements" value={form.watch('specialRequirements') || ''} />
          <input type="hidden" name="notes" value={form.watch('notes') || ''} />

          <div className="bg-white rounded-lg shadow-md p-8">{renderStepContent()}</div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <div>
              {currentStep > 1 && (
                <Button type="button" variant="default" onClick={prevStep}>
                  Previous
                </Button>
              )}
            </div>

            <div className="flex gap-4">
              {currentStep < STEPS.length && (
                <Button type="button" onClick={nextStep} disabled={!canProceed()}>
                  Next Step
                </Button>
              )}
              {currentStep < STEPS.length - 1 && isAllComplete() && (
                <Button
                  type="button"
                  variant="default"
                  className="border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                  onClick={() => setCurrentStep(STEPS.length)}
                >
                  Review Now
                </Button>
              )}
              {/* Note: Submit button is handled by RequestSummary component on final step */}
            </div>
          </div>
        </form>
      </RemixFormProvider>
    </div>
  );
};

export default EventRequestForm;
