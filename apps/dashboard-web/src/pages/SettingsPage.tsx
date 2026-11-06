import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { Field, FormError, Input, Select } from '../components/ui/Field';
import { ErrorState, LoadingRows, PageHeader, Panel } from '../components/ui/Page';
import { useToast } from '../components/ui/Toast';
import { useCurrentUser } from '../features/auth/AuthProvider';
import { useHotel } from '../features/hotel/useHotel';
import { BrandingPanel } from '../features/settings/BrandingPanel';
import { api } from '../lib/api-client';
import type { Hotel } from '../lib/api-types';
import { describeError } from '../lib/error-handler';
import { queryKeys } from '../lib/query-keys';

const CURRENCIES = ['NGN', 'GHS', 'KES', 'ZAR', 'USD', 'EUR', 'GBP'];

function timeZones(current: string): string[] {
  let zones: string[] = [];
  try {
    zones = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];
  } catch {
    zones = [];
  }
  return zones.includes(current) ? zones : [current, ...zones];
}

export function SettingsPage() {
  const { hotelId } = useCurrentUser();
  const hotel = useHotel();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState('');
  const [currency, setCurrency] = useState('');

  useEffect(() => {
    if (!hotel.data) return;
    setName(hotel.data.name);
    setAddress(hotel.data.address);
    setTimezone(hotel.data.timezone);
    setCurrency(hotel.data.currency);
  }, [hotel.data]);

  const save = useMutation({
    mutationFn: (change: Partial<Omit<Hotel, 'id'>>) => api.patch<Hotel>('/hotel', change),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.hotel(hotelId), updated);
      toast.show('Hotel settings saved');
    },
  });

  const zones = useMemo(() => timeZones(timezone || 'Africa/Lagos'), [timezone]);
  const dirty =
    hotel.data &&
    (name !== hotel.data.name || address !== hotel.data.address || timezone !== hotel.data.timezone || currency !== hotel.data.currency);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    save.mutate({ name: name.trim(), address: address.trim(), timezone, currency });
  }

  return (
    <>
      <PageHeader title="Hotel settings" description="How the hotel appears to guests and how times and prices are shown." />
      <Panel className="mb-6 max-w-2xl">
        {hotel.isPending && <LoadingRows rows={4} />}
        {hotel.error && <ErrorState message={describeError(hotel.error)} onRetry={() => void hotel.refetch()} />}
        {hotel.data && (
          <form onSubmit={submit} className="space-y-5 p-5">
            <Field label="Hotel name" hint="Shown to guests when they scan a room’s QR code.">
              <Input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Address" optional>
              <Input value={address} maxLength={255} onChange={(event) => setAddress(event.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Time zone" hint="Used for “today” and every time shown.">
                <Select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                  {zones.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone.replace(/_/g, ' ')}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Currency" hint="Changing it does not convert existing prices.">
                <Select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                  {(CURRENCIES.includes(currency) ? CURRENCIES : [currency, ...CURRENCIES]).map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <FormError>{save.error ? describeError(save.error) : null}</FormError>
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button
                disabled={!dirty || save.isPending}
                onClick={() => {
                  if (!hotel.data) return;
                  setName(hotel.data.name);
                  setAddress(hotel.data.address);
                  setTimezone(hotel.data.timezone);
                  setCurrency(hotel.data.currency);
                }}
              >
                Discard changes
              </Button>
              <Button variant="primary" type="submit" pending={save.isPending} disabled={!dirty || !name.trim()}>
                Save
              </Button>
            </div>
          </form>
        )}
      </Panel>
      <BrandingPanel />
    </>
  );
}
