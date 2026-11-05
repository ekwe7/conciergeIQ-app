import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { session } from '../src/lib/session';
import { FakeSocket } from './support';

beforeEach(() => {
  session.clear();
  window.sessionStorage.clear();
  window.localStorage.clear();
  FakeSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeSocket);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
