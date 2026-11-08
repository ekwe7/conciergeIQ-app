import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card } from '@conciergeiq/ui';
import {
  AlertCircle,
  RefreshCw,
  QrCode,
  PhoneCall,
  Home,
  WifiOff,
  Compass,
  BellRing,
  Search,
  UtensilsCrossed,
} from 'lucide-react';

export type ErrorRecoveryReason =
  | 'INACTIVE_STAY'
  | 'SESSION_EXPIRED'
  | 'NETWORK_OFFLINE'
  | 'NOT_FOUND'
  | 'UNKNOWN';

export interface ErrorRecoveryPageProperties {
  initialReason?: ErrorRecoveryReason;
  errorMessage?: string;
  errorDetails?: string;
  onRetry?: () => void;
}

function normalizeRecoveryReason(rawReason: string | null): ErrorRecoveryReason {
  if (!rawReason) {
    return 'UNKNOWN';
  }

  const uppercaseReason = rawReason.toUpperCase().replace(/-/g, '_');

  if (uppercaseReason === 'INACTIVE_STAY' || uppercaseReason === 'STAY_INACTIVE') {
    return 'INACTIVE_STAY';
  }
  if (
    uppercaseReason === 'SESSION_EXPIRED' ||
    uppercaseReason === 'EXPIRED_SESSION' ||
    uppercaseReason === 'INVALID_TOKEN' ||
    uppercaseReason === 'TOKEN_INVALID'
  ) {
    return 'SESSION_EXPIRED';
  }
  if (uppercaseReason === 'NETWORK_OFFLINE' || uppercaseReason === 'OFFLINE') {
    return 'NETWORK_OFFLINE';
  }
  if (uppercaseReason === 'NOT_FOUND' || uppercaseReason === '404') {
    return 'NOT_FOUND';
  }

  return 'UNKNOWN';
}

/**
 * Renders dedicated edge and recovery states (prototype UI: G08) for offline connectivity,
 * inactive room stays, expired session tokens, and route 404 conditions.
 */
