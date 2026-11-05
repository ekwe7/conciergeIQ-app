/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API, including `/api/v1`. Defaults to the dev proxy. */
  readonly VITE_API_BASE_URL?: string;
  /** Staff WebSocket URL. Defaults to `/ws/staff` on the current host. */
  readonly VITE_REALTIME_URL?: string;
}
