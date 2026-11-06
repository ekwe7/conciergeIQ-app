import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { refreshSession } from '../../lib/api-client';
import type { StaffSocketMessage } from '../../lib/api-types';
import { config } from '../../lib/config';
import { queryKeys } from '../../lib/query-keys';
import { session } from '../../lib/session';
import { playNewOrderChime, unlockSound } from '../../lib/sound';
import { StaffSocket, type ConnectionState } from '../../lib/websocket-client';
import { useToast } from '../../components/ui/Toast';
import { formatDuration } from '../../lib/format';
import { useAuth, useCurrentUser } from '../auth/AuthProvider';

export interface NewOrderNotice {
  orderId: string;
  orderNumber: number;
  roomNumber: string;
  itemsSummary: string;
}

interface RealtimeApi {
  connection: ConnectionState;
  soundOn: boolean;
  setSoundOn(on: boolean): void;
  latestOrder: NewOrderNotice | null;
  dismissLatestOrder(): void;
}

const RealtimeContext = createContext<RealtimeApi | null>(null);
const SOUND_KEY = 'conciergeiq.dashboard.sound';

function readSoundPreference(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

/**
 * Keeps the dashboard in step with the hotel: one WebSocket per signed-in
 * tab, scoped by the server to the user's hotel. Each message invalidates the
 * queries it affects; a reconnect refetches everything.
 */
export function RealtimeProvider({ children, createSocket }: { children: ReactNode; createSocket?: (url: string) => WebSocket }) {
  const { hotelId } = useCurrentUser();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [soundOn, setSoundOnState] = useState(readSoundPreference);
  const [latestOrder, setLatestOrder] = useState<NewOrderNotice | null>(null);

  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  const handleMessage = useCallback(
    (message: StaffSocketMessage) => {
      const invalidate = (queryKey: readonly unknown[]) => void queryClient.invalidateQueries({ queryKey });
      switch (message.type) {
        case 'NEW_ORDER_RECEIVED':
          invalidate(queryKeys.orders(hotelId));
          setLatestOrder({
            orderId: message.payload.orderId,
            orderNumber: message.payload.orderNumber,
            roomNumber: message.payload.roomNumber,
            itemsSummary: message.payload.itemsSummary,
          });
          if (soundOnRef.current) playNewOrderChime();
          break;
        case 'ORDER_STATUS_CHANGED':
          invalidate(queryKeys.orders(hotelId));
          invalidate(queryKeys.payments(hotelId));
          invalidate(queryKeys.stays(hotelId));
          break;
        case 'PAYMENT_RECORDED':
          invalidate(queryKeys.orders(hotelId));
          invalidate(queryKeys.payments(hotelId));
          invalidate(queryKeys.stays(hotelId));
          break;
        case 'ITEM_AVAILABILITY_CHANGED':
          invalidate(queryKeys.menu(hotelId));
          break;
        case 'ORDER_ESCALATED': {
          invalidate(queryKeys.escalations(hotelId));
          const who = message.payload.level === 1 ? 'manager' : 'admin';
          toast.show(
            `Room ${message.payload.roomNumber} has waited ${formatDuration(message.payload.waitedSeconds * 1000)}. ` +
              `${message.payload.recipientName} (${who}) was texted.`,
          );
          break;
        }
        case 'SESSION_REVOKED':
          void signOutRef.current('Your account was deactivated. Ask a manager if this is a mistake.');
          break;
        case 'STAFF_CONNECTED':
          break;
      }
    },
    [hotelId, queryClient, toast],
  );

  useEffect(() => {
    const socket = new StaffSocket({
      url: config.realtimeUrl,
      createSocket,
      getAccessToken: async (renew) => {
        const current = renew ? null : session.getAccessToken();
        if (current) return current;
        const tokens = await refreshSession();
        if (tokens) return tokens.accessToken;
        // Refresh token still held means the refresh failed on the network, not on auth.
        if (session.getRefreshToken()) throw new Error('Could not renew the session');
        return null;
      },
      onMessage: handleMessage,
      onStateChange: setConnection,
      onReconnected: () => void queryClient.invalidateQueries({ queryKey: ['hotel', hotelId] }),
      onUnauthorized: () => session.expire(),
    });
    socket.start();
    return () => socket.stop();
  }, [createSocket, handleMessage, hotelId, queryClient]);

  const setSoundOn = useCallback((on: boolean) => {
    if (on) unlockSound();
    setSoundOnState(on);
    try {
      window.localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
    } catch {
      // Preference only lasts for this page load.
    }
  }, []);

  // Browsers only allow audio after a user gesture: unlock on the first click.
  useEffect(() => {
    const unlock = () => unlockSound();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  const value = useMemo<RealtimeApi>(
    () => ({ connection, soundOn, setSoundOn, latestOrder, dismissLatestOrder: () => setLatestOrder(null) }),
    [connection, soundOn, setSoundOn, latestOrder],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeApi {
  const realtime = useContext(RealtimeContext);
  if (!realtime) throw new Error('useRealtime must be used inside RealtimeProvider');
  return realtime;
}
