import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { Field, FormError, Input, Select } from '../components/ui/Field';
import { Overlay } from '../components/ui/Overlay';
import { EmptyState, ErrorState, LoadingRows, PageHeader, Panel, table } from '../components/ui/Page';
import { StatusLabel } from '../components/ui/Status';
import { useToast } from '../components/ui/Toast';
import { cx } from '../components/ui/cx';
import { useCurrentUser } from '../features/auth/AuthProvider';
import { useHotelLocale } from '../features/hotel/useHotel';
import { api } from '../lib/api-client';
import { STAFF_ROLES_IN_ORDER, type StaffRole, type StaffUser } from '../lib/api-types';
import { describeError } from '../lib/error-handler';
import { formatDateTime } from '../lib/format';
import { canManageRole, ROLE_LABEL } from '../lib/permissions';
import { queryKeys } from '../lib/query-keys';

const ROLE_DUTIES: Record<StaffRole, string> = {
  STAFF: 'Works the live orders board.',
  RECEPTIONIST: 'Also checks guests in and out, records payments and marks items unavailable.',
  MANAGER: 'Also edits the menu, manages staff below manager and reads the activity log.',
  ADMIN: 'Everything, including rooms, QR codes and hotel settings.',
};

function useStaff() {
  const { hotelId } = useCurrentUser();
  return useQuery({
    queryKey: queryKeys.staff(hotelId),
    queryFn: async ({ signal }) =>
      (await api.get<StaffUser[]>('/users', { signal })).sort(
        (a, b) => Number(b.isActive) - Number(a.isActive) || a.fullName.localeCompare(b.fullName),
      ),
  });
}

function useStaffMutation<Variables>(send: (variables: Variables) => Promise<StaffUser>) {
  const { hotelId } = useCurrentUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.staff(hotelId) }),
  });
}

