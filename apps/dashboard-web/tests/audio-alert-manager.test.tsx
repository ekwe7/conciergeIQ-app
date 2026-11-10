import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTOPLAY_UNLOCK_BANNER_MESSAGE,
  AudioAlertManager,
  NEW_ORDER_FLASH_DURATION_MS,
  useSoundAlert,
} from '../src/features/orders/components/AudioAlertManager';
import { OrderCard } from '../src/features/orders/components/OrderCard';
import { session } from '../src/lib/session';
import {
  NEW_ORDER_AUDIO_SOURCE_PATH,
  resetSoundAlertState,
} from '../src/lib/sound';
import { STAFF_NEW_ORDER_EVENT } from '../src/lib/websocket-client';
import {
  FakeSocket,
  fakeApi,
  order,
  renderDashboard,
  signedInHandlers,
} from './support';

interface MockHtmlAudioElementInstance {
  src: string;
  volume: number;
  muted: boolean;
  currentTime: number;
  preload: string;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
}

function createMockAudioConstructor(
  playImplementation: () => Promise<void> = () => Promise.resolve(),
) {
  const createdAudioInstances: MockHtmlAudioElementInstance[] = [];

  class MockAudioElement implements MockHtmlAudioElementInstance {
    public src: string;
    public volume = 0.8;
    public muted = false;
    public currentTime = 0;
    public preload = 'auto';
    public play = vi.fn(playImplementation);
    public pause = vi.fn();

    constructor(sourcePath = '') {
      this.src = sourcePath;
      createdAudioInstances.push(this);
    }
  }

  vi.stubGlobal('Audio', MockAudioElement);
  return { createdAudioInstances, MockAudioElement };
}

