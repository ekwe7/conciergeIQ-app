import React from 'react';
import { ErrorRecoveryPage } from './ErrorRecoveryPage';

/**
 * Not found page displayed when navigating to undefined routes.
 * Renders the dedicated G08 NOT_FOUND error recovery view with front desk contact links.
 */
export const NotFoundPage: React.FC = () => {
  return <ErrorRecoveryPage initialReason="NOT_FOUND" />;
};