export function StaffPage() {
  const me = useCurrentUser();
  const { timeZone } = useHotelLocale();
  const staff = useStaff();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const active = staff.data?.filter((user) => user.isActive).length ?? 0;

  return (
    <>
      <PageHeader
        title="Staff & roles"
        description={staff.data ? `${active} active ${active === 1 ? 'account' : 'accounts'}` : undefined}
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Add staff member
          </Button>
        }
      />

      <Panel>
        {staff.isPending && <LoadingRows rows={5} label="Loading staff" />}
        {staff.error && <ErrorState message={describeError(staff.error)} onRetry={() => void staff.refetch()} />}
        {staff.data?.length === 0 && <EmptyState title="No staff accounts yet" />}
        {staff.data && staff.data.length > 0 && (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th}>Name</th>
                  <th className={table.th}>Role</th>
                  <th className={table.th}>Status</th>
                  <th className={table.th}>Last signed in</th>
                  <th className={cx(table.th, 'text-right')}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className={table.body}>
                {staff.data.map((user) => {
                  const manageable = user.id !== me.id && canManageRole(me.role, user.role);
                  return (
                    <tr key={user.id} className={table.row}>
                      <td className={table.td}>
                        <p className={user.isActive ? 'font-medium text-ink' : 'font-medium text-ink-3'}>
                          {user.fullName}
                          {user.id === me.id && <span className="ml-2 text-xs font-normal text-ink-3">You</span>}
                        </p>
                        <p className="text-xs text-ink-3">{user.email}</p>
                      </td>
                      <td className={table.td}>{ROLE_LABEL[user.role]}</td>
                      <td className={table.td}>
                        {user.isActive ? <StatusLabel tone="done">Active</StatusLabel> : <StatusLabel tone="neutral">Deactivated</StatusLabel>}
                      </td>
                      <td className={cx(table.td, 'tabular whitespace-nowrap text-xs')}>
                        {user.lastSignedInAt ? formatDateTime(user.lastSignedInAt, timeZone) : 'Never'}
                      </td>
                      <td className={cx(table.td, 'text-right')}>
                        {manageable && (
                          <Button size="sm" variant="ghost" onClick={() => setEditing(user)}>
                            Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="mt-4 text-xs text-ink-3">
        {me.role === 'ADMIN' ? 'Admins can manage every account.' : 'Managers can add and change staff and receptionists only.'}
      </p>

      <AddStaffDialog open={adding} onClose={() => setAdding(false)} />
      <EditStaffDialog user={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function RoleField({ value, onChange }: { value: StaffRole; onChange: (role: StaffRole) => void }) {
  const me = useCurrentUser();
  const roles = STAFF_ROLES_IN_ORDER.filter((role) => canManageRole(me.role, role));
  return (
    <Field label="Role" hint={ROLE_DUTIES[value]}>
      <Select value={value} onChange={(event) => onChange(event.target.value as StaffRole)}>
        {roles.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABEL[role]}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function AddStaffDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useStaffMutation((input: { fullName: string; email: string; role: StaffRole; password: string }) =>
    api.post<StaffUser>('/users', input),
  );
  const toast = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('STAFF');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!open) return;
    setFullName('');
    setEmail('');
    setRole('STAFF');
    setPassword('');
    create.reset();
  }, [open]);

  if (!open) return null;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordError = password && password.length < 8 ? 'At least 8 characters.' : null;
  const valid = fullName.trim() && emailValid && password.length >= 8;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    create.mutate(
      { fullName: fullName.trim(), email: email.trim().toLowerCase(), role, password },
      {
        onSuccess: (user) => {
          toast.show(`${user.fullName} can now sign in`);
          onClose();
        },
      },
    );
  }

  return (
    <Overlay
      open
      onClose={onClose}
      title="Add staff member"
      description="Share the temporary password in person. They should change it after signing in."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="add-staff" pending={create.isPending} disabled={!valid}>
            Create account
          </Button>
        </>
      }
    >
      <form id="add-staff" onSubmit={submit} className="space-y-4">
        <Field label="Full name">
          <Input value={fullName} maxLength={120} onChange={(event) => setFullName(event.target.value)} data-autofocus />
        </Field>
        <Field label="Email" error={email && !emailValid ? 'Enter a valid email address.' : null}>
          <Input type="email" value={email} maxLength={160} autoComplete="off" onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <RoleField value={role} onChange={setRole} />
        <Field label="Temporary password" error={passwordError}>
          <Input type="text" value={password} maxLength={128} autoComplete="new-password" onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <FormError>{create.error ? describeError(create.error) : null}</FormError>
      </form>
    </Overlay>
  );
}

function EditStaffDialog({ user, onClose }: { user: StaffUser | null; onClose: () => void }) {
  const update = useStaffMutation(({ userId, change }: { userId: string; change: Partial<Pick<StaffUser, 'fullName' | 'role' | 'isActive'>> }) =>
    api.patch<StaffUser>(`/users/${userId}`, change),
  );
  const toast = useToast();
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<StaffRole>('STAFF');
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName);
    setRole(user.role);
    setConfirmDeactivate(false);
    update.reset();
  }, [user?.id]);

  if (!user) return null;

  const save = (change: Partial<Pick<StaffUser, 'fullName' | 'role' | 'isActive'>>, message: string) =>
    update.mutate(
      { userId: user.id, change },
      {
        onSuccess: () => {
          toast.show(message);
          onClose();
        },
      },
    );

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!user || !fullName.trim()) return;
    save({ fullName: fullName.trim(), role }, `${fullName.trim()} updated`);
  }

  return (
    <Overlay
      open
      onClose={onClose}
      title={`Edit ${user.fullName}`}
      description={user.email}
      footer={
        <>
          {user.isActive ? (
            confirmDeactivate ? (
              <Button
                variant="danger"
                className="mr-auto"
                pending={update.isPending}
                onClick={() => save({ isActive: false }, `${user.fullName} deactivated`)}
              >
                Confirm deactivation
              </Button>
            ) : (
              <Button variant="danger-quiet" className="mr-auto" onClick={() => setConfirmDeactivate(true)}>
                Deactivate
              </Button>
            )
          ) : (
            <Button className="mr-auto" pending={update.isPending} onClick={() => save({ isActive: true }, `${user.fullName} reactivated`)}>
              Reactivate
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="edit-staff" pending={update.isPending} disabled={!fullName.trim()}>
            Save
          </Button>
        </>
      }
    >
      <form id="edit-staff" onSubmit={submit} className="space-y-4">
        <Field label="Full name">
          <Input value={fullName} maxLength={120} onChange={(event) => setFullName(event.target.value)} data-autofocus />
        </Field>
        <RoleField value={role} onChange={setRole} />
        {confirmDeactivate && (
          <p className="text-[13px] text-ink-2">
            {user.fullName} is signed out everywhere at once and cannot sign in again until reactivated. Their past actions stay in the
            activity log.
          </p>
        )}
        <FormError>{update.error ? describeError(update.error) : null}</FormError>
      </form>
    </Overlay>
  );
}