describe('useSoundAlert hook & AudioAlertManager subsystem', () => {
  beforeEach(() => {
    resetSoundAlertState();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('plays /sounds/new-order.mp3 via HTMLAudioElement when sound is enabled', async () => {
    const { createdAudioInstances } = createMockAudioConstructor(() =>
      Promise.resolve(),
    );

    const { result } = renderHook(() => useSoundAlert());

    expect(result.current.isMuted).toBe(false);
    expect(result.current.isSoundEnabled).toBe(true);

    let didPlay = false;
    await act(async () => {
      didPlay = await result.current.playAlert();
    });

    expect(didPlay).toBe(true);
    expect(createdAudioInstances.length).toBe(1);
    expect(createdAudioInstances[0]?.src).toContain(NEW_ORDER_AUDIO_SOURCE_PATH);
    expect(createdAudioInstances[0]?.play).toHaveBeenCalledTimes(1);
    expect(result.current.isAutoplayBlocked).toBe(false);
    expect(result.current.isAudioUnlocked).toBe(true);
  });

  it('toggles mute state, persists to localStorage, and suppresses playback when muted', async () => {
    const { createdAudioInstances } = createMockAudioConstructor(() =>
      Promise.resolve(),
    );

    const { result } = renderHook(() => useSoundAlert());
    expect(result.current.isMuted).toBe(false);

    act(() => {
      result.current.toggleMute();
    });

    expect(result.current.isMuted).toBe(true);
    expect(result.current.soundOn).toBe(false);
    expect(window.localStorage.getItem('conciergeiq.dashboard.sound')).toBe(
      'off',
    );

    let didPlayWhileMuted = true;
    await act(async () => {
      didPlayWhileMuted = await result.current.playAlert();
    });

    expect(didPlayWhileMuted).toBe(false);
    expect(createdAudioInstances.length).toBe(0);

    // Unmute again and verify playback resumes
    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.isMuted).toBe(false);

    await act(async () => {
      didPlayWhileMuted = await result.current.playAlert();
    });
    expect(didPlayWhileMuted).toBe(true);
  });

  it('updates notification volume level and applies it to HTMLAudioElement', async () => {
    const { createdAudioInstances } = createMockAudioConstructor(() =>
      Promise.resolve(),
    );

    const { result } = renderHook(() => useSoundAlert());

    act(() => {
      result.current.setVolume(0.45);
    });

    expect(result.current.volume).toBeCloseTo(0.45, 2);

    await act(async () => {
      await result.current.playAlert();
    });

    expect(createdAudioInstances[0]?.volume).toBeCloseTo(0.45, 2);
  });

  it('detects browser autoplay policy block (NotAllowedError) and unlocks on user gesture', async () => {
    let shouldBlockAutoplay = true;
    createMockAudioConstructor(() => {
      if (shouldBlockAutoplay) {
        const autoplayBlockedError = new Error(
          'play() failed because the user did not interact with the document first.',
        );
        autoplayBlockedError.name = 'NotAllowedError';
        return Promise.reject(autoplayBlockedError);
      }
      return Promise.resolve();
    });

    const { result } = renderHook(() => useSoundAlert());

    let playbackSucceeded = true;
    await act(async () => {
      playbackSucceeded = await result.current.playAlert();
    });

    expect(playbackSucceeded).toBe(false);
    expect(result.current.isAutoplayBlocked).toBe(true);
    expect(result.current.shouldShowUnlockBanner).toBe(true);

    // User clicks to unlock audio
    shouldBlockAutoplay = false;
    await act(async () => {
      await result.current.unlockAudio();
    });

    expect(result.current.isAutoplayBlocked).toBe(false);
    expect(result.current.isAudioUnlocked).toBe(true);
    expect(result.current.shouldShowUnlockBanner).toBe(false);
  });

  it('falls back to Web Audio API synthesis if the static MP3 asset fails to load', async () => {
    createMockAudioConstructor(() => {
      const assetLoadError = new Error(
        'Failed to load because no supported source was found.',
      );
      assetLoadError.name = 'NotSupportedError';
      return Promise.reject(assetLoadError);
    });

    const oscillatorStartSpy = vi.fn();
    const oscillatorStopSpy = vi.fn();

    class MockWebAudioContext {
      public state: AudioContextState = 'running';
      public currentTime = 0;
      public destination = {};
      public resume = vi.fn(() => Promise.resolve());
      public createOscillator = vi.fn(() => ({
        type: 'sine',
        frequency: { value: 440 },
        connect: vi.fn(() => ({
          connect: vi.fn(),
        })),
        start: oscillatorStartSpy,
        stop: oscillatorStopSpy,
      }));
      public createGain = vi.fn(() => ({
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      }));
    }

    vi.stubGlobal('AudioContext', MockWebAudioContext);

    const { result } = renderHook(() => useSoundAlert());

    let fallbackPlaybackSucceeded = false;
    await act(async () => {
      fallbackPlaybackSucceeded = await result.current.playAlert();
    });

    expect(fallbackPlaybackSucceeded).toBe(true);
    expect(oscillatorStartSpy).toHaveBeenCalledTimes(2);
    expect(oscillatorStopSpy).toHaveBeenCalledTimes(2);
    expect(result.current.isAutoplayBlocked).toBe(false);
  });

  it('renders the autoplay unlock banner when blocked and unlocks or dismisses on click', async () => {
    let shouldBlockAutoplay = true;
    createMockAudioConstructor(() => {
      if (shouldBlockAutoplay) {
        const autoplayBlockedError = new Error(
          'Autoplay blocked by browser policy',
        );
        autoplayBlockedError.name = 'NotAllowedError';
        return Promise.reject(autoplayBlockedError);
      }
      return Promise.resolve();
    });

    render(<AudioAlertManager />);

    // Initially no banner is shown before a blocked playback attempt
    expect(screen.queryByTestId('autoplay-unlock-banner')).toBeNull();

    // Dispatch incoming new order event while autoplay is blocked
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(STAFF_NEW_ORDER_EVENT, {
          detail: {
            orderId: 'order-autoplay-1',
            orderNumber: 1099,
            roomNumber: '305',
          },
        }),
      );
    });

    const unlockBanner = await screen.findByTestId('autoplay-unlock-banner');
    expect(unlockBanner.textContent).toContain(AUTOPLAY_UNLOCK_BANNER_MESSAGE);

    // Clicking the unlock banner button unlocks audio and hides the banner
    shouldBlockAutoplay = false;
    fireEvent.click(screen.getByTestId('autoplay-unlock-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('autoplay-unlock-banner')).toBeNull();
    });
  });

  it('flashes new order card with animate-pulse-border for 5 seconds on NEW_ORDER_RECEIVED', () => {
    vi.useFakeTimers();
    createMockAudioConstructor(() => Promise.resolve());

    const incomingOrder = order({
      id: 'order-flash-501',
      number: 1105,
      roomNumber: '501',
      status: 'PENDING',
    });

    render(
      <>
        <AudioAlertManager />
        <OrderCard order={incomingOrder} />
      </>,
    );

    const renderedCard = screen.getByTestId('order-card-order-flash-501');
    expect(renderedCard.getAttribute('data-flashing')).toBe('false');
    expect(renderedCard.className).not.toContain('animate-pulse-border');

    act(() => {
      window.dispatchEvent(
        new CustomEvent(STAFF_NEW_ORDER_EVENT, {
          detail: {
            orderId: 'order-flash-501',
            orderNumber: 1105,
            roomNumber: '501',
          },
        }),
      );
    });

    expect(renderedCard.getAttribute('data-flashing')).toBe('true');
    expect(renderedCard.className).toContain('animate-pulse-border');

    // Still flashing at 4.9 seconds
    act(() => {
      vi.advanceTimersByTime(NEW_ORDER_FLASH_DURATION_MS - 100);
    });
    expect(renderedCard.getAttribute('data-flashing')).toBe('true');

    // Stops flashing after 5.0 seconds
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(renderedCard.getAttribute('data-flashing')).toBe('false');
    expect(renderedCard.className).not.toContain('animate-pulse-border');
  });

  it('plays audible chime and flashes new order card in New Orders column when NEW_ORDER_RECEIVED arrives over WebSocket', async () => {
    const { createdAudioInstances } = createMockAudioConstructor(() =>
      Promise.resolve(),
    );

    let currentOrders = [order()];
    fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /orders': () => currentOrders,
    });
    session.store({ accessToken: 'expired', refreshToken: 'refresh-1' });

    renderDashboard('/orders');

    await screen.findByRole('article', { name: /Room 214/ });
    await waitFor(() => expect(FakeSocket.instances.length).toBeGreaterThan(0));

    currentOrders = [
      ...currentOrders,
      order({
        id: 'order-live-408',
        number: 1048,
        roomNumber: '408',
        roomId: 'room-408',
        stayId: 'stay-408',
        status: 'PENDING',
      }),
    ];

    await act(async () => {
      FakeSocket.latest().push({
        type: 'NEW_ORDER_RECEIVED',
        payload: {
          orderId: 'order-live-408',
          orderNumber: 1048,
          roomNumber: '408',
          totalAmount: 14500,
          itemsSummary: 'Jollof rice and grilled prawns',
          createdAt: new Date().toISOString(),
        },
      });
    });

    const newOrdersColumn = await screen.findByRole('region', {
      name: 'Pending',
    });
    const newOrderCard = await within(newOrdersColumn).findByRole('article', {
      name: 'Room 408, order A-1048',
    });

    expect(newOrderCard.getAttribute('data-flashing')).toBe('true');
    expect(newOrderCard.className).toContain('animate-pulse-border');
    expect(createdAudioInstances.length).toBeGreaterThanOrEqual(1);
    expect(createdAudioInstances[0]?.play).toHaveBeenCalled();
  });
});
