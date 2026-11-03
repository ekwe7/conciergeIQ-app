import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@conciergeiq/ui';
import { AlertCircle, RefreshCw, QrCode, PhoneCall, Home } from 'lucide-react';

export interface ErrorRecoveryPageProperties {
  errorMessage?: string;
  errorDetails?: string;
  onRetry?: () => void;
}

/**
 * Error recovery page for session expiration, invalid QR tokens, or network failures.
 */
export const ErrorRecoveryPage: React.FC<ErrorRecoveryPageProperties> = ({
  errorMessage = 'Session or Connection Issue',
  errorDetails = 'We were unable to load your hotel room session or the request timed out.',
  onRetry,
}) => {
  const navigate = useNavigate();

  const handleRetryAction = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-5">
      <div className="w-16 h-16 rounded-full bg-status-danger/10 text-status-danger flex items-center justify-center shadow-elevation-low">
        <AlertCircle className="w-8 h-8" />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h2 className="text-xl font-bold text-text">
          {errorMessage}
        </h2>
        <p className="text-xs text-text-muted leading-relaxed">
          {errorDetails}
        </p>
      </div>

      <Card className="p-4 bg-surface-muted border-border w-full max-w-sm text-left text-xs text-text-muted space-y-2">
        <div className="flex items-center gap-2 font-semibold text-text">
          <QrCode className="w-4 h-4 text-brand" />
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
          variant="primary"
          size="md"
          className="w-full flex items-center justify-center gap-2"
          onClick={handleRetryAction}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </Button>

        <Button
          variant="outline"
          size="md"
          className="w-full flex items-center justify-center gap-2"
          onClick={() => navigate('/')}
        >
          <Home className="w-4 h-4" />
          <span>Return to Welcome Screen</span>
        </Button>

        <div className="pt-3 text-xs text-text-muted flex items-center justify-center gap-1.5">
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Need help right away? Dial 0 on your room telephone.</span>
        </div>
      </div>
    </div>
  );
};
