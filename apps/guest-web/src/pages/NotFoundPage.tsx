import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@conciergeiq/ui';
import { Compass, Home } from 'lucide-react';

/**
 * Not found page displayed when navigating to undefined routes.
 */
export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-surface-muted border border-border flex items-center justify-center text-text-muted">
        <Compass className="w-7 h-7" />
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-bold text-text">Page Not Found</h2>
        <p className="text-xs text-text-muted max-w-xs">
          The guest service or page you requested does not exist or has been moved.
        </p>
      </div>

      <Button
        variant="primary"
        size="md"
        className="flex items-center gap-2 mt-2"
        onClick={() => navigate('/')}
      >
        <Home className="w-4 h-4" />
        <span>Return to Welcome</span>
      </Button>
    </div>
  );
};
