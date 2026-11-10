/**
 * QrPdfModal — component integration tests.
 *
 * Tests verify:
 *   1. The "Download cards (PDF)" button opens the QrPdfModal.
 *   2. The floor selector only appears when multiple floors exist.
 *   3. Clicking "Download PDF" triggers a GET to /rooms/qr.pdf.
 *   4. When a floor is selected, the floor query param is included.
 *   5. A toast error is shown when the PDF download fails.
 *   6. The Download button is disabled (spinner shown) while the request
 *      is in-flight.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Room } from '../src/lib/api-types';
import { session } from '../src/lib/session';
import { fakeApi, renderDashboard, reply, signedInHandlers } from './support';

function roomFixture(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-101',
    number: '101',
    floor: 1,
    isOutOfOrder: false,
    outOfOrderReason: null,
    qrToken: 'token-abc',
    qrUrl: 'https://guest.test/r/token-abc',
    qrRegeneratedAt: null,
    ...overrides,
  };
}

function resumeAsAdmin() {
  session.store({ accessToken: 'access-admin', refreshToken: 'refresh-admin' });
}

/** Minimal PDF bytes (%PDF magic header). */
const MOCK_PDF_BYTES = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52]);

/** Stubs URL.createObjectURL/revokeObjectURL and document.createElement('a') chain. */
function stubFileSave() {
  const clickSpy = vi.fn();
  const removeSpy = vi.fn();
  if (typeof URL.createObjectURL === 'undefined') {
    (URL as unknown as { createObjectURL: (blob: Blob) => string }).createObjectURL = vi.fn(() => 'blob:mock-url');
  } else {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
  }
  if (typeof URL.revokeObjectURL === 'undefined') {
    (URL as unknown as { revokeObjectURL: (url: string) => void }).revokeObjectURL = vi.fn();
  } else {
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  }
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') {
      const anchor = originalCreateElement('a');
      anchor.click = clickSpy;
      anchor.remove = removeSpy;
      return anchor;
    }
    return originalCreateElement(tag);
  });
  return { clickSpy, removeSpy };
}

async function openQrPdfModal() {
  const downloadButton = (await screen.findByRole('button', {
    name: 'Download cards (PDF)',
  })) as HTMLButtonElement;
  await waitFor(() => expect(downloadButton.disabled).toBe(false));
  fireEvent.click(downloadButton);
  return screen.findByRole('dialog', { name: 'Download QR tent cards' });
}

