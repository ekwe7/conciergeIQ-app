import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { Field, FormError, Input } from '../components/ui/Field';
import { EmptyState, ErrorState, LoadingRows, PageHeader, Panel, PanelHeader, table } from '../components/ui/Page';
import { Segmented } from '../components/ui/Segmented';
import { StatusLabel, Tag } from '../components/ui/Status';
import { Switch } from '../components/ui/Switch';
import { useToast } from '../components/ui/Toast';
import { cx } from '../components/ui/cx';
import { useAuth, useCurrentUser } from '../features/auth/AuthProvider';
import { useHotelLocale } from '../features/hotel/useHotel';
import { api, withQuery } from '../lib/api-client';
import type { EscalationAlert, EscalationChannel, EscalationRules, EscalationStep, TestAlertResult } from '../lib/api-types';
import { describeError } from '../lib/error-handler';
import { formatDateTime, formatDuration, formatOrderNumber } from '../lib/format';
import { Permission } from '../lib/permissions';
import { queryKeys } from '../lib/query-keys';

type StepKey = 'manager' | 'admin';

const STEP_LABEL: Record<StepKey, { title: string; role: string }> = {
  manager: { title: 'First alert', role: 'Manager on shift' },
  admin: { title: 'Second alert', role: 'Admin or owner' },
};

const CHANNEL_LABEL: Record<EscalationChannel, string> = { SMS: 'SMS', WHATSAPP: 'WhatsApp' };

export function EscalationsPage() {
  const { can } = useAuth();
  const canEdit = can(Permission.MANAGE_HOTEL_SETTINGS);

  return (
    <>
      <PageHeader
        title="Escalations"
        description="If nobody accepts an order in time, the manager and then the admin get a text, so no order waits unnoticed."
      />
      <div className={cx('grid gap-5', canEdit && 'xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]')}>
        {canEdit && <RulesPanel />}
        <HistoryPanel />
      </div>
    </>
  );
}

function RulesPanel() {
  const { hotelId } = useCurrentUser();
  const queryClient = useQueryClient();
  const toast = useToast();
  const rules = useQuery({
    queryKey: [...queryKeys.escalations(hotelId), 'rules'],
    queryFn: ({ signal }) => api.get<EscalationRules>('/escalations/rules', { signal }),
  });
  const [draft, setDraft] = useState<Record<StepKey, EscalationStep> | null>(null);

  useEffect(() => {
    if (rules.data) setDraft({ manager: rules.data.manager, admin: rules.data.admin });
  }, [rules.data]);

  const save = useMutation({
    mutationFn: (next: Record<StepKey, EscalationStep>) => api.put<EscalationRules>('/escalations/rules', next),
    onSuccess: (saved) => {
      queryClient.setQueryData([...queryKeys.escalations(hotelId), 'rules'], saved);
      toast.show('Escalation rules saved');
    },
  });

  const test = useMutation({
    mutationFn: (level: StepKey) => api.post<TestAlertResult>('/escalations/test', { level }),
    onSuccess: (result, level) =>
      result.status === 'SENT'
        ? toast.show(`Test alert sent to the ${STEP_LABEL[level].role.toLowerCase()}`)
        : toast.error(result.error ?? 'The test alert could not be sent'),
    onError: (error) => toast.error(describeError(error)),
  });

  if (rules.isPending || !draft) {
    return <Panel>{rules.error ? <ErrorState message={describeError(rules.error)} onRetry={() => void rules.refetch()} /> : <LoadingRows rows={4} />}</Panel>;
  }

  const update = (key: StepKey, change: Partial<EscalationStep>) => setDraft({ ...draft, [key]: { ...draft[key], ...change } });
  const dirty = JSON.stringify(draft) !== JSON.stringify({ manager: rules.data?.manager, admin: rules.data?.admin });
  const savedStep = (key: StepKey) => rules.data?.[key];

  function submit(event: FormEvent) {
    event.preventDefault();
    if (draft) save.mutate(draft);
  }

  return (
    <Panel>
      <PanelHeader title="Escalation ladder" description="Starts when an order is still pending." />
      <form onSubmit={submit} className="divide-y divide-line">
        <div className="flex gap-3 px-4 py-4">
          <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink-2" />
          <div>
            <p className="text-[13px] font-medium text-ink">Straight away: dashboard alert</p>
            <p className="text-xs text-ink-3">Sound and a notice on every signed-in staff screen.</p>
          </div>
        </div>

        {(['manager', 'admin'] as const).map((key) => {
          const step = draft[key];
          const saved = savedStep(key);
          const canTest = Boolean(saved?.phone && saved.recipientName) && !dirty;
          return (
            <fieldset key={key} aria-labelledby={`${key}-step`} className="space-y-4 px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <p id={`${key}-step`} className="text-[13px] font-medium text-ink">
                  {STEP_LABEL[key].title}: {STEP_LABEL[key].role}
                  <span className="block text-xs font-normal text-ink-3">
                    After {formatDuration(step.afterSeconds * 1000)} without being accepted.
                  </span>
                </p>
                <Switch checked={step.enabled} onChange={(enabled) => update(key, { enabled })} label={`${STEP_LABEL[key].title} on`} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <Input value={step.recipientName} maxLength={120} onChange={(event) => update(key, { recipientName: event.target.value })} />
                </Field>
                <Field label="Phone" hint="+234… or 080…">
                  <Input type="tel" value={step.phone} maxLength={20} onChange={(event) => update(key, { phone: event.target.value })} />
                </Field>
                <Field label="Wait before texting (minutes)">
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={Math.round(step.afterSeconds / 60)}
                    onChange={(event) => update(key, { afterSeconds: Math.min(60, Math.max(1, Number(event.target.value) || 1)) * 60 })}
                  />
                </Field>
                <div className="space-y-1.5">
                  <p className="text-[13px] font-medium text-ink">Send by</p>
                  <Segmented
                    label="Send by"
                    value={step.channel}
                    onChange={(channel) => update(key, { channel })}
                    options={(['SMS', 'WHATSAPP'] as const).map((value) => ({ value, label: CHANNEL_LABEL[value] }))}
                  />
                </div>
              </div>
              <Button size="sm" onClick={() => test.mutate(key)} pending={test.isPending && test.variables === key} disabled={!canTest}>
                Send test alert
              </Button>
              {!canTest && <p className="text-xs text-ink-3">Save a name and phone number to send a test.</p>}
            </fieldset>
          );
        })}

        <div className="space-y-3 px-4 py-4">
          <FormError>{save.error ? describeError(save.error) : null}</FormError>
          <div className="flex justify-end gap-2">
            <Button disabled={!dirty || save.isPending} onClick={() => rules.data && setDraft({ manager: rules.data.manager, admin: rules.data.admin })}>
              Discard changes
            </Button>
            <Button variant="primary" type="submit" pending={save.isPending} disabled={!dirty}>
              Save rules
            </Button>
          </div>
        </div>
      </form>
    </Panel>
  );
}

