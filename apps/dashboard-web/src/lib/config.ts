/** Public runtime configuration. Nothing here is secret: Vite inlines it into the bundle. */
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  realtimeUrl: import.meta.env.VITE_REALTIME_URL || defaultRealtimeUrl(),
};

function defaultRealtimeUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:3000/ws/staff';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/staff`;
}

/** Turns an API path such as a logo URL (`/api/v1/hotels/…/logo`) into a URL the browser can load. */
export function apiAssetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  if (/^https?:\/\//.test(config.apiBaseUrl)) return new URL(path, config.apiBaseUrl).toString();
  return path;
}
