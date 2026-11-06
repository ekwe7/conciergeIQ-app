import React from 'react';
import { AlertCircle, Terminal } from 'lucide-react';

export interface BackendBlockerNoticeProperties {
  className?: string;
  isCompact?: boolean;
}

/**
 * ============================================================================
 * BACKEND DEPENDENCY BLOCKER DOCUMENTATION
 * ============================================================================
 * Issue Identifier: CIQ-BACKEND-BLOCKED-SERVICE-REQUESTS
 * Endpoint: POST /api/v1/guest/service-requests
 * Status: BLOCKED — BACKEND DEPENDENCY
 *
 * Details:
 * The frontend data contracts (GuestServiceRequestCreateSchema) and UI flow (UI: G06)
 * are completely implemented. Live transmission currently awaits backend exposure
 * of POST /api/v1/guest/service-requests in apps/api.
 * All submissions seamlessly route through the Mock Service Worker fallback provider.
 * ============================================================================
 */
export const BackendBlockerNotice: React.FC<BackendBlockerNoticeProperties> = ({
  className = '',
  isCompact = false,
}) => {
  if (isCompact) {
    return (
      <div
        role="status"
        className={`flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 ${className}`}
      >
        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>Mock Fallback Active (Backend Ticket: CIQ-BACKEND-BLOCKED-SERVICE-REQUESTS)</span>
      </div>
    );
  }

  return (
    <aside
      aria-label="Backend Dependency Notice"
      className={`bg-amber-50/90 border border-amber-200 rounded-xl p-3 text-left space-y-1.5 shadow-elevation-low ${className}`}
    >
      <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
        <Terminal className="w-4 h-4 text-amber-700 shrink-0" />
        <span>Backend Blocker Notice: CIQ-BACKEND-BLOCKED-SERVICE-REQUESTS</span>
      </div>
      <p className="text-[11px] text-amber-800 leading-relaxed font-normal">
        The route <code>POST /api/v1/guest/service-requests</code> is not yet registered in Fastify.
        Requests execute via mock service fallback with 15-minute SLA simulation.
      </p>
    </aside>
  );
};
