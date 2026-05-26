interface Props {
  status: string;
  text?: string;
}

const CLASSES: Record<string, string> = {
  pending:   'badge-pending',
  approved:  'badge-approved',
  rejected:  'badge-rejected',
  active:    'badge-active',
  completed: 'badge-completed',
};

export function Badge({ status, text }: Props) {
  return (
    <span className={`badge ${CLASSES[status] ?? 'badge-info'}`}>
      {text ?? status.toUpperCase()}
    </span>
  );
}
