import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useToast } from '../../components/ui/Toast';
import { refreshSession } from '../../lib/api-client';
import type { StaffSocketMessage } from '../../lib/api-types';
import { config } from '../../lib/config';
import { formatDuration } from '../../lib/format';
import { queryKeys } from '../../lib/query-keys';
import { session } from '../../lib/session';
import {
  markOrderAsFlashing,
  playNewOrderChime,
  readSoundEnabledPreference,
  subscribeToSoundAlertState,
  unlockSound,
  writeSoundEnabledPreference,
} from '../../lib/sound';
import { playNewOrderChime, unlockSound } from '../../lib/sound';
import {
  StaffSocket,
  updateMenuAvailabilityInQueryCache,
  updateOrderStatusInQueryCache,
  type ConnectionState,
  type StaffWebSocketClient,
} from '../../lib/websocket-client';
import { useAuth, useCurrentUser } from '../auth/AuthProvider';

export interface NewOrderNotice {
  orderId: string;
  orderNumber: number;
  roomNumber: string;
  itemsSummary: string;
}

export interface RealtimeApi {
  connection: ConnectionState;
  soundOn: boolean;
  setSoundOn(enabled: boolean): void;
  latestOrder: NewOrderNotice | null;
  dismissLatestOrder(): void;
  webSocketClient: StaffWebSocketClient | null;
  lastEventId: string | null;
}

const RealtimeContext = createContext<RealtimeApi | null>(null);

