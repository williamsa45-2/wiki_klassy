import type { ReactNode } from 'react';
import { AlertTriangleIcon, CheckCircleIcon, InfoIcon, XCircleIcon } from './icons';

type Tone = 'error' | 'success' | 'info' | 'warning';

const TONE_CLASSES: Record<Tone, string> = {
  error: 'bg-danger-soft text-danger',
  success: 'bg-success-soft text-success',
  info: 'bg-primary-soft text-primary',
  warning: 'bg-warning-soft text-warning',
};

const TONE_ICON: Record<Tone, typeof InfoIcon> = {
  error: XCircleIcon,
  success: CheckCircleIcon,
  info: InfoIcon,
  warning: AlertTriangleIcon,
};

export function Alert({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  const ToneIcon = TONE_ICON[tone];
  return (
    <div role={tone === 'error' ? 'alert' : undefined} className={`flex items-start gap-2 rounded-lg p-3 text-sm ${TONE_CLASSES[tone]}`}>
      <ToneIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