export const ErrorRecoveryPage: React.FC<ErrorRecoveryPageProperties> = ({
  initialReason,
  errorMessage,
  errorDetails,
  onRetry,
}) => {
  const navigate = useNavigate();
  const [searchParameters] = useSearchParams();

  const parameterReason = searchParameters.get('reason');
  const activeReason: ErrorRecoveryReason =
    initialReason ?? normalizeRecoveryReason(parameterReason);

  const handleRetryAction = () => {
    if (onRetry) {
      onRetry();
    } else if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  };

  if (activeReason === 'INACTIVE_STAY') {
    return (
      <div
        data-testid="error-recovery-inactive-stay"
        className="p-6 flex flex-col items-center justify-center min-h-[75vh] text-center max-w-sm mx-auto space-y-5"
      >
        <div
          aria-hidden="true"
          className="w-28 h-28 rounded-full bg-[#FCF0DA] text-[#9A6700] flex items-center justify-center shadow-elevation-low"
        >
          <BellRing className="w-14 h-14" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text tracking-tight font-serif">
            Ordering isn&apos;t available for this room
          </h1>
          <p className="text-xs text-text-muted leading-relaxed">
            This room has no active stay. If you&apos;ve just checked in, the front desk can activate it in seconds.
          </p>
        </div>

        <div className="w-full flex flex-col gap-2.5 pt-2">
          <a
            href="tel:0"
            data-testid="call-front-desk-link"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand text-white py-3 px-4 text-xs font-bold shadow-elevation-low focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <PhoneCall className="w-4 h-4" aria-hidden="true" />
            <span>Call front desk</span>
          </a>

          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => navigate('/')}
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>Return to Welcome Screen</span>
          </Button>
        </div>
      </div>
    );
  }

  if (activeReason === 'SESSION_EXPIRED') {
    return (
      <div
        data-testid="error-recovery-session-expired"
        className="p-6 flex flex-col items-center justify-center min-h-[75vh] text-center max-w-sm mx-auto space-y-5"
      >
        <div
          aria-hidden="true"
          className="w-28 h-28 rounded-full bg-[#F1EDE6] text-ink flex items-center justify-center shadow-elevation-low"
        >
          <Search className="w-14 h-14" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text tracking-tight font-serif">
            This code isn&apos;t valid
          </h1>
          <p className="text-xs text-text-muted leading-relaxed">
            The QR code may have been replaced. Please scan the code in your room, or call the front desk.
          </p>
        </div>

        <Card className="p-4 bg-surface-muted border-border w-full text-left text-xs text-text-muted space-y-2">
          <div className="flex items-center gap-2 font-semibold text-text">
            <QrCode className="w-4 h-4 text-brand" aria-hidden="true" />
            <span>Rescan Room QR Code</span>
          </div>
          <p>
            Please point your smartphone camera at the physical QR code on your room desk or bedside stand to renew your stay session.
          </p>
        </Card>

        <div className="w-full flex flex-col gap-2.5 pt-2">
          <a
            href="tel:0"
            data-testid="call-front-desk-link"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand text-white py-3 px-4 text-xs font-bold shadow-elevation-low focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <PhoneCall className="w-4 h-4" aria-hidden="true" />
            <span>Call front desk</span>
          </a>

          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => navigate('/')}
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>Return to Welcome Screen</span>
          </Button>
        </div>
      </div>
    );
  }

  if (activeReason === 'NETWORK_OFFLINE') {
    return (
      <div
        data-testid="error-recovery-network-offline"
        className="p-6 flex flex-col items-center justify-center min-h-[75vh] text-center max-w-sm mx-auto space-y-5"
      >
        <div
          aria-hidden="true"
          className="w-28 h-28 rounded-full bg-[#E6EEFD] text-brand flex items-center justify-center shadow-elevation-low"
        >
          <WifiOff className="w-14 h-14" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text tracking-tight font-serif">
            You&apos;re offline
          </h1>
          <p className="text-xs text-text-muted leading-relaxed">
            Your order is saved on this phone and will be sent once you&apos;re back online. It won&apos;t be duplicated.
          </p>
        </div>

        <div className="w-full flex flex-col gap-2.5 pt-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleRetryAction}
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>Try again</span>
          </Button>

          <a
            href="tel:0"
            data-testid="call-front-desk-link"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface text-text py-3 px-4 text-xs font-bold hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <PhoneCall className="w-4 h-4" aria-hidden="true" />
            <span>Call front desk</span>
          </a>
        </div>
      </div>
    );
  }

  if (activeReason === 'NOT_FOUND') {
    return (
      <div
        data-testid="error-recovery-not-found"
        className="p-6 flex flex-col items-center justify-center min-h-[75vh] text-center max-w-sm mx-auto space-y-5"
      >
        <div
          aria-hidden="true"
          className="w-28 h-28 rounded-full bg-[#F1EDE6] text-text-muted flex items-center justify-center shadow-elevation-low"
        >
          <Compass className="w-14 h-14" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text tracking-tight font-serif">
            Page not found
          </h1>
          <p className="text-xs text-text-muted leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has moved. Return to the dining menu or call the front desk.
          </p>
        </div>

        <div className="w-full flex flex-col gap-2.5 pt-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => navigate('/menu')}
          >
            <UtensilsCrossed className="w-4 h-4" aria-hidden="true" />
            <span>Browse Dining Menu</span>
          </Button>

          <a
            href="tel:0"
            data-testid="call-front-desk-link"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface text-text py-3 px-4 text-xs font-bold hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <PhoneCall className="w-4 h-4" aria-hidden="true" />
            <span>Call front desk</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="error-recovery-default"
      className="p-6 flex flex-col items-center justify-center min-h-[70vh] text-center max-w-sm mx-auto space-y-5"
    >
      <div className="w-16 h-16 rounded-full bg-status-danger/10 text-status-danger flex items-center justify-center shadow-elevation-low">
        <AlertCircle className="w-8 h-8" aria-hidden="true" />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h1 className="text-xl font-bold text-text">
          {errorMessage || 'Session or Connection Issue'}
        </h1>
        <p className="text-xs text-text-muted leading-relaxed">
          {errorDetails || 'We were unable to load your hotel room session or the request timed out.'}
        </p>
      </div>

      <Card className="p-4 bg-surface-muted border-border w-full max-w-sm text-left text-xs text-text-muted space-y-2">
        <div className="flex items-center gap-2 font-semibold text-text">
          <QrCode className="w-4 h-4 text-brand" aria-hidden="true" />
          <span>How to Reconnect</span>
        </div>
        <p>
          1. Point your smartphone camera at the physical QR code on your room desk or bedside stand.
        </p>
        <p>
          2. Tap the link banner to refresh your verified stay session.
        </p>
      </Card>

      <div className="w-full max-w-sm flex flex-col gap-2.5 pt-2">
        <Button
          type="button"
          variant="primary"
          size="md"
          className="w-full flex items-center justify-center gap-2"
          onClick={handleRetryAction}
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          <span>Try Again</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="md"
          className="w-full flex items-center justify-center gap-2"
          onClick={() => navigate('/')}
        >
          <Home className="w-4 h-4" aria-hidden="true" />
          <span>Return to Welcome Screen</span>
        </Button>

        <div className="pt-3 text-xs text-text-muted flex items-center justify-center gap-1.5">
          <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Need help right away? </span>
          <a
            href="tel:0"
            data-testid="call-front-desk-link"
            className="font-semibold text-brand underline"
          >
            Dial 0 on your room telephone.
          </a>
        </div>
      </div>
    </div>
  );
};
