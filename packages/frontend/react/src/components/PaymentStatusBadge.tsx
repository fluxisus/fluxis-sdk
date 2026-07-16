import type { CheckoutSession, PaymentStatusBadgeProps } from '../types.js';

type StatusConfig = { background: string; color: string; label: string };

const STATUS_CONFIG: Record<CheckoutSession['status'], StatusConfig> = {
  pending: { background: 'rgba(37, 99, 235, 0.1)', color: '#1d4ed8', label: 'Pendiente' },
  selecting_asset: { background: 'rgba(37, 99, 235, 0.1)', color: '#1d4ed8', label: 'Elegí cómo pagar' },
  confirming: { background: 'rgba(245, 158, 11, 0.1)', color: '#b45309', label: 'Confirmando' },
  completed: { background: 'rgba(22, 163, 74, 0.1)', color: '#15803d', label: 'Completado' },
  expired: { background: 'rgba(100, 116, 139, 0.1)', color: '#475569', label: 'Expirado' },
};

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.025em',
        background: config.background,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  );
}
