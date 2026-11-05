/**
 * A short two-note chime for new orders, synthesised so there is no audio file
 * to ship. Browsers only allow audio after the user has interacted with the
 * page, so the context is created lazily and resumed on the next click.
 */
let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return null;
  context ??= new window.AudioContext();
  return context;
}

/** Call from a click handler (e.g. turning sound on) so later chimes are allowed. */
export function unlockSound(): void {
  void audioContext()?.resume();
}

export function playNewOrderChime(): void {
  const ctx = audioContext();
  if (!ctx || ctx.state !== 'running') return;

  const start = ctx.currentTime;
  [659.25, 880].forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const at = start + index * 0.18;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.18, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.55);
  });
}
