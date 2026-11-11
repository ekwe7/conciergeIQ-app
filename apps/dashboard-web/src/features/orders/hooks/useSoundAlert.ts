import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_NOTIFICATION_VOLUME,
  NEW_ORDER_AUDIO_SOURCE_PATH,
  NEW_ORDER_FLASH_DURATION_MS,
  clampAudioVolume,
  dismissAutoplayUnlockBanner,
  getSoundAlertSnapshot,
  isOrderCurrentlyFlashing,
  markOrderAsFlashing,
  playNewOrderChime,
  subscribeToSoundAlertState,
  unlockSound,
  writeSoundEnabledPreference,
  writeSoundVolumePreference,
  type SoundAlertStateSnapshot,
} from '../../../lib/sound';
import { useRealtimeOptional } from '../../realtime/RealtimeProvider';

export interface UseSoundAlertOptions {
  audioSourcePath?: string;
  initialMuted?: boolean;
  initialVolume?: number;
  createAudioElement?: (sourcePath: string) => HTMLAudioElement;
}

export interface UseSoundAlertResult {
  isMuted: boolean;
  isSoundEnabled: boolean;
  soundOn: boolean;
  volume: number;
  isAutoplayBlocked: boolean;
  isAudioUnlocked: boolean;
  isBannerDismissed: boolean;
  shouldShowUnlockBanner: boolean;
  flashingOrderIds: ReadonlySet<string>;
  isOrderFlashing: (orderId: string) => boolean;
  triggerOrderFlash: (orderId: string, flashDurationMs?: number) => void;
  playAlert: () => Promise<boolean>;
  playChime: () => Promise<boolean>;
  playSound: () => Promise<boolean>;
  toggleMute: () => void;
  toggleSound: () => void;
  setMuted: (shouldMute: boolean) => void;
  setSoundOn: (shouldEnableSound: boolean) => void;
  setVolume: (newVolumeLevel: number) => void;
  unlockAudio: () => Promise<boolean>;
  dismissUnlockBanner: () => void;
}

/**
 * React hook managing staff order notification audio playback, mute/unmute state,
 * volume level, browser autoplay policy detection/unlocking, and 5-second visual
 * order card flash animations (`animate-pulse-border`).
 */
export function useSoundAlert(
  options: UseSoundAlertOptions = {},
): UseSoundAlertResult {
  const realtimeContext = useRealtimeOptional();
  const optionsReference = useRef<UseSoundAlertOptions>(options);
  optionsReference.current = options;

  const [alertSnapshot, setAlertSnapshot] = useState<SoundAlertStateSnapshot>(
    () => {
      if (options.initialMuted !== undefined) {
        writeSoundEnabledPreference(!options.initialMuted);
      }
      if (options.initialVolume !== undefined) {
        writeSoundVolumePreference(options.initialVolume);
      }
      return getSoundAlertSnapshot();
    },
  );

  useEffect(() => {
    setAlertSnapshot(getSoundAlertSnapshot());
    return subscribeToSoundAlertState((updatedSnapshot) => {
      setAlertSnapshot(updatedSnapshot);
    });
  }, []);

  const isSoundEnabled =
    realtimeContext !== null
      ? realtimeContext.soundOn && alertSnapshot.isSoundEnabled
      : alertSnapshot.isSoundEnabled;
  const isMuted = !isSoundEnabled;
  const volume = alertSnapshot.volume ?? DEFAULT_NOTIFICATION_VOLUME;

  const setSoundOn = useCallback(
    (shouldEnableSound: boolean) => {
      writeSoundEnabledPreference(shouldEnableSound);
      realtimeContext?.setSoundOn(shouldEnableSound);
      if (shouldEnableSound) {
        void unlockSound(optionsReference.current.createAudioElement);
      }
    },
    [realtimeContext],
  );

  const setMuted = useCallback(
    (shouldMute: boolean) => {
      setSoundOn(!shouldMute);
    },
    [setSoundOn],
  );

  const toggleMute = useCallback(() => {
    const currentSnapshot = getSoundAlertSnapshot();
    const currentlyEnabled =
      realtimeContext !== null
        ? realtimeContext.soundOn && currentSnapshot.isSoundEnabled
        : currentSnapshot.isSoundEnabled;
    setSoundOn(!currentlyEnabled);
  }, [realtimeContext, setSoundOn]);

  const setVolume = useCallback((newVolumeLevel: number) => {
    const clampedVolume = clampAudioVolume(newVolumeLevel);
    writeSoundVolumePreference(clampedVolume);
  }, []);

  const playAlert = useCallback(async (): Promise<boolean> => {
    const currentSnapshot = getSoundAlertSnapshot();
    const currentlyEnabled =
      realtimeContext !== null
        ? realtimeContext.soundOn && currentSnapshot.isSoundEnabled
        : currentSnapshot.isSoundEnabled;
    if (!currentlyEnabled) {
      return false;
    }

    return playNewOrderChime({
      audioSourcePath:
        optionsReference.current.audioSourcePath ?? NEW_ORDER_AUDIO_SOURCE_PATH,
      volumeOverride: currentSnapshot.volume,
      createAudioElement: optionsReference.current.createAudioElement,
    });
  }, [realtimeContext]);

  const unlockAudio = useCallback(async (): Promise<boolean> => {
    return unlockSound(optionsReference.current.createAudioElement);
  }, []);

  const dismissUnlockBanner = useCallback(() => {
    dismissAutoplayUnlockBanner();
  }, []);

  const triggerOrderFlash = useCallback(
    (orderId: string, flashDurationMs: number = NEW_ORDER_FLASH_DURATION_MS) => {
      markOrderAsFlashing(orderId, flashDurationMs);
    },
    [],
  );

  const checkIsOrderFlashing = useCallback(
    (orderId: string): boolean => {
      return (
        alertSnapshot.flashingOrderIds.has(orderId) ||
        isOrderCurrentlyFlashing(orderId)
      );
    },
    [alertSnapshot.flashingOrderIds],
  );

  const shouldShowUnlockBanner =
    alertSnapshot.isAutoplayBlocked &&
    !alertSnapshot.isBannerDismissed &&
    !isMuted;

  return {
    isMuted,
    isSoundEnabled,
    soundOn: isSoundEnabled,
    volume,
    isAutoplayBlocked: alertSnapshot.isAutoplayBlocked,
    isAudioUnlocked: alertSnapshot.isAudioUnlocked,
    isBannerDismissed: alertSnapshot.isBannerDismissed,
    shouldShowUnlockBanner,
    flashingOrderIds: alertSnapshot.flashingOrderIds,
    isOrderFlashing: checkIsOrderFlashing,
    triggerOrderFlash,
    playAlert,
    playChime: playAlert,
    playSound: playAlert,
    toggleMute,
    toggleSound: toggleMute,
    setMuted,
    setSoundOn,
    setVolume,
    unlockAudio,
    dismissUnlockBanner,
  };
}