function readSoundPreference(): boolean {
  return readSoundEnabledPreference();
const SOUND_PREFERENCE_STORAGE_KEY = 'conciergeiq.dashboard.sound';

function readSoundPreference(): boolean {
  try {
    return window.localStorage.getItem(SOUND_PREFERENCE_STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

/**
 * Keeps the dashboard in step with the hotel: one WebSocket per signed-in
 * tab, scoped by the server to the user's hotel. Each message updates and
 * invalidates the queries it affects; a reconnect refetches everything.
 */
export function RealtimeProvider({
  children,
  createSocket,
}: {
  children: ReactNode;
  createSocket?: (destinationUrl: string) => WebSocket;
}) {
  const { hotelId } = useCurrentUser();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const toastNotification = useToast();
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [soundOn, setSoundOnState] = useState(readSoundPreference);
  const [latestOrder, setLatestOrder] = useState<NewOrderNotice | null>(null);
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const activeSocketRef = useRef<StaffSocket | null>(null);

  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  const handleMessage = useCallback(
    (message: StaffSocketMessage) => {
      const currentLastEventId =
        activeSocketRef.current?.getClient().getLastEventId() ?? null;
      if (currentLastEventId) {
        setLastEventId(currentLastEventId);
      }

      const invalidateQueryKey = (targetQueryKey: readonly unknown[]) =>
        void queryClient.invalidateQueries({ queryKey: targetQueryKey });

      switch (message.type) {
        case 'NEW_ORDER_RECEIVED':
          markOrderAsFlashing(message.payload.orderId);
          invalidateQueryKey(queryKeys.orders(hotelId));
          setLatestOrder({
            orderId: message.payload.orderId,
            orderNumber: message.payload.orderNumber,
            roomNumber: message.payload.roomNumber,
            itemsSummary: message.payload.itemsSummary,
          });
          if (soundOnRef.current) {
            void playNewOrderChime({
              deduplicateKey: message.payload.orderId || 'staff-incoming-order',
            });
          }
          break;
        case 'ORDER_STATUS_CHANGED':
          updateOrderStatusInQueryCache(queryClient, hotelId, {
            orderId: message.payload.orderId,
            orderNumber: message.payload.orderNumber,
            previousStatus: message.payload.previousStatus,
            newStatus: message.payload.newStatus,
            changedBy: message.payload.changedBy,
            updatedAt: message.payload.updatedAt,
          });
          invalidateQueryKey(queryKeys.orders(hotelId));
          invalidateQueryKey(queryKeys.payments(hotelId));
          invalidateQueryKey(queryKeys.stays(hotelId));
          break;
        case 'PAYMENT_RECORDED':
          invalidateQueryKey(queryKeys.orders(hotelId));
          invalidateQueryKey(queryKeys.payments(hotelId));
          invalidateQueryKey(queryKeys.stays(hotelId));
          break;
        case 'ITEM_AVAILABILITY_CHANGED':
          updateMenuAvailabilityInQueryCache(queryClient, hotelId, {
            itemId: message.payload.itemId,
            itemName: message.payload.itemName,
            isAvailable: message.payload.isAvailable,
          });
          invalidateQueryKey(queryKeys.menu(hotelId));
          break;
        case 'ORDER_ESCALATED': {
          invalidateQueryKey(queryKeys.escalations(hotelId));
          const recipientRoleLabel =
            message.payload.level === 1 ? 'manager' : 'admin';
          toastNotification.show(
            `Room ${message.payload.roomNumber} has waited ${formatDuration(
              message.payload.waitedSeconds * 1000,
            )}. ` +
              `${message.payload.recipientName} (${recipientRoleLabel}) was texted.`,
          );
          break;
        }
        case 'SESSION_REVOKED':
          void signOutRef.current(
            'Your account was deactivated. Ask a manager if this is a mistake.',
          );
          break;
        case 'STAFF_CONNECTED':
          break;
      }
    },
    [hotelId, queryClient, toastNotification],
  );

  useEffect(() => {
    const staffSocket = new StaffSocket({
      url: config.realtimeUrl,
      createSocket,
      getAccessToken: async (shouldRenew) => {
        const currentAccessToken = shouldRenew
          ? null
          : session.getAccessToken();
        if (currentAccessToken) return currentAccessToken;
        const refreshedTokens = await refreshSession();
        if (refreshedTokens) return refreshedTokens.accessToken;
        if (session.getRefreshToken()) {
          throw new Error('Could not renew the session');
        }
        return null;
      },
      onMessage: handleMessage,
      onStateChange: setConnection,
      onReconnected: () =>
        void queryClient.invalidateQueries({ queryKey: ['hotel', hotelId] }),
      onUnauthorized: () => session.expire(),
    });
    activeSocketRef.current = staffSocket;
    staffSocket.getClient().updateConfiguration({
      onSessionRevoked: () => {
        void signOutRef.current(
          'Your account was deactivated. Ask a manager if this is a mistake.',
        );
      },
    });
    staffSocket.start();
    return () => {
      staffSocket.stop();
      if (activeSocketRef.current === staffSocket) {
        activeSocketRef.current = null;
      }
    };
  }, [createSocket, handleMessage, hotelId, queryClient]);

  useEffect(() => {
    return subscribeToSoundAlertState((updatedSnapshot) => {
      setSoundOnState(updatedSnapshot.isSoundEnabled);
    });
  }, []);

  const setSoundOn = useCallback((enabled: boolean) => {
    if (enabled) void unlockSound();
    setSoundOnState(enabled);
    writeSoundEnabledPreference(enabled);
  }, []);

  useEffect(() => {
    const handleUnlockAudio = () => void unlockSound();
  const setSoundOn = useCallback((enabled: boolean) => {
    if (enabled) unlockSound();
    setSoundOnState(enabled);
    try {
      window.localStorage.setItem(
        SOUND_PREFERENCE_STORAGE_KEY,
        enabled ? 'on' : 'off',
      );
    } catch {
      // Preference only lasts for this page load.
    }
  }, []);

  useEffect(() => {
    const handleUnlockAudio = () => unlockSound();
    window.addEventListener('pointerdown', handleUnlockAudio, { once: true });
    return () => window.removeEventListener('pointerdown', handleUnlockAudio);
  }, []);

  const contextValue = useMemo<RealtimeApi>(
    () => ({
      connection,
      soundOn,
      setSoundOn,
      latestOrder,
      dismissLatestOrder: () => setLatestOrder(null),
      webSocketClient: activeSocketRef.current?.getClient() ?? null,
      lastEventId,
    }),
    [connection, soundOn, setSoundOn, latestOrder, lastEventId],
  );

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeApi {
  const realtime = useContext(RealtimeContext);
  if (!realtime) {
    throw new Error('useRealtime must be used inside RealtimeProvider');
  }
  return realtime;
}

export function useRealtimeOptional(): RealtimeApi | null {
  return useContext(RealtimeContext);
}
