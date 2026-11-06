import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EscalationRules, MenuCategory } from '../src/lib/api-types';
import { contrastRatio } from '../src/lib/contrast';
import { session } from '../src/lib/session';
import { FakeSocket, fakeApi, order, renderDashboard, reply, signedInHandlers } from './support';

const resume = () => session.store({ accessToken: 'expired', refreshToken: 'refresh-1' });

const RULES: EscalationRules = {
  manager: { enabled: false, afterSeconds: 120, channel: 'SMS', recipientName: '', phone: '' },
  admin: { enabled: false, afterSeconds: 300, channel: 'SMS', recipientName: '', phone: '' },
  updatedAt: null,
};

describe('escalations', () => {
  it('lets the admin turn on the manager alert and reports a refused number', async () => {
    let saved = RULES;
    const api = fakeApi({
      ...signedInHandlers('ADMIN'),
      'GET /orders': () => [],
      'GET /escalations/rules': () => saved,
      'GET /escalations/alerts': () => [],
      'PUT /escalations/rules': ({ body }) => {
        const next = body as EscalationRules;
        if (next.manager.phone === '12') return reply(400, { error: { code: 'VALIDATION_FAILED', message: 'The manager phone number is not valid. Use +234… or 080…' } });
        saved = { ...next, updatedAt: '2026-11-05T10:00:00Z' };
        return saved;
      },
    });
    resume();
    renderDashboard('/escalations');

    const first = await screen.findByRole('group', { name: /First alert/ });
    fireEvent.click(within(first).getByRole('switch', { name: 'First alert on' }));
    fireEvent.change(within(first).getByLabelText('Name'), { target: { value: 'Kemi Idowu' } });
    fireEvent.change(within(first).getByLabelText('Phone'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save rules' }));
    expect(await screen.findByText(/phone number is not valid/)).toBeTruthy();

    fireEvent.change(within(first).getByLabelText('Phone'), { target: { value: '08031234412' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save rules' }));
    await screen.findByText('Escalation rules saved');

    const put = api.calls.filter((call) => call.method === 'PUT').at(-1)!;
    expect(put.body).toEqual({
      manager: { enabled: true, afterSeconds: 120, channel: 'SMS', recipientName: 'Kemi Idowu', phone: '08031234412' },
      admin: RULES.admin,
    });
  });

  it('shows managers the history but not the phone numbers', async () => {
    fakeApi({
      ...signedInHandlers('MANAGER'),
      'GET /orders': () => [],
      'GET /escalations/alerts': () => [
        {
          id: 'e1', orderId: 'o1', orderNumber: 1046, roomNumber: '318', level: 1, channel: 'WHATSAPP',
          recipientName: 'Kemi Idowu', status: 'SENT', error: null, sentAt: '2026-11-05T09:02:00Z',
          acceptedAfterSeconds: 160, orderStatus: 'IN_PROGRESS',
        },
      ],
    });
    resume();
    renderDashboard('/escalations');

    expect(await screen.findByText('Room 318')).toBeTruthy();
    expect(screen.getByText('Accepted after 2 min 40 s')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Escalation ladder' })).toBeNull();
  });

  it('tells every staff screen when someone is texted', async () => {
    fakeApi({ ...signedInHandlers('STAFF'), 'GET /orders': () => [order()] });
    resume();
    renderDashboard('/orders');
    await screen.findByRole('article', { name: /Room 214/ });
    await waitFor(() => expect(FakeSocket.instances.length).toBe(1));

    act(() =>
      FakeSocket.latest().push({
        type: 'ORDER_ESCALATED',
        payload: { orderId: 'order-1', orderNumber: 1047, roomNumber: '214', level: 1, recipientName: 'Kemi Idowu', waitedSeconds: 120 },
      }),
    );

    expect(await screen.findByText('Room 214 has waited 2 min. Kemi Idowu (manager) was texted.')).toBeTruthy();
  });
});

describe('concierge answers', () => {
  it('lets a manager write an article for the AI concierge', async () => {
    let articles: unknown[] = [];
    const api = fakeApi({
      ...signedInHandlers('MANAGER'),
      'GET /orders': () => [],
      'GET /concierge/articles': () => ({ enabled: false, articles }),
      'POST /concierge/articles': ({ body }) => {
        const article = { id: 'a1', ...(body as object), updatedAt: '2026-11-05T10:00:00Z', updatedBy: 'Kemi Idowu' };
        articles = [article];
        return reply(201, article);
      },
    });
    resume();
    renderDashboard('/concierge');

    expect(await screen.findByText(/switched off on the server/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Write the first article' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add article' });
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Wi-Fi' } });
    fireEvent.change(within(dialog).getByLabelText('Answer'), { target: { value: 'AzureBay-Guest, password sunrise2026.' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Wi-Fi saved')).toBeTruthy();
    expect(api.calls.find((call) => call.method === 'POST' && call.path === '/concierge/articles')?.body).toEqual({
      title: 'Wi-Fi',
      body: 'AzureBay-Guest, password sunrise2026.',
      isPublished: true,
    });
  });
});

describe('menu: upsell, hours and translations', () => {
  const menu: MenuCategory[] = [
    {
      id: 'c1', name: 'Mains', sortOrder: 0, availableFrom: null, availableUntil: null, isOpenNow: true, translations: {},
      items: [
        { id: 'jollof', categoryId: 'c1', name: 'Jollof rice', description: null, price: 8500, photoUrl: null, isAvailable: true, isFeatured: false, pairsWith: [], translations: {} },
      ],
    },
    {
      id: 'c2', name: 'Breakfast', sortOrder: 1, availableFrom: '06:30', availableUntil: '11:00', isOpenNow: false, translations: {},
      items: [
        { id: 'chapman', categoryId: 'c2', name: 'Chapman', description: null, price: 2400, photoUrl: null, isAvailable: true, isFeatured: false, pairsWith: [], translations: {} },
      ],
    },
  ];

  it('features an item, suggests a drink and saves a French name', async () => {
    const api = fakeApi({
      ...signedInHandlers('MANAGER'),
      'GET /orders': () => [],
      'GET /menu': () => ({ categories: menu }),
      'GET /hotel/branding': () => ({
        hotelId: 'hotel-1', hotelName: 'Azure Bay Hotel', logoUrl: null, brandColor: '#1B2A3A', accentColor: '#B8862F',
        welcomeHeadline: { en: 'Welcome to Room {room}' }, languages: ['en', 'fr'],
      }),
      'PATCH /menu/items/jollof': ({ body }) => ({ ...menu[0]!.items[0], ...(body as object) }),
    });
    resume();
    renderDashboard('/menu');

    expect(await screen.findByText('1 item · Served 06:30–11:00 · not being served now')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Jollof rice' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Jollof rice' });
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Featured' }));
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /Chapman/ }));
    fireEvent.change(await within(dialog).findByLabelText('Name · French · Français'), { target: { value: 'Riz jollof' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await screen.findByText('Jollof rice updated');
    expect(api.calls.find((call) => call.method === 'PATCH')?.body).toEqual(
      expect.objectContaining({ isFeatured: true, pairsWith: ['chapman'], translations: { fr: { name: 'Riz jollof' } } }),
    );
  });
});

describe('branding', () => {
  it('flags brand colours white text cannot be read on', () => {
    expect(contrastRatio('#FFFFFF', '#1B2A3A')).toBeGreaterThan(4.5);
    expect(contrastRatio('#FFFFFF', '#F2C94C')).toBeLessThan(4.5);
  });
});
