import { Button } from '@app/components/common/buttons/Button';
import { useFormContext } from 'react-hook-form';
import type { EventRequestFormData } from '@app/routes/request._index';
import { getEventTypeDisplayName } from '@libs/constants/pricing';
import clsx from 'clsx';
import type { FC } from 'react';
import React from 'react';

export interface EventTypeSelectorProps {
  className?: string;
}

interface ExperienceType {
  id: 'plated_dinner' | 'buffet_style';
  name: string;
  description: string;
  highlights: string[];
  idealFor: string;
  duration: string;
  icon: string;
  isMostPopular?: boolean;
}

const experienceTypes: ExperienceType[] = [
  {
    id: 'plated_dinner',
    name: 'Plated Dinner',
    description: 'Elegant, restaurant-quality dining with multiple courses',
    highlights: ['Multi-course menu', 'Restaurant-quality', 'Full-service dining'],
    idealFor: 'Anniversaries, formal celebrations',
    duration: '4 hours',
    icon: '🍽️',
    isMostPopular: true,
  },
  {
    id: 'buffet_style',
    name: 'Buffet Style',
    description: 'Perfect for larger gatherings with variety of dishes',
    highlights: ['Multiple dishes', 'Self-service style', 'Great for mingling'],
    idealFor: 'Birthday parties, family gatherings',
    duration: '2.5 hours',
    icon: '🥘',
  },
];

export const EventTypeSelector: FC<EventTypeSelectorProps> = ({ className }) => {
  const { watch, setValue } = useFormContext<EventRequestFormData>();
  const selectedEventType = watch('eventType');

  // Set default value to plated_dinner if no selection
  React.useEffect(() => {
    if (!selectedEventType) {
      setValue('eventType', 'plated_dinner', { shouldValidate: true });
    }
  }, [selectedEventType, setValue]);

  const handleEventTypeSelect = (eventType: ExperienceType['id']) => {
    setValue('eventType', eventType, { shouldValidate: true });
  };

  const selectedExperience = selectedEventType
    ? experienceTypes.find((e) => e.id === selectedEventType)
    : experienceTypes.find((e) => e.id === 'plated_dinner');

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
              value={selectedEventType || 'plated_dinner'}
              onChange={(e) => handleEventTypeSelect(e.target.value as ExperienceType['id'])}
              className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 border-gray-300"
            >
              {experienceTypes.map((experience) => (
                <option key={experience.id} value={experience.id}>
                  {experience.name} {experience.isMostPopular ? '(Most Popular)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Experience Details Card */}
          {selectedExperience && (
            <div className="relative bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
              {/* Most Popular Badge */}
              {selectedExperience.isMostPopular && (
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
                  <p className="text-lg text-gray-600 font-medium">{selectedExperience.duration}</p>
                </div>

                {/* Description */}
                <p className="text-gray-700 text-base leading-relaxed max-w-md mx-auto">
                  {selectedExperience.description}
                </p>

                {/* What's included */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 text-lg">What's Included:</h4>
                  <ul className="space-y-2">
                    {selectedExperience.highlights.map((highlight, index) => (
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
                  <p className="text-gray-700 text-sm">{selectedExperience.idealFor}</p>
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
