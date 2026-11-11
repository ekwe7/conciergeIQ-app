/**
 * Staff audio/visual notification subsystem.
 *
 * Plays `public/sounds/new-order.mp3` via HTML5 Audio (`HTMLAudioElement`) when a
 * new guest order arrives (`NEW_ORDER_RECEIVED`). If the static MP3 asset fails
 * to load or decode, falls back to an in-memory Web Audio API two-note chime
 * (`659.25 Hz` E5 -> `880 Hz` A5).
 *
 * Also tracks browser autoplay policy blocks (`NotAllowedError`) so the UI can
 * prompt staff with the unlock banner:
 * "Click here to enable sound alerts for new incoming orders"
 * and manages the 5-second visual flash state (`animate-pulse-border`) for newly
 * arrived order cards.
 */

export const NEW_ORDER_AUDIO_SOURCE_PATH = '/sounds/new-order.mp3';
export const SOUND_PREFERENCE_STORAGE_KEY = 'conciergeiq.dashboard.sound';
export const SOUND_VOLUME_STORAGE_KEY = 'conciergeiq.dashboard.volume';
export const DEFAULT_NOTIFICATION_VOLUME = 0.8;
export const NEW_ORDER_FLASH_DURATION_MS = 5_000;
export const AUTOPLAY_UNLOCK_BANNER_MESSAGE =
  'Click here to enable sound alerts for new incoming orders';

const CHIME_DEDUPLICATION_WINDOW_MS = 150;

export interface SoundAlertStateSnapshot {
  isMuted: boolean;
  isSoundEnabled: boolean;
  volume: number;
  isAutoplayBlocked: boolean;
  isAudioUnlocked: boolean;
  isBannerDismissed: boolean;
  flashingOrderIds: ReadonlySet<string>;
}

export interface PlayNewOrderChimeOptions {
  audioSourcePath?: string;
  volumeOverride?: number;
  createAudioElement?: (sourcePath: string) => HTMLAudioElement;
  deduplicateKey?: string;
  bypassMuteCheck?: boolean;
}

type SoundAlertStateListener = (snapshot: SoundAlertStateSnapshot) => void;

let sharedAudioContext: AudioContext | null = null;
let sharedHtmlAudioElement: HTMLAudioElement | null = null;
let customAudioElementFactory: ((sourcePath: string) => HTMLAudioElement) | null =
  null;

let isAutoplayBlockedInternal = false;
let isAudioUnlockedInternal = false;
let isBannerDismissedInternal = false;
let lastDeduplicatedOrderKey: string | null = null;
let lastDeduplicatedTimestampMs = 0;

const activeFlashingOrderTimers = new Map<
  string,
  ReturnType<typeof setTimeout>
>();
let flashingOrderIdsSet: Set<string> = new Set();
const stateListeners = new Set<SoundAlertStateListener>();

export function clampAudioVolume(rawVolumeLevel: number): number {
  if (!Number.isFinite(rawVolumeLevel)) {
    return DEFAULT_NOTIFICATION_VOLUME;
  }
  return Math.min(1, Math.max(0, rawVolumeLevel));
}

export function readSoundEnabledPreference(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  try {
    const storedPreference = window.localStorage.getItem(
      SOUND_PREFERENCE_STORAGE_KEY,
    );
    return storedPreference !== 'off' && storedPreference !== 'muted';
  } catch {
    return true;
  }
}

export function writeSoundEnabledPreference(isSoundEnabled: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(
      SOUND_PREFERENCE_STORAGE_KEY,
      isSoundEnabled ? 'on' : 'off',
    );
  } catch {
    // Preference only lasts for this page load when storage is unavailable.
  }
  notifySoundAlertListeners();
}

export function readSoundVolumePreference(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_NOTIFICATION_VOLUME;
  }
  try {
    const rawStoredVolume = window.localStorage.getItem(
      SOUND_VOLUME_STORAGE_KEY,
    );
    if (rawStoredVolume === null) {
      return DEFAULT_NOTIFICATION_VOLUME;
    }
    const parsedVolume = Number.parseFloat(rawStoredVolume);
    return clampAudioVolume(parsedVolume);
  } catch {
    return DEFAULT_NOTIFICATION_VOLUME;
  }
}

export function writeSoundVolumePreference(volumeLevel: number): void {
  const clampedVolume = clampAudioVolume(volumeLevel);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        SOUND_VOLUME_STORAGE_KEY,
        String(clampedVolume),
      );
    } catch {
      // Ignore storage write errors in restricted browsing modes.
    }
  }
  if (sharedHtmlAudioElement) {
    try {
      sharedHtmlAudioElement.volume = clampedVolume;
    } catch {
      // Ignore read-only volume property on mocked elements.
    }
  }
  notifySoundAlertListeners();
}

