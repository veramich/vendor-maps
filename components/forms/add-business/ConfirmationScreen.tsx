interface ConfirmationScreenProps {
  businessName: string;
  onAnotherLocation: () => void;
  onDifferentBusiness: () => void;
  onDone: () => void;
}

export default function ConfirmationScreen({
  businessName,
  onAnotherLocation,
  onDifferentBusiness,
  onDone,
}: ConfirmationScreenProps) {
  return <div>Confirmation — {businessName}</div>;
}