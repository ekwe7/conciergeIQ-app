import React from 'react';
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WelcomePage } from '../src/pages/WelcomePage';
import {
  GUEST_SESSION_STORAGE_KEY,
  clearGuestSession,
} from '../src/features/guest-session/session-store';

const sessionResolutionEndpointPattern = new RegExp('/api/v1/guest/sessions$');

const mockServer = setupServer();

beforeAll(() => {
  mockServer.listen({ onUnhandledRequest: 'bypass' });
});

afterEach(() => {
  mockServer.resetHandlers();
  clearGuestSession();
  vi.restoreAllMocks();
});

afterAll(() => {
  mockServer.close();
});

function createIsolatedTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface RenderWelcomePageOptions {
  initialEntries?: string[];
}

function renderWelcomePageWithProviders(options: RenderWelcomePageOptions = {}) {
  const queryClient = createIsolatedTestQueryClient();
  const initialEntries = options.initialEntries ?? ['/'];

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/menu" element={<div data-testid="mock-menu-page">Menu Catalog</div>} />
          <Route path="/orders" element={<div data-testid="mock-orders-page">Order History</div>} />
          <Route path="/bill" element={<div data-testid="mock-bill-page">Folio Bill</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Guest Welcome Page & QR Token Resolution Suite', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.pushState({}, 'Home', '/');
  });

  it('resolves valid QR token, persists session to sessionStorage, and renders welcome screen', async () => {
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    window.history.pushState({}, 'Scan', '/?token=valid_room_token_99');

    let handlerCalled = false;
    mockServer.use(
      http.post(sessionResolutionEndpointPattern, async () => {
        handlerCalled = true;

        return HttpResponse.json({
          session: {
            token: 'jwt_resolved_token_8899',
            roomNumber: '101',
            stayId: 'stay_101',
            hotelId: 'htl_azure_bay',
            hotelName: 'Azure Bay Hotel',
            guestName: 'Chioma Adebayo',
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
          },
        });
      })
    );

    renderWelcomePageWithProviders({
      initialEntries: ['/?token=valid_room_token_99'],
    });

    await waitFor(() => {
      expect(handlerCalled).toBe(true);
    });

    // Wait for resolution and verify hotel name and room number render
    await waitFor(() => {
      expect(screen.getByText(/Azure Bay Hotel/i)).toBeDefined();
      expect(screen.getByText(/welcome to Room 101/i)).toBeDefined();
    });

    expect(screen.getByText(/Chioma Adebayo/i)).toBeDefined();

    // Verify raw QR token was purged from browser URL
    expect(replaceStateSpy).toHaveBeenCalled();

    // Verify session was persisted in sessionStorage
    const storedSessionRaw = window.sessionStorage.getItem(GUEST_SESSION_STORAGE_KEY);
    expect(storedSessionRaw).not.toBeNull();
    const parsedStoredSession = JSON.parse(storedSessionRaw as string);
    expect(parsedStoredSession.sessionToken).toBe('jwt_resolved_token_8899');
    expect(parsedStoredSession.roomNumber).toBe('101');
  });

  it('displays stay inactive guidance screen when server rejects checked-out token with 403', async () => {
    window.history.pushState({}, 'Scan', '/?token=checked_out_token_44');

    mockServer.use(
      http.post(sessionResolutionEndpointPattern, () => {
        return HttpResponse.json(
          {
            statusCode: 403,
            error: 'Forbidden',
            code: 'FORBIDDEN',
            message: 'Stay has checked out or room is currently inactive.',
          },
          { status: 403 }
        );
      })
    );

    renderWelcomePageWithProviders({
      initialEntries: ['/?token=checked_out_token_44'],
    });

    await waitFor(() => {
      expect(screen.getByTestId('guest-stay-inactive-view')).toBeDefined();
      expect(screen.getByText('Stay Checked Out / Inactive')).toBeDefined();
    });

    expect(
      screen.getByText(/Stay has checked out or room is currently inactive/i)
    ).toBeDefined();
    expect(screen.getByText(/Room Verification Help/i)).toBeDefined();
  });

  it('renders prototype G01 quick action cards and navigates on click', async () => {
    renderWelcomePageWithProviders({
      initialEntries: ['/'],
    });

    // Verify G01 prototype actions
    expect(screen.getByText('Room Service')).toBeDefined();
    expect(screen.getByText('Amenities')).toBeDefined();
    expect(screen.getByText('My Orders')).toBeDefined();
    expect(screen.getByText('Folio & Bills')).toBeDefined();

    // Click Browse In-Room Dining Menu primary action
    const browseMenuButton = screen.getByText('Browse In-Room Dining Menu');
    fireEvent.click(browseMenuButton);

    await waitFor(() => {
      expect(screen.getByTestId('mock-menu-page')).toBeDefined();
    });
  });
});