export function getSoundAlertSnapshot(): SoundAlertStateSnapshot {
  const isSoundEnabled = readSoundEnabledPreference();
  const volume = readSoundVolumePreference();
  return {
    isMuted: !isSoundEnabled,
    isSoundEnabled,
    volume,
    isAutoplayBlocked: isAutoplayBlockedInternal,
    isAudioUnlocked: isAudioUnlockedInternal,
    isBannerDismissed: isBannerDismissedInternal,
    flashingOrderIds: new Set(flashingOrderIdsSet),
  };
}

function notifySoundAlertListeners(): void {
  const currentSnapshot = getSoundAlertSnapshot();
  stateListeners.forEach((listenerCallback) => {
    listenerCallback(currentSnapshot);
  });
}

export function subscribeToSoundAlertState(
  listenerCallback: SoundAlertStateListener,
): () => void {
  stateListeners.add(listenerCallback);
  return () => {
    stateListeners.delete(listenerCallback);
  };
}

export function setCustomAudioElementFactory(
  factoryFunction: ((sourcePath: string) => HTMLAudioElement) | null,
): void {
  customAudioElementFactory = factoryFunction;
  sharedHtmlAudioElement = null;
}

export function setAutoplayBlockedState(isBlocked: boolean): void {
  isAutoplayBlockedInternal = isBlocked;
  if (isBlocked) {
    isBannerDismissedInternal = false;
  }
  notifySoundAlertListeners();
}

export function dismissAutoplayUnlockBanner(): void {
  isBannerDismissedInternal = true;
  notifySoundAlertListeners();
}

export function markOrderAsFlashing(
  orderId: string,
  flashDurationMs: number = NEW_ORDER_FLASH_DURATION_MS,
): void {
  if (!orderId) {
    return;
  }

  const existingTimer = activeFlashingOrderTimers.get(orderId);
  if (existingTimer !== undefined) {
    clearTimeout(existingTimer);
  }

  flashingOrderIdsSet = new Set(flashingOrderIdsSet);
  flashingOrderIdsSet.add(orderId);
  notifySoundAlertListeners();

  const expirationTimer = setTimeout(() => {
    activeFlashingOrderTimers.delete(orderId);
    if (flashingOrderIdsSet.has(orderId)) {
      const updatedSet = new Set(flashingOrderIdsSet);
      updatedSet.delete(orderId);
      flashingOrderIdsSet = updatedSet;
      notifySoundAlertListeners();
    }
  }, flashDurationMs);

  activeFlashingOrderTimers.set(orderId, expirationTimer);
}

export function clearOrderFlashing(orderId: string): void {
  const existingTimer = activeFlashingOrderTimers.get(orderId);
  if (existingTimer !== undefined) {
    clearTimeout(existingTimer);
    activeFlashingOrderTimers.delete(orderId);
  }
  if (flashingOrderIdsSet.has(orderId)) {
    const updatedSet = new Set(flashingOrderIdsSet);
    updatedSet.delete(orderId);
    flashingOrderIdsSet = updatedSet;
    notifySoundAlertListeners();
  }
}

export function isOrderCurrentlyFlashing(orderId: string): boolean {
  return flashingOrderIdsSet.has(orderId);
}

export function resetSoundAlertState(): void {
  activeFlashingOrderTimers.forEach((timerHandle) => {
    clearTimeout(timerHandle);
  });
  activeFlashingOrderTimers.clear();
  flashingOrderIdsSet = new Set();
  isAutoplayBlockedInternal = false;
  isAudioUnlockedInternal = false;
  isBannerDismissedInternal = false;
  lastDeduplicatedOrderKey = null;
  lastDeduplicatedTimestampMs = 0;
  sharedHtmlAudioElement = null;
  customAudioElementFactory = null;
  notifySoundAlertListeners();
}

function getOrCreateWebAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const AudioContextConstructor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (typeof AudioContextConstructor !== 'function') {
    return null;
  }
  try {
    sharedAudioContext ??= new AudioContextConstructor();
    return sharedAudioContext;
  } catch {
    return null;
  }
}

