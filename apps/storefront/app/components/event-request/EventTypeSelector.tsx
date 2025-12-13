import { Button } from '@app/components/common/buttons/Button';
import { useFormContext } from 'react-hook-form';
import type { EventRequestFormData } from '@app/routes/request._index';
import clsx from 'clsx';
import type { FC } from 'react';
import React from 'react';
import type { StoreExperienceType } from '@libs/util/server/data/experience-types.server';

export interface EventTypeSelectorProps {
  className?: string;
  experienceTypes: StoreExperienceType[];
}

export const EventTypeSelector: FC<EventTypeSelectorProps> = ({ className, experienceTypes }) => {
  const { watch, setValue } = useFormContext<EventRequestFormData>();
  const selectedEventType = watch('eventType');

  // Set default value to plated_dinner if no selection
  React.useEffect(() => {
    if (!selectedEventType && experienceTypes.length > 0) {
      setValue('eventType', experienceTypes[0].slug as EventRequestFormData['eventType'], { shouldValidate: true });
      setValue('experienceTypeId', experienceTypes[0].id, { shouldValidate: false });
      setValue('experienceTypeSlug', experienceTypes[0].slug, { shouldValidate: false });
    }
  }, [selectedEventType, setValue, experienceTypes]);

  const handleEventTypeSelect = (experience: StoreExperienceType) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d5974850-2a8e-400f-94b8-c1dc9368bb2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EventTypeSelector.tsx:27',message:'handleEventTypeSelect',data:{experienceId:experience.id,experienceSlug:experience.slug,experienceName:experience.name,isProductBased:experience.is_product_based},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    setValue('eventType', experience.slug as EventRequestFormData['eventType'], { shouldValidate: true });
    setValue('experienceTypeId', experience.id, { shouldValidate: false });
    setValue('experienceTypeSlug', experience.slug, { shouldValidate: false });
  };

  const selectedExperience = selectedEventType
    ? experienceTypes.find((e) => e.slug === selectedEventType)
    : experienceTypes[0];

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-primary-900 mb-2">Select Your Culinary Experience</h3>
        <p className="text-primary-600">Choose the experience type that best fits your occasion.</p>
      </div>

      {/* Experience Type Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="space-y-6">
          {/* Dropdown Selection */}
          <div>
            <label className="block text-sm font-medium text-primary-900 mb-3">Experience Type</label>
            <select
              value={selectedEventType || experienceTypes[0]?.slug}
              onChange={(e) => {
                const exp = experienceTypes.find((x) => x.slug === e.target.value);
                if (exp) handleEventTypeSelect(exp);
              }}
              className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 border-gray-300"
            >
              {experienceTypes.map((experience) => (
                <option key={experience.id} value={experience.slug}>
                  {experience.name} {experience.is_featured ? '(Featured)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Experience Details Card */}
          {selectedExperience && (
            <div className="relative bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
              {/* Most Popular Badge */}
              {selectedExperience?.is_featured && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <span className="bg-accent-500 text-white px-4 py-1 rounded-full text-sm font-medium shadow-md">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center space-y-6">
                {/* Icon */}
                <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-4xl">{selectedExperience.icon}</span>
                </div>

                {/* Title and Duration */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedExperience.name}</h3>
                  <p className="text-lg text-gray-600 font-medium">
                    {selectedExperience.duration_display || `${selectedExperience.duration_minutes ?? ''} minutes`}
                  </p>
                </div>

                {/* Description */}
                <p className="text-gray-700 text-base leading-relaxed max-w-md mx-auto">
                  {selectedExperience.description}
                </p>

                {/* What's included */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 text-lg">Highlights:</h4>
                  <ul className="space-y-2">
                    {(selectedExperience.highlights || []).map((highlight, index) => (
                      <li key={index} className="flex items-start text-gray-700">
                        <span className="w-2 h-2 bg-accent-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                        <span className="text-sm">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Ideal for */}
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg mb-2">Ideal For:</h4>
                  <p className="text-gray-700 text-sm">{selectedExperience.ideal_for}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventTypeSelector;
