import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Badge, Button } from '@conciergeiq/ui';
import {
  UtensilsCrossed,
  Package,
  Clock,
  Sparkles,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  QrCode,
  PhoneCall,
  Loader2,
} from 'lucide-react';
import { GuestSession, Order } from '@conciergeiq/contracts';
import { WelcomeHeader } from '../features/guest-session/components/WelcomeHeader';
import {
  useResolveQrToken,
  retrieveGuestSession,
  GuestSessionState,
} from '../features/guest-session';
import { AppApiError } from '../lib/error-handler';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge } from '@conciergeiq/ui';
import { Utensils, Bell, Sparkles, MapPin, Clock } from 'lucide-react';
import { GuestSession } from '@conciergeiq/contracts';

export interface WelcomePageProperties {
  session?: GuestSession;
  onNavigate?: (destination: string) => void;
}

const DEFAULT_FALLBACK_SESSION: GuestSession = {
const DEFAULT_GUEST_SESSION: GuestSession = {
  token: 'qr_demo_token_8829',
  roomNumber: '402',
  stayId: 'stay_demo_9921',
  hotelId: 'htl_lagos_grand',
  hotelName: 'The Lagos Grand Hotel & Suites',
  guestName: 'Adeola Johnson',
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};

const SAMPLE_IN_PROGRESS_ORDER: Order = {
  id: 'ord_ACTIVE_402',
  roomNumber: '402',
  stayId: 'stay_demo_9921',
  hotelId: 'htl_lagos_grand',
  status: 'IN_PROGRESS',
  items: [
    {
      itemId: 'item_2',
      name: 'Truffle Wagyu Burger & Crisp Fries',
      quantity: 1,
      unitPriceMinor: 2400,
      totalMinor: 2400,
    },
  ],
  subtotalMinor: 2400,
  taxMinor: 192,
  totalMinor: 2592,
  createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  updatedAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
};

/**
 * Guest Welcome Page matching prototype UI: G01.
 * Automatically resolves room QR tokens, persists session state into sessionStorage,
 * purges sensitive tokens from the browser URL, and provides rapid entry points
 * for room service dining, amenities, order tracking, and concierge inquiries.
 */
export const WelcomePage: React.FC<WelcomePageProperties> = ({
  session: externalSession,
  onNavigate,
}) => {
  const navigate = useNavigate();
  const [searchParameters] = useSearchParams();
  const qrTokenFromUrl = searchParameters.get('token');

  const [activeSession, setActiveSession] = useState<GuestSessionState | GuestSession>(
    externalSession ?? retrieveGuestSession() ?? DEFAULT_FALLBACK_SESSION
  );
  const [stayInactiveError, setStayInactiveError] = useState<string | null>(null);

  const { resolveQrToken, isResolving, resolveError } = useResolveQrToken({
    onSuccessCallback: (resolvedSessionState) => {
      setActiveSession(resolvedSessionState);
      setStayInactiveError(null);
    },
    onErrorCallback: (caughtError) => {
      if (caughtError instanceof AppApiError) {
        if (caughtError.statusCode === 401 || caughtError.statusCode === 403 || caughtError.statusCode === 404) {
          setStayInactiveError(
            caughtError.message || 'Stay has checked out or room is inactive.'
          );
          return;
        }
      }
      setStayInactiveError('Invalid or expired room QR code. Please scan your room key card or desk QR.');
    },
  });

  const hasAttemptedResolutionReference = useRef<string | null>(null);

  // Automatically trigger QR token resolution if ?token= exists in URL
  useEffect(() => {
    if (
      qrTokenFromUrl &&
      qrTokenFromUrl.trim().length > 0 &&
      hasAttemptedResolutionReference.current !== qrTokenFromUrl.trim()
    ) {
      hasAttemptedResolutionReference.current = qrTokenFromUrl.trim();
      resolveQrToken(qrTokenFromUrl.trim()).catch(() => {
        // Handled via useResolveQrToken state and onErrorCallback
      });
    }
  }, [qrTokenFromUrl, resolveQrToken]);
export const WelcomePage: React.FC<WelcomePageProperties> = ({
  session = DEFAULT_GUEST_SESSION,
  onNavigate,
}) => {
  const navigate = useNavigate();

  const handleNavigation = (targetDestination: string) => {
    if (onNavigate) {
      onNavigate(targetDestination);
      return;
    }

    if (targetDestination === 'menu') {
      navigate('/menu');
    } else if (targetDestination === 'orders' || targetDestination === 'tracking') {
      navigate('/orders');
    } else if (targetDestination === 'bill') {
      navigate('/bill');
    } else if (targetDestination === 'tracking') {
      navigate('/orders');
    } else {
      navigate(`/${targetDestination}`);
    }
  };

  // Loading resolution state
  if (isResolving) {
    return (
      <div
        data-testid="guest-welcome-loading"
        className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4"
      >
        <Loader2 className="w-10 h-10 text-brand animate-spin" />
        <div className="space-y-1">
          <h2 className="text-base font-bold text-text">Connecting to Room...</h2>
          <p className="text-xs text-text-muted">
            Verifying your active stay session credentials.
          </p>
  return (
    <div className="min-h-full flex flex-col justify-between pb-8">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-b-3xl shadow-elevation-mid">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="success" className="text-emerald-300 bg-emerald-950/60 border-emerald-500/30">
            Active Stay
          </Badge>
          <div className="flex items-center space-x-1 text-slate-300 text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>24/7 Service</span>
          </div>
        </div>
      </div>
    );
  }

  // Stay Inactive / Checked Out / Invalid QR Error View
  if (stayInactiveError || resolveError) {
    const displayErrorMessage =
      stayInactiveError ||
      (resolveError instanceof Error ? resolveError.message : 'Stay Inactive');

    return (
      <div
        data-testid="guest-stay-inactive-view"
        className="p-6 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-4"
      >
        <div className="w-16 h-16 rounded-full bg-status-danger/10 text-status-danger flex items-center justify-center shadow-elevation-low">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-1 max-w-xs">
          <h2 className="text-xl font-bold text-text">
            Stay Checked Out / Inactive
          </h2>
          <p className="text-xs text-text-muted leading-relaxed">
            {displayErrorMessage}
          </p>
        </div>

        <Card className="p-4 bg-surface-muted border-border w-full max-w-sm text-left text-xs text-text-muted space-y-2">
          <div className="flex items-center gap-2 font-semibold text-text">
            <QrCode className="w-4 h-4 text-brand" />
            <span>Room Verification Help</span>
          </div>
          <p>
            • Ensure you are scanning the physical QR code inside your assigned room.
          </p>
          <p>
            • If you just checked in, reception may take up to 60 seconds to activate room privileges.
          </p>
        </Card>

        <div className="w-full max-w-sm flex flex-col gap-2.5 pt-2">
          <Button
            variant="primary"
            size="md"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          <Button variant="primary" size="sm" onClick={() => handleNavigation('menu')}>
            Order Now
          </Button>

          <div className="pt-2 text-xs text-text-muted flex items-center justify-center gap-1.5">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Need immediate help? Dial 0 from your room telephone.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col justify-between pb-8">
      {/* Hero Welcome Header (UI: G01) */}
      <WelcomeHeader
        hotelName={activeSession.hotelName}
        roomNumber={activeSession.roomNumber}
        guestName={activeSession.guestName}
      />

      {/* Main Action Grid and Active Order Section */}
      <div className="p-4 space-y-4 max-w-md mx-auto w-full flex-1">
        {/* Active Order Banner (From Prototype G01) */}
        {SAMPLE_IN_PROGRESS_ORDER && (
          <Card
            className="p-3.5 flex items-center justify-between gap-3 bg-brand-50 border-brand/30 hover:border-brand cursor-pointer shadow-elevation-low transition-all"
            onClick={() => handleNavigation('orders')}
            className="p-4 flex items-center space-x-4 hover:border-emerald-500 transition-all cursor-pointer"
            onClick={() => handleNavigation('menu')}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center shrink-0 shadow-elevation-low">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-brand-strong truncate">
                    {SAMPLE_IN_PROGRESS_ORDER.items[0]?.name}
                  </span>
                  <Badge variant="success">Active</Badge>
                </div>
                <p className="text-[11px] text-text-muted truncate mt-0.5">
                  In progress &bull; arriving in ~12 min
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-brand shrink-0" />
          </Card>
        )}

        {/* Four Core Service Entry Points (UI: G01) */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 px-1">
            Guest Services
          </h2>
          <Card
            className="p-4 flex items-center space-x-4 hover:border-emerald-500 transition-all cursor-pointer"
            onClick={() => handleNavigation('tracking')}
          >
            <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
              <Bell className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 text-base">Live Order Status</h3>
              <p className="text-xs text-slate-500">Track kitchen preparation & delivery</p>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            {/* Primary Action Card: Room Service */}
            <Card
              className="p-4 flex flex-col justify-between h-36 hover:border-brand transition-all cursor-pointer shadow-elevation-low group"
              onClick={() => handleNavigation('menu')}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-text">Room Service</h3>
                <p className="text-[11px] text-text-muted mt-0.5">Kitchen open until 23:00</p>
              </div>
            </Card>

            {/* Action Card: Amenities */}
            <Card
              className="p-4 flex flex-col justify-between h-36 hover:border-brand transition-all cursor-pointer shadow-elevation-low group"
              onClick={() => handleNavigation('menu')}
            >
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-text">Amenities</h3>
                <p className="text-[11px] text-text-muted mt-0.5">Towels, toiletries, pillows</p>
              </div>
            </Card>

            {/* Action Card: My Orders */}
            <Card
              className="p-4 flex flex-col justify-between h-36 hover:border-brand transition-all cursor-pointer shadow-elevation-low group"
              onClick={() => handleNavigation('orders')}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-text">My Orders</h3>
                <p className="text-[11px] text-text-muted mt-0.5">1 on its way</p>
              </div>
            </Card>

            {/* Action Card: Ask Concierge */}
            <Card
              className="p-4 flex flex-col justify-between h-36 hover:border-brand transition-all cursor-pointer shadow-elevation-low group"
              onClick={() => handleNavigation('bill')}
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-text">Folio & Bills</h3>
                <p className="text-[11px] text-text-muted mt-0.5">View stay charges</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Primary Call to Action Button */}
        <Button
          variant="primary"
          size="lg"
          className="w-full flex items-center justify-center gap-2 mt-2 shadow-elevation-mid"
          onClick={() => handleNavigation('menu')}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Browse In-Room Dining Menu</span>
        </Button>
      </div>

      {/* Footer Branding */}
      <div className="text-center text-[11px] text-text-muted py-2">
      <div className="text-center text-xs text-slate-400 py-3">
        Powered by ConciergeIQ &bull; Seamless Hospitality Experience
      </div>
    </div>
  );
};
