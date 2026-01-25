interface PickupLocationDisplayProps {
  address?: string | null;
}

export const PickupLocationDisplay = ({ address }: PickupLocationDisplayProps) => {
  if (!address) return null;
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4">
      <div className="text-sm font-semibold text-primary-900">Pickup Location</div>
      <p className="text-primary-700">{address}</p>
      <p className="text-xs text-primary-600 mt-1">You’ll receive a confirmation and payment link after acceptance.</p>
    </div>
  );
};