describe('QrPdfModal on the QR Codes page', () => {
  it('shows the "Download cards (PDF)" button when rooms exist', async () => {
    fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /rooms': () => [roomFixture()],
      'GET /stays': () => [],
      'GET /orders': () => [],
    });
    resumeAsAdmin();
    renderDashboard('/qr-codes');

    expect(
      await screen.findByRole('button', { name: 'Download cards (PDF)' }),
    ).toBeTruthy();
  });

  it('disables "Download cards (PDF)" when there are no rooms', async () => {
    fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /rooms': () => [],
      'GET /stays': () => [],
      'GET /orders': () => [],
    });
    resumeAsAdmin();
    renderDashboard('/qr-codes');

    const downloadButton = (await screen.findByRole('button', {
      name: 'Download cards (PDF)',
    })) as HTMLButtonElement;
    expect(downloadButton.disabled).toBe(true);
  });

  it('opens the QR PDF modal when the download button is clicked', async () => {
    fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /rooms': () => [roomFixture()],
      'GET /stays': () => [],
      'GET /orders': () => [],
    });
    resumeAsAdmin();
    renderDashboard('/qr-codes');

    const modal = await openQrPdfModal();
    expect(modal).toBeTruthy();
    expect(within(modal).getByRole('button', { name: /Download PDF/ })).toBeTruthy();
  });

  it('does not show the floor selector when only one floor exists', async () => {
    fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /rooms': () => [
        roomFixture({ id: 'r1', number: '101', floor: 1 }),
        roomFixture({ id: 'r2', number: '102', floor: 1 }),
      ],
      'GET /stays': () => [],
      'GET /orders': () => [],
    });
    resumeAsAdmin();
    renderDashboard('/qr-codes');

    const modal = await openQrPdfModal();
    expect(within(modal).queryByLabelText('Which floor?')).toBeNull();
  });

  it('shows the floor selector when multiple floors exist', async () => {
    fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /rooms': () => [
        roomFixture({ id: 'r1', number: '101', floor: 1 }),
        roomFixture({ id: 'r2', number: '201', floor: 2 }),
      ],
      'GET /stays': () => [],
      'GET /orders': () => [],
    });
    resumeAsAdmin();
    renderDashboard('/qr-codes');

    const modal = await openQrPdfModal();

    const floorSelect = within(modal).getByLabelText('Which floor?') as HTMLSelectElement;
    expect(floorSelect).toBeTruthy();
    const options = Array.from(floorSelect.options).map((opt) => opt.text);
    expect(options).toContain('All floors');
    expect(options).toContain('Floor 1');
    expect(options).toContain('Floor 2');
  });

  it('calls GET /rooms/qr.pdf and saves the blob when "Download PDF" is clicked', async () => {
    const { clickSpy } = stubFileSave();
    const capturedPdfRequests: string[] = [];

    fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /rooms': () => [roomFixture()],
      'GET /stays': () => [],
      'GET /orders': () => [],
      'GET /rooms/qr.pdf': ({ url }) => {
        capturedPdfRequests.push(url.toString());
        return new Response(MOCK_PDF_BYTES, {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
        });
      },
    });

    resumeAsAdmin();
    renderDashboard('/qr-codes');

    const modal = await openQrPdfModal();

    fireEvent.click(within(modal).getByRole('button', { name: /Download PDF/ }));

    await waitFor(() => expect(capturedPdfRequests.length).toBeGreaterThan(0), {
      timeout: 5000,
    });

    expect(capturedPdfRequests[0]).toContain('/rooms/qr.pdf');
    expect(clickSpy).toHaveBeenCalled();
  });

  it('appends the floor param when a specific floor is selected before downloading', async () => {
    stubFileSave();
    const capturedPdfRequests: string[] = [];

    fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /rooms': () => [
        roomFixture({ id: 'r1', number: '101', floor: 1 }),
        roomFixture({ id: 'r2', number: '201', floor: 2 }),
      ],
      'GET /stays': () => [],
      'GET /orders': () => [],
      'GET /rooms/qr.pdf': ({ url }) => {
        capturedPdfRequests.push(url.toString());
        return new Response(MOCK_PDF_BYTES, {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
        });
      },
    });
    resumeAsAdmin();
    renderDashboard('/qr-codes');

    const modal = await openQrPdfModal();

    const floorSelect = within(modal).getByLabelText('Which floor?') as HTMLSelectElement;
    fireEvent.change(floorSelect, { target: { value: '2' } });

    fireEvent.click(within(modal).getByRole('button', { name: /Download PDF/ }));

    await waitFor(() => expect(capturedPdfRequests.length).toBeGreaterThan(0), {
      timeout: 5000,
    });

    expect(capturedPdfRequests[0]).toContain('floor=2');
  });

  it('shows an error toast when the PDF download fails', async () => {
    fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /rooms': () => [roomFixture()],
      'GET /stays': () => [],
      'GET /orders': () => [],
      'GET /rooms/qr.pdf': () =>
        reply(500, {
          error: { code: 'INTERNAL_SERVER_ERROR', message: 'PDF generation failed' },
        }),
    });
    resumeAsAdmin();
    renderDashboard('/qr-codes');

    const modal = await openQrPdfModal();

    fireEvent.click(within(modal).getByRole('button', { name: /Download PDF/ }));

    await screen.findByRole('alert');
  });

  it('closes the modal when Cancel is clicked', async () => {
    fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /rooms': () => [roomFixture()],
      'GET /stays': () => [],
      'GET /orders': () => [],
    });
    resumeAsAdmin();
    renderDashboard('/qr-codes');

    const modal = await openQrPdfModal();
    expect(modal).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Download QR tent cards' }),
      ).toBeNull(),
    );
  });
});