function HistoryPanel() {
  const { hotelId } = useCurrentUser();
  const { timeZone } = useHotelLocale();
  const alerts = useQuery({
    queryKey: [...queryKeys.escalations(hotelId), 'alerts'],
    queryFn: ({ signal }) => api.get<EscalationAlert[]>(withQuery('/escalations/alerts', { days: 7 }), { signal }),
  });

  return (
    <Panel>
      <PanelHeader title="Recent escalations" description="Last 7 days" />
      {alerts.isPending && <LoadingRows rows={4} />}
      {alerts.error && <ErrorState message={describeError(alerts.error)} onRetry={() => void alerts.refetch()} />}
      {alerts.data?.length === 0 && <EmptyState title="No escalations">Every order was accepted in time.</EmptyState>}
      {alerts.data && alerts.data.length > 0 && (
        <div className={table.wrap}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th}>Order</th>
                <th className={table.th}>Alerted</th>
                <th className={table.th}>Outcome</th>
              </tr>
            </thead>
            <tbody className={table.body}>
              {alerts.data.map((alert) => (
                <tr key={alert.id} className={table.row}>
                  <td className={table.td}>
                    <p className="font-medium text-ink">Room {alert.roomNumber}</p>
                    <p className="tabular text-xs text-ink-3">
                      {formatOrderNumber(alert.orderNumber)} · {formatDateTime(alert.sentAt, timeZone)}
                    </p>
                  </td>
                  <td className={table.td}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Tag emphasis={alert.level === 2}>Level {alert.level}</Tag>
                      <span>{alert.recipientName}</span>
                    </div>
                    {alert.status === 'FAILED' && <p className="mt-0.5 text-xs text-danger">Not sent: {alert.error}</p>}
                  </td>
                  <td className={table.td}>
                    {alert.acceptedAfterSeconds !== null ? (
                      <StatusLabel tone="done">Accepted after {formatDuration(alert.acceptedAfterSeconds * 1000)}</StatusLabel>
                    ) : alert.orderStatus === 'CANCELLED' ? (
                      <StatusLabel tone="void">Cancelled</StatusLabel>
                    ) : (
                      <StatusLabel tone="pending">Still waiting</StatusLabel>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
