import { Volume2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import {
  AUTOPLAY_UNLOCK_BANNER_MESSAGE,
  NEW_ORDER_FLASH_DURATION_MS,
  markOrderAsFlashing,
  playNewOrderChime,
} from '../../../lib/sound';
import {
  STAFF_AUDIO_ALERT_EVENT,
  STAFF_NEW_ORDER_EVENT,
  type NewOrderReceivedPayload,
} from '../../../lib/websocket-client';
import { useRealtimeOptional } from '../../realtime/RealtimeProvider';
import {
  useSoundAlert,
  type UseSoundAlertOptions,
  type UseSoundAlertResult,
} from '../hooks/useSoundAlert';

export {
  AUTOPLAY_UNLOCK_BANNER_MESSAGE,
  NEW_ORDER_FLASH_DURATION_MS,
  useSoundAlert,
  type UseSoundAlertOptions,
  type UseSoundAlertResult,
};

export interface AudioAlertManagerProperties {
  audioSourcePath?: string;
  createAudioElement?: (sourcePath: string) => HTMLAudioElement;
  flashDurationMs?: number;
  onOrderAlertTriggered?: (orderId: string) => void;
}

/**
 * Manages staff audio chimes (`public/sounds/new-order.mp3` with Web Audio API fallback),
 * 5-second visual card flash animations (`animate-pulse-border`) on `NEW_ORDER_RECEIVED`,
 * and renders a dismissible top banner when browser autoplay policy blocks sound playback:
 * "Click here to enable sound alerts for new incoming orders".
 */
export function AudioAlertManager({
  audioSourcePath,
  createAudioElement,
  flashDurationMs = NEW_ORDER_FLASH_DURATION_MS,
  onOrderAlertTriggered,
}: AudioAlertManagerProperties = {}) {
  const realtimeContext = useRealtimeOptional();
  const {
    isSoundEnabled,
    volume,
    shouldShowUnlockBanner,
    unlockAudio,
    dismissUnlockBanner,
  } = useSoundAlert({
    audioSourcePath,
    createAudioElement,
  });

  const isSoundEnabledReference = useRef(isSoundEnabled);
  isSoundEnabledReference.current = isSoundEnabled;

  const volumeReference = useRef(volume);
  volumeReference.current = volume;

  const lastHandledRealtimeOrderIdReference = useRef<string | null>(null);

  useEffect(() => {
    const handleIncomingOrderAlert = (incomingOrderId: string) => {
      if (incomingOrderId) {
        markOrderAsFlashing(incomingOrderId, flashDurationMs);
      }

      if (isSoundEnabledReference.current) {
        void playNewOrderChime({
          audioSourcePath,
          volumeOverride: volumeReference.current,
          createAudioElement,
          deduplicateKey: incomingOrderId || 'staff-incoming-order',
        });
      }

      if (incomingOrderId) {
        onOrderAlertTriggered?.(incomingOrderId);
      }
    };

    const handleNewOrderCustomEvent = (browserEvent: Event) => {
      const customEvent =
        browserEvent as CustomEvent<Partial<NewOrderReceivedPayload> | undefined>;
      const extractedOrderId = customEvent.detail?.orderId ?? '';
      handleIncomingOrderAlert(extractedOrderId);
    };

    window.addEventListener(
      STAFF_NEW_ORDER_EVENT,
      handleNewOrderCustomEvent as EventListener,
    );
    window.addEventListener(
      STAFF_AUDIO_ALERT_EVENT,
      handleNewOrderCustomEvent as EventListener,
    );

    return () => {
      window.removeEventListener(
        STAFF_NEW_ORDER_EVENT,
        handleNewOrderCustomEvent as EventListener,
      );
      window.removeEventListener(
        STAFF_AUDIO_ALERT_EVENT,
        handleNewOrderCustomEvent as EventListener,
      );
    };
  }, [audioSourcePath, createAudioElement, flashDurationMs, onOrderAlertTriggered]);

  useEffect(() => {
    const latestOrderId = realtimeContext?.latestOrder?.orderId ?? null;
    if (
      latestOrderId &&
      latestOrderId !== lastHandledRealtimeOrderIdReference.current
    ) {
      lastHandledRealtimeOrderIdReference.current = latestOrderId;
      markOrderAsFlashing(latestOrderId, flashDurationMs);
      if (isSoundEnabledReference.current) {
        void playNewOrderChime({
          audioSourcePath,
          volumeOverride: volumeReference.current,
          createAudioElement,
          deduplicateKey: latestOrderId,
        });
      }
      onOrderAlertTriggered?.(latestOrderId);
    }
  }, [
    audioSourcePath,
    createAudioElement,
    flashDurationMs,
    onOrderAlertTriggered,
    realtimeContext?.latestOrder?.orderId,
  ]);

  if (!shouldShowUnlockBanner) {
    return null;
  }

  const handleEnableSoundAlertsClick = () => {
    void unlockAudio();
  };

  return (
    <div
      role="region"
      aria-label="Audio alert permission banner"
      data-testid="autoplay-unlock-banner"
      className="flex items-center justify-between gap-3 border-b border-notice-line bg-notice px-4 py-2.5 text-xs text-ink sm:px-6 lg:px-8"
    >
      <button
        type="button"
        onClick={handleEnableSoundAlertsClick}
        data-testid="autoplay-unlock-button"
        className="inline-flex flex-1 items-center gap-2 text-left font-medium text-ink hover:underline focus:outline-none"
      >
        <Volume2
          className="h-4 w-4 shrink-0 text-status-pending"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span>{AUTOPLAY_UNLOCK_BANNER_MESSAGE}</span>
      </button>

      <button
        type="button"
        onClick={dismissUnlockBanner}
        aria-label="Dismiss sound alert banner"
        data-testid="autoplay-unlock-dismiss"
        className="rounded p-1 text-ink-3 hover:bg-surface hover:text-ink transition-colors"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