function createHtmlAudioInstance(
  sourcePath: string = NEW_ORDER_AUDIO_SOURCE_PATH,
  explicitFactory?: (sourcePath: string) => HTMLAudioElement,
): HTMLAudioElement | null {
  const factoryToUse = explicitFactory ?? customAudioElementFactory;
  if (factoryToUse) {
    return factoryToUse(sourcePath);
  }
  if (typeof window === 'undefined' || typeof window.Audio !== 'function') {
    return null;
  }
  try {
    if (
      !sharedHtmlAudioElement ||
      !sharedHtmlAudioElement.src.endsWith(sourcePath)
    ) {
      sharedHtmlAudioElement = new window.Audio(sourcePath);
      sharedHtmlAudioElement.preload = 'auto';
    }
    return sharedHtmlAudioElement;
  } catch {
    return null;
  }
}

export function isJsdomUnimplementedPlaybackError(
  caughtError: unknown,
): boolean {
  if (!caughtError || typeof caughtError !== 'object') {
    return false;
  }
  const errorMessage = String(
    (caughtError as { message?: unknown }).message ?? '',
  );
  return /not implemented.*htmlmediaelement/i.test(errorMessage);
}

export function isMediaAssetLoadFailureError(caughtError: unknown): boolean {
  if (!caughtError || typeof caughtError !== 'object') {
    return false;
  }
  const errorName = String((caughtError as { name?: unknown }).name ?? '');
  const errorMessage = String(
    (caughtError as { message?: unknown }).message ?? '',
  );
  if (errorName === 'NotSupportedError' || errorName === 'AbortError') {
    return true;
  }
  return /failed to load|no supported source|network|decode|mediaerror|source error/i.test(
    `${errorName} ${errorMessage}`,
  );
}

export function isAutoplayPolicyBlockedError(caughtError: unknown): boolean {
  if (!caughtError || typeof caughtError !== 'object') {
    return false;
  }
  if (
    isJsdomUnimplementedPlaybackError(caughtError) ||
    isMediaAssetLoadFailureError(caughtError)
  ) {
    return false;
  }
  const errorName = String((caughtError as { name?: unknown }).name ?? '');
  const errorMessage = String(
    (caughtError as { message?: unknown }).message ?? '',
  );
  if (errorName === 'NotAllowedError') {
    return true;
  }
  return /notallowed|not allowed|autoplay|interact|gesture|blocked|permission|play\(\) failed/i.test(
    `${errorName} ${errorMessage}`,
  );
}

/**
 * Synthesizes an in-memory two-note notification chime (E5 -> A5) using the
 * Web Audio API when the static `/sounds/new-order.mp3` file cannot be loaded.
 */
export function playSynthesizedWebAudioChime(
  volumeLevel: number = readSoundVolumePreference(),
): boolean {
  const audioContextInstance = getOrCreateWebAudioContext();
  if (!audioContextInstance) {
    return false;
  }

  if (audioContextInstance.state === 'suspended') {
    void audioContextInstance.resume().catch(() => {});
  }
  if (audioContextInstance.state !== 'running') {
    return false;
  }

  const clampedVolume = clampAudioVolume(volumeLevel);
  if (clampedVolume <= 0) {
    return false;
  }

  const peakGainValue = Math.max(0.001, clampedVolume * 0.22);
  const startTimeSeconds = audioContextInstance.currentTime;

  [659.25, 880].forEach((noteFrequencyHertz, noteIndex) => {
    const oscillatorNode = audioContextInstance.createOscillator();
    const gainNode = audioContextInstance.createGain();
    const noteStartTime = startTimeSeconds + noteIndex * 0.18;

    oscillatorNode.type = 'sine';
    oscillatorNode.frequency.value = noteFrequencyHertz;

    gainNode.gain.setValueAtTime(0.0001, noteStartTime);
    gainNode.gain.exponentialRampToValueAtTime(
      peakGainValue,
      noteStartTime + 0.02,
    );
    gainNode.gain.exponentialRampToValueAtTime(0.0001, noteStartTime + 0.5);

    oscillatorNode
      .connect(gainNode)
      .connect(audioContextInstance.destination);
    oscillatorNode.start(noteStartTime);
    oscillatorNode.stop(noteStartTime + 0.55);
  });

  return true;
}

/**
 * Unlocks browser audio playback on a user gesture (e.g., clicking the
 * autoplay unlock banner or toggling sound on in the header).
 */
