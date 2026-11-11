import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { session } from '../src/lib/session';
import { resetSoundAlertState } from '../src/lib/sound';
import { FakeSocket } from './support';

configure({ asyncUtilTimeout: 10000 });

beforeEach(() => {
  session.clear();
  window.sessionStorage.clear();
  window.localStorage.clear();
  resetSoundAlertState();
  FakeSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeSocket);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
