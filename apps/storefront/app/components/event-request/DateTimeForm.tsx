import { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import type { EventRequestFormData } from '@app/routes/request._index';
import clsx from 'clsx';
import type { FC } from 'react';

export interface DateTimeFormProps {
  className?: string;
  experienceType?: {
    slug: string;
    requires_advance_notice: boolean;
    advance_notice_days: number;
    time_slot_start?: string | null;
    time_slot_end?: string | null;
    time_slot_interval_minutes?: number;
    available_time_slots?: string[] | null;
  };
}

const generateSlots = (start: string | null | undefined, end: string | null | undefined, interval: number) => {
  if (!start || !end) return [];
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const slots: string[] = [];
  let minutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  while (minutes <= endMinutes) {
    const h = Math.floor(minutes / 60)
      .toString()
      .padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    minutes += interval;
  }
  return slots;
};

export const DateTimeForm: FC<DateTimeFormProps> = ({ className, experienceType }) => {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<EventRequestFormData>();
  const selectedDate = watch('requestedDate');
  const selectedTime = watch('requestedTime');

  // Calculate minimum date (7 days from now)
  const getMinDate = () => {
    const today = new Date();
    if (experienceType?.requires_advance_notice === false || experienceType?.slug === 'pickup') {
      return today.toISOString().split('T')[0];
    }
    const days = experienceType?.advance_notice_days ?? 7;
    today.setDate(today.getDate() + days);
    return today.toISOString().split('T')[0];
  };

  // Calculate maximum date (6 months from now)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 6);
    return maxDate.toISOString().split('T')[0];
  };

  const [minDate] = useState(getMinDate());
  const [maxDate] = useState(getMaxDate());

  // Helpers to parse a YYYY-MM-DD string as a LOCAL date (avoid UTC off-by-one)
  const parseLocalDate = (dateString: string) => {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  // Format date for display (local)
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format time for display (24h)
  const formatTimeForDisplay = (timeString: string) => timeString || '';

  // Check if selected date is weekend (local)
  const isWeekend = (dateString: string) => {
    if (!dateString) return false;
    const date = parseLocalDate(dateString);
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  const handleDateChange = (date: string) => {
    setValue('requestedDate', date, { shouldValidate: true });
  };

  const handleTimeChange = (time: string) => {
    setValue('requestedTime', time, { shouldValidate: true });
  };

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-primary-900 mb-2">
          {experienceType?.slug === 'pickup' ? 'Select Your Pickup Date & Time' : 'Select Your Preferred Date & Time'}
        </h3>
        <p className="text-primary-600">
          {experienceType?.slug === 'pickup'
            ? 'Choose a pickup date and available time slot.'
            : 'Choose when you would like the chef to arrive. Events typically require advance notice.'}
        </p>
      </div>

      {/* Date Selection */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-primary-900 mb-3">Preferred Date</label>

          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={selectedDate || ''}
            onChange={(e) => handleDateChange(e.target.value)}
            className={clsx(
              'w-full text-lg px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500',
              errors.requestedDate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300',
            )}
          />

          {/* Date display and info */}
          {selectedDate && (
            <div className="mt-2 space-y-1">
              <p className="text-sm font-medium text-accent-700">Selected: {formatDateForDisplay(selectedDate)}</p>
              {isWeekend(selectedDate) && (
                <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                  💡 Weekend events are very popular! Consider booking early.
                </p>
              )}
            </div>
          )}

          {/* Error message */}
          {errors.requestedDate && <p className="text-red-600 text-sm mt-1">{errors.requestedDate.message}</p>}
        </div>
      </div>

      {/* Time Selection */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-primary-900 mb-3">
            {experienceType?.slug === 'pickup' ? 'Pickup Time Slot' : 'Preferred Start Time'}
          </label>

          {experienceType?.slug === 'pickup' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {(experienceType.available_time_slots?.length
                  ? experienceType.available_time_slots
                  : generateSlots(
                      experienceType.time_slot_start,
                      experienceType.time_slot_end,
                      experienceType.time_slot_interval_minutes || 30,
                    )
                ).map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => handleTimeChange(slot)}
                    className={clsx(
                      'px-3 py-2 rounded-lg text-sm font-medium transition-colors border bg-white',
                      selectedTime === slot
                        ? 'border-accent-500 bg-accent-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300',
                    )}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              {errors.requestedTime && <p className="text-red-600 text-sm">{errors.requestedTime.message}</p>}
            </div>
          ) : (
            <>
              <select
                value={selectedTime || ''}
                onChange={(e) => handleTimeChange(e.target.value)}
                className={clsx(
                  'w-full text-lg px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500',
                  errors.requestedTime ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300',
                )}
              >
                <option value="">Select a time...</option>
                {generateSlots('10:00', '20:30', 30).map((time) => (
                  <option key={time} value={time}>
                    {formatTimeForDisplay(time)}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* Time display and info */}
          {selectedTime && (
            <div className="mt-2">
              <p className="text-sm font-medium text-accent-700">Selected: {formatTimeForDisplay(selectedTime)}</p>
              <p className="text-xs text-primary-600 mt-1">
                This is the chef arrival time. Plan for dining to start roughly 2 hours later.
              </p>
            </div>
          )}

          {/* Error message */}
          {errors.requestedTime && <p className="text-red-600 text-sm mt-1">{errors.requestedTime.message}</p>}
        </div>
      </div>

      {/* Date & Time Summary */}
      {selectedDate && selectedTime && (
        <div className="bg-accent-50 border border-accent-200 rounded-lg p-4">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-accent-700 mb-2">Event Schedule</h4>
            <div className="space-y-1">
              <p className="text-accent-800">
                <span className="font-medium">Date:</span> {formatDateForDisplay(selectedDate)}
              </p>
              <p className="text-accent-800">
                <span className="font-medium">Start Time:</span> {formatTimeForDisplay(selectedTime)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Important scheduling information */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Scheduling Information</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Minimum 7 days advance notice required</li>
          <li>• Events can be scheduled up to 6 months in advance</li>
          <li>• Start times available from 10:00 AM to 8:30 PM</li>
          <li>• Availability will be confirmed within 24 hours</li>
          <li>• Alternative dates may be suggested if requested time is unavailable</li>
        </ul>
      </div>

      {/* Hidden form fields */}
      <input type="hidden" name="requestedDate" value={selectedDate || ''} />
      <input type="hidden" name="requestedTime" value={selectedTime || ''} />
    </div>
  );
};

export default DateTimeForm;