export async function unlockSound(
  customFactory?: (sourcePath: string) => HTMLAudioElement,
): Promise<boolean> {
  let unlockedSuccessfully = false;

  const webAudioContext = getOrCreateWebAudioContext();
  if (webAudioContext && typeof webAudioContext.resume === 'function') {
    try {
      await webAudioContext.resume();
      if (webAudioContext.state === 'running') {
        unlockedSuccessfully = true;
      }
    } catch {
      // Ignore Web Audio resume errors during gesture unlock.
    }
  }

  const audioElement = createHtmlAudioInstance(
    NEW_ORDER_AUDIO_SOURCE_PATH,
    customFactory,
  );
  if (audioElement && typeof audioElement.play === 'function') {
    const previousVolume = audioElement.volume;
    const previousMuted = audioElement.muted;
    try {
      audioElement.muted = true;
      audioElement.volume = 0;
      const playPromise = audioElement.play();
      if (playPromise && typeof playPromise.then === 'function') {
        await playPromise;
      }
      if (typeof audioElement.pause === 'function') {
        audioElement.pause();
      }
      try {
        audioElement.currentTime = 0;
      } catch {
        // Ignore read-only currentTime in mocked audio objects.
      }
      unlockedSuccessfully = true;
    } catch (caughtError) {
      if (isJsdomUnimplementedPlaybackError(caughtError)) {
        unlockedSuccessfully = true;
      }
    } finally {
      try {
        audioElement.muted = previousMuted;
        audioElement.volume = readSoundVolumePreference() ?? previousVolume;
      } catch {
        // Ignore property restoration errors on mocked objects.
      }
    }
  } else {
    unlockedSuccessfully = true;
  }

  if (unlockedSuccessfully) {
    isAutoplayBlockedInternal = false;
    isAudioUnlockedInternal = true;
    isBannerDismissedInternal = false;
    notifySoundAlertListeners();
  }

  return unlockedSuccessfully;
}

/**
 * Plays the new-order notification chime using `/sounds/new-order.mp3`
 * with an automatic Web Audio API synthesis fallback if the MP3 asset fails to load.
 */
export async function playNewOrderChime(
  options: PlayNewOrderChimeOptions = {},
): Promise<boolean> {
  const isSoundEnabled = options.bypassMuteCheck
    ? true
    : readSoundEnabledPreference();
  if (!isSoundEnabled) {
    return false;
  }

  const effectiveVolume = clampAudioVolume(
    options.volumeOverride ?? readSoundVolumePreference(),
  );
  if (effectiveVolume <= 0) {
    return false;
  }

  if (options.deduplicateKey) {
    const nowTimestampMs = Date.now();
    if (
      lastDeduplicatedOrderKey === options.deduplicateKey &&
      nowTimestampMs - lastDeduplicatedTimestampMs < CHIME_DEDUPLICATION_WINDOW_MS
    ) {
      return false;
    }
    lastDeduplicatedOrderKey = options.deduplicateKey;
    lastDeduplicatedTimestampMs = nowTimestampMs;
  }

  const targetAudioSourcePath =
    options.audioSourcePath ?? NEW_ORDER_AUDIO_SOURCE_PATH;
  const audioElement = createHtmlAudioInstance(
    targetAudioSourcePath,
    options.createAudioElement,
  );

  if (audioElement && typeof audioElement.play === 'function') {
    try {
      audioElement.muted = false;
      audioElement.volume = effectiveVolume;
      try {
        audioElement.currentTime = 0;
      } catch {
        // Some test mocks define currentTime as read-only or omit it.
      }

      const playbackPromise = audioElement.play();
      if (playbackPromise && typeof playbackPromise.then === 'function') {
        await playbackPromise;
      }

      isAutoplayBlockedInternal = false;
      isAudioUnlockedInternal = true;
      notifySoundAlertListeners();
      return true;
    } catch (caughtError) {
      if (isAutoplayPolicyBlockedError(caughtError)) {
        isAutoplayBlockedInternal = true;
        isBannerDismissedInternal = false;
        notifySoundAlertListeners();
        return false;
      }

      // Static MP3 asset failed to load or environment lacks HTMLMediaElement implementation:
      // fall back to in-memory Web Audio API synthesis.
      const fallbackPlayed = playSynthesizedWebAudioChime(effectiveVolume);
      if (fallbackPlayed) {
        isAutoplayBlockedInternal = false;
        isAudioUnlockedInternal = true;
        notifySoundAlertListeners();
      }
      return fallbackPlayed;
    }
  }

  const fallbackPlayed = playSynthesizedWebAudioChime(effectiveVolume);
  if (fallbackPlayed) {
    isAutoplayBlockedInternal = false;
    isAudioUnlockedInternal = true;
    notifySoundAlertListeners();
  }
  return fallbackPlayed;
}
