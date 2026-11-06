import React from 'react';
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import {
  GuestServiceRequestCreateSchema,
  GuestServiceRequestResponse,
  Value,
} from '@conciergeiq/contracts';
import { AmenitiesPage } from '../src/pages/AmenitiesPage';
import {
  saveGuestSession,
  clearGuestSession,
} from '../src/features/guest-session/session-store';
import { serviceRequestEndpointPattern } from '../src/features/room-requests/api/mockServiceRequestHandler';

const mockServiceServer = setupServer();

beforeAll(() => {
  mockServiceServer.listen({ onUnhandledRequest: 'bypass' });
});

afterEach(() => {
  mockServiceServer.resetHandlers();
  clearGuestSession();
  vi.restoreAllMocks();
});

afterAll(() => {
  mockServiceServer.close();
});

describe('AmenitiesPage Component Suite (UI: G06)', () => {
  const sampleSessionToken: string = 'token_guest_test_amenities_101';
  const sampleStayIdentifier: string = 'stay_amenities_test_402';
  const sampleRoomNumber: string = '101';

  beforeEach(() => {
    saveGuestSession({
      sessionToken: sampleSessionToken,
      sessionId: sampleStayIdentifier,
      hotelId: 'htl_lagos_grand',
      hotelName: 'Lagos Grand Hotel',
      roomId: sampleRoomNumber,
      roomNumber: sampleRoomNumber,
      stayId: sampleStayIdentifier,
      guestName: 'Ada Lovelace',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    });
  });

  function renderAmenitiesScreen(customProperties = {}) {
    return render(
      <MemoryRouter initialEntries={['/amenities']}>
        <Routes>
          <Route
            path="/amenities"
            element={<AmenitiesPage roomNumberOverride={sampleRoomNumber} {...customProperties} />}
          />
          <Route
            path="/menu"
            element={<div>In-Room Menu Screen</div>}
          />
        </Routes>
      </MemoryRouter>
    );
  }

  describe('UI Layout & Catalog Rendering (G06 Prototype Fidelity)', () => {
    it('renders header, room pill badge, and reassurance subtitle', () => {
      renderAmenitiesScreen();

      expect(screen.getByRole('heading', { level: 1, name: 'Amenities' })).toBeInTheDocument();
      expect(screen.getByText(`Room ${sampleRoomNumber}`)).toBeInTheDocument();
      expect(
        screen.getByText('Free of charge. Housekeeping usually responds within 15 minutes.')
      ).toBeInTheDocument();
    });

    it('renders all 8 canonical amenity cards matching prototype G06', () => {
      renderAmenitiesScreen();

      const expectedAmenityTitles: string[] = [
        'Extra towels',
        'Toiletries',
        'Extra pillow',
        'Room cleaning',
        'Ice bucket',
        'Phone charger',
        'Iron & board',
        'Do not disturb',
      ];

      expectedAmenityTitles.forEach((expectedTitle) => {
        expect(
          screen.getByRole('heading', { level: 3, name: expectedTitle })
        ).toBeInTheDocument();
      });
    });

    it('renders the free-text special instructions input and dependency status badge', () => {
      renderAmenitiesScreen();

      expect(screen.getByLabelText('Anything else?')).toBeInTheDocument();
      expect(
        screen.getByText(/Mock Fallback Active \(Backend Ticket: CIQ-BACKEND-BLOCKED-SERVICE-REQUESTS\)/i)
      ).toBeInTheDocument();
    });
  });

  describe('Interactive Item Selection & Stepper Counter Behavior', () => {
    it('disables request button initially when no items are selected', () => {
      renderAmenitiesScreen();

      const requestButton = screen.getByRole('button', {
        name: /Select items to request/i,
      });
      expect(requestButton).toBeDisabled();
    });

    it('selects an amenity tile on click and updates footer button label to "Request 1 item"', () => {
      renderAmenitiesScreen();

      const extraTowelsCard = screen.getByRole('button', {
        name: /Extra towels, currently 0 selected/i,
      });

      fireEvent.click(extraTowelsCard);

      expect(
        screen.getByRole('button', { name: /Request 1 item/i })
      ).toBeEnabled();
    });

    it('increments and decrements amenity quantity via stepper controls', () => {
      renderAmenitiesScreen();

      // Click to select Extra towels (quantity becomes 1)
      const extraTowelsCard = screen.getByRole('button', {
        name: /Extra towels, currently 0 selected/i,
      });
      fireEvent.click(extraTowelsCard);

      expect(screen.getByRole('button', { name: /Request 1 item/i })).toBeInTheDocument();

      // Increment to 2
      const increaseTowelsButton = screen.getByRole('button', {
        name: 'Increase quantity of Extra towels',
      });
      fireEvent.click(increaseTowelsButton);

      expect(
        screen.getByRole('button', { name: /Request 2 items/i })
      ).toBeInTheDocument();

      // Decrement back to 1
      const decreaseTowelsButton = screen.getByRole('button', {
        name: 'Decrease quantity of Extra towels',
      });
      fireEvent.click(decreaseTowelsButton);

      expect(
        screen.getByRole('button', { name: /Request 1 item/i })
      ).toBeInTheDocument();
    });

    it('supports selecting multiple distinct amenities simultaneously', () => {
      renderAmenitiesScreen();

      // Select Extra towels (1)
      fireEvent.click(
        screen.getByRole('button', { name: /Extra towels, currently 0 selected/i })
      );

      // Increment towels to 2
      fireEvent.click(
        screen.getByRole('button', { name: 'Increase quantity of Extra towels' })
      );

      // Select Toiletries (1)
      fireEvent.click(
        screen.getByRole('button', { name: /Toiletries, currently 0 selected/i })
      );

      // Total count should now be 3 items
      expect(
        screen.getByRole('button', { name: /Request 3 items/i })
      ).toBeEnabled();
    });
  });

  describe('Backend Blocker Resilience & Mock Fallback Execution', () => {
    it('catches HTTP 404 from backend gracefully, logs dependency notice, and activates mock 201 fallback', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Simulate Fastify backend returning 404 Not Found because route is not registered
      mockServiceServer.use(
        http.post(serviceRequestEndpointPattern, () => {
          return HttpResponse.json(
            {
              type: 'https://conciergeiq.com/errors/not-found',
              title: 'Not Found',
              status: 404,
              detail: 'Route POST /api/v1/guest/service-requests not implemented by backend API.',
            },
            { status: 404 }
          );
        })
      );

      renderAmenitiesScreen();

      // Select 2 Extra towels
      fireEvent.click(
        screen.getByRole('button', { name: /Extra towels, currently 0 selected/i })
      );
      fireEvent.click(
        screen.getByRole('button', { name: 'Increase quantity of Extra towels' })
      );

      // Enter special instructions
      const specialInstructionsTextarea = screen.getByLabelText('Anything else?');
      fireEvent.change(specialInstructionsTextarea, {
        target: { value: 'Please leave outside room door' },
      });

      // Submit request
      const submitRequestButton = screen.getByRole('button', {
        name: /Request 2 items/i,
      });
      fireEvent.click(submitRequestButton);

      // Verify confirmation view rendered
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'Request Received' })).toBeInTheDocument();
      });

      // Verify estimated delivery time
      expect(
        screen.getByText(/Estimated delivery: within 15 minutes/i)
      ).toBeInTheDocument();

      // Verify requested item summary
      expect(screen.getByText('Extra towels')).toBeInTheDocument();
      expect(screen.getByText('× 2')).toBeInTheDocument();

      // Verify offline mock response banner
      expect(
        screen.getByText(/Offline Mock Response:/i)
      ).toBeInTheDocument();

      // Verify formal dependency notice was logged to console
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CIQ Backend Dependency Notice]')
      );
    });

    it('submits valid payload conforming strictly to GuestServiceRequestCreateSchema when backend returns 201', async () => {
      let interceptedRequestBody: unknown = null;

      mockServiceServer.use(
        http.post(serviceRequestEndpointPattern, async ({ request }) => {
          interceptedRequestBody = await request.json();
          const mockSuccessfulResponse: GuestServiceRequestResponse = {
            requestId: 'srv_live_5501',
            status: 'RECEIVED',
            estimatedDeliveryMinutes: 12,
            roomNumber: sampleRoomNumber,
            items: [
              {
                itemId: 'amenity_extra_pillow',
                name: 'Extra pillow',
                quantity: 1,
              },
            ],
            createdAt: new Date().toISOString(),
          };
          return HttpResponse.json(mockSuccessfulResponse, { status: 201 });
        })
      );

      renderAmenitiesScreen();

      // Select Extra pillow
      fireEvent.click(
        screen.getByRole('button', { name: /Extra pillow, currently 0 selected/i })
      );

      // Submit request
      fireEvent.click(
        screen.getByRole('button', { name: /Request 1 item/i })
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'Request Received' })).toBeInTheDocument();
      });

      // Verify the intercepted payload strictly adheres to GuestServiceRequestCreateSchema
      expect(interceptedRequestBody).not.toBeNull();
      const isPayloadValid = Value.Check(
        GuestServiceRequestCreateSchema,
        interceptedRequestBody
      );
      expect(isPayloadValid).toBe(true);
    });

    it('allows resetting confirmation view to request additional amenities', async () => {
      mockServiceServer.use(
        http.post(serviceRequestEndpointPattern, async () => {
          return HttpResponse.json(
            {
              requestId: 'srv_live_9921',
              status: 'RECEIVED',
              estimatedDeliveryMinutes: 15,
              roomNumber: sampleRoomNumber,
              items: [],
              createdAt: new Date().toISOString(),
            },
            { status: 201 }
          );
        })
      );

      renderAmenitiesScreen();

      fireEvent.click(
        screen.getByRole('button', { name: /Ice bucket, currently 0 selected/i })
      );

      fireEvent.click(screen.getByRole('button', { name: /Request 1 item/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'Request Received' })).toBeInTheDocument();
      });

      // Click "Ask for Something Else"
      const askForSomethingElseButton = screen.getByRole('button', {
        name: /Ask for Something Else/i,
      });
      fireEvent.click(askForSomethingElseButton);

      // Should return to the main amenities selection screen
      expect(screen.getByRole('heading', { level: 1, name: 'Amenities' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Select items to request/i })).toBeDisabled();
    });

    it('navigates back to in-room menu when back button is clicked', () => {
      const handleBackNavigationCallback = vi.fn();

      renderAmenitiesScreen({
        onBackToMenu: handleBackNavigationCallback,
      });

      const backButton = screen.getByRole('button', {
        name: 'Back to In-Room Menu',
      });
      fireEvent.click(backButton);

      expect(handleBackNavigationCallback).toHaveBeenCalledTimes(1);
    });
  });
});
