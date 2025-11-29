export const PRICING_STRUCTURE = {
  buffet_style: 99.99,
  cooking_class: 119.99,
  plated_dinner: 149.99,
} as const;

export type EventType = keyof typeof PRICING_STRUCTURE;

export const getEventTypeDisplayName = (eventType: EventType): string => {
  switch (eventType) {
    case 'cooking_class':
      return 'Cooking Class';
    case 'plated_dinner':
      return 'Plated Dinner';
    case 'buffet_style':
      return 'Buffet Style';
    default:
      return 'Unknown Experience';
  }
};

export const getEventTypeEstimatedDuration = (eventType: EventType): number => {
  switch (eventType) {
    case 'cooking_class':
      return 3; // 3 hours
    case 'plated_dinner':
      return 4; // 4 hours
    case 'buffet_style':
      return 2.5; // 2.5 hours
    default:
      return 3;
  }
}; 