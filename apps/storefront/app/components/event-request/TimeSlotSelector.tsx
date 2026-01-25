import { useFormContext } from 'react-hook-form';
import type { EventRequestFormData } from '@app/routes/request._index';
import type { StoreExperienceType } from '@libs/util/server/data/experience-types.server';

interface TimeSlotSelectorProps {
  experienceType?: StoreExperienceType;
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

export const TimeSlotSelector = ({ experienceType }: TimeSlotSelectorProps) => {
  const { watch, setValue } = useFormContext<EventRequestFormData>();
  const requestedTime = watch('requestedTime');

  const explicitSlots = experienceType?.available_time_slots ?? [];
  const generatedSlots =
    explicitSlots.length > 0
      ? explicitSlots
      : generateSlots(
          experienceType?.time_slot_start,
          experienceType?.time_slot_end,
          experienceType?.time_slot_interval_minutes || 30,
        );

  const slots = generatedSlots;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-primary-900">Pickup Time</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {slots.map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => setValue('requestedTime', slot, { shouldValidate: true })}
            className={`px-3 py-2 rounded border text-sm ${requestedTime === slot ? 'border-accent-500 bg-accent-50' : 'border-gray-200'}`}
          >
            {slot}
          </button>
        ))}
      </div>
      <input type="hidden" name="requestedTime" value={requestedTime || ''} />
    </div>
  );
};
