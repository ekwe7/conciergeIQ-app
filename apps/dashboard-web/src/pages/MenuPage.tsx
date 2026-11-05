import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { Field, FormError, Input, Select, Textarea } from '../components/ui/Field';
import { Overlay } from '../components/ui/Overlay';
import { EmptyState, ErrorState, LoadingRows, PageHeader, Panel, PanelHeader } from '../components/ui/Page';
import { Switch } from '../components/ui/Switch';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../features/auth/AuthProvider';
import { useHotelLocale } from '../features/hotel/useHotel';
import {
  useDeleteCategory,
  useDeleteItem,
  useMenu,
  useSaveCategory,
  useSaveItem,
  useSetAvailability,
} from '../features/menu/api';
import type { MenuCategory, MenuItem } from '../lib/api-types';
import { describeError } from '../lib/error-handler';
import { formatCharge } from '../lib/format';
import { Permission } from '../lib/permissions';

type ItemEditor = { mode: 'new'; categoryId: string } | { mode: 'edit'; item: MenuItem };
type CategoryEditor = { mode: 'new' } | { mode: 'edit'; category: MenuCategory };

export function MenuPage() {
  const { can } = useAuth();
  const { currency } = useHotelLocale();
  const menu = useMenu();
  const setAvailability = useSetAvailability();
  const toast = useToast();
  const [itemEditor, setItemEditor] = useState<ItemEditor | null>(null);
  const [categoryEditor, setCategoryEditor] = useState<CategoryEditor | null>(null);

  const canEdit = can(Permission.EDIT_MENU);
  const canToggle = can(Permission.MARK_ITEMS_UNAVAILABLE);
  const categories = menu.data ?? [];
  const itemCount = categories.reduce((sum, category) => sum + category.items.length, 0);
  const unavailable = categories.reduce((sum, category) => sum + category.items.filter((item) => !item.isAvailable).length, 0);

  const toggle = (item: MenuItem, isAvailable: boolean) =>
    setAvailability.mutate(
      { itemId: item.id, isAvailable },
      {
        onSuccess: () => toast.show(`${item.name} is ${isAvailable ? 'available again' : 'marked unavailable'}`),
        onError: (error) => toast.error(describeError(error)),
      },
    );

  return (
    <>
      <PageHeader
        title="Menu"
        description={
          menu.data
            ? `${itemCount} items in ${categories.length} categories${unavailable ? ` · ${unavailable} unavailable` : ''}`
            : 'What guests can order from their room.'
        }
        actions={
          canEdit && (
            <Button variant="primary" onClick={() => setCategoryEditor({ mode: 'new' })}>
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Add category
            </Button>
          )
        }
      />

      {!canToggle && (
        <p className="mb-4 text-[13px] text-ink-3">Ask reception or a manager to mark an item unavailable.</p>
      )}

      {menu.isPending && <LoadingRows rows={6} label="Loading menu" />}
      {menu.error && !menu.data && (
        <Panel>
          <ErrorState message={describeError(menu.error)} onRetry={() => void menu.refetch()} />
        </Panel>
      )}

      {menu.data && categories.length === 0 && (
        <Panel>
          <EmptyState
            title="The menu is empty"
            action={
              canEdit && (
                <Button variant="primary" onClick={() => setCategoryEditor({ mode: 'new' })}>
                  Add the first category
                </Button>
              )
            }
          >
            Guests see categories and items in the order shown here.
          </EmptyState>
        </Panel>
      )}

      <div className="space-y-5">
        {categories.map((category) => (
          <Panel key={category.id}>
            <PanelHeader
              title={category.name}
              description={`${category.items.length} ${category.items.length === 1 ? 'item' : 'items'}`}
              actions={
                canEdit && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setCategoryEditor({ mode: 'edit', category })}>
                      Rename
                    </Button>
                    <Button size="sm" onClick={() => setItemEditor({ mode: 'new', categoryId: category.id })}>
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Add item
                    </Button>
                  </div>
                )
              }
            />
            {category.items.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-ink-3">No items in this category yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {category.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className={item.isAvailable ? 'text-[13px] font-medium text-ink' : 'text-[13px] font-medium text-ink-3'}>
                        {item.name}
                        {!item.isAvailable && <span className="ml-2 text-xs font-normal">Unavailable</span>}
                      </p>
                      {item.description && <p className="mt-0.5 line-clamp-1 text-xs text-ink-3">{item.description}</p>}
                    </div>
                    <span className="tabular w-24 shrink-0 text-right text-[13px] text-ink">{formatCharge(item.price, currency)}</span>
                    {canToggle && (
                      <Switch
                        checked={item.isAvailable}
                        onChange={(next) => toggle(item, next)}
                        label={`${item.name} available`}
                      />
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setItemEditor({ mode: 'edit', item })}
                        aria-label={`Edit ${item.name}`}
                        className="rounded p-1.5 text-ink-3 hover:bg-sunken hover:text-ink"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ))}
      </div>

      <ItemDialog editor={itemEditor} categories={categories} currency={currency} onClose={() => setItemEditor(null)} />
      <CategoryDialog editor={categoryEditor} nextSortOrder={categories.length} onClose={() => setCategoryEditor(null)} />
    </>
  );
}

function ItemDialog({
  editor,
  categories,
  currency,
  onClose,
}: {
  editor: ItemEditor | null;
  categories: MenuCategory[];
  currency: string;
  onClose: () => void;
}) {
  const save = useSaveItem();
  const remove = useDeleteItem();
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const editing = editor?.mode === 'edit' ? editor.item : null;
  const editorKey = editor ? (editor.mode === 'edit' ? editor.item.id : `new-${editor.categoryId}`) : null;

  useEffect(() => {
    if (!editor) return;
    setName(editing?.name ?? '');
    setDescription(editing?.description ?? '');
    setPrice(editing ? String(editing.price) : '');
    setCategoryId(editor.mode === 'edit' ? editor.item.categoryId : editor.categoryId);
    setConfirmDelete(false);
    save.reset();
    remove.reset();
  }, [editorKey]);

  if (!editor) return null;

  const parsedPrice = Number(price);
  const priceError =
    price !== '' && !/^\d{1,8}(\.\d{1,2})?$/.test(price)
      ? 'Enter an amount with at most two decimal places, e.g. 4500 or 4500.50.'
      : null;
  const valid = name.trim() && price !== '' && !priceError && categoryId;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    save.mutate(
      {
        itemId: editing?.id,
        input: { categoryId, name: name.trim(), description: description.trim() || undefined, price: parsedPrice },
      },
      {
        onSuccess: () => {
          toast.show(editing ? `${name.trim()} updated` : `${name.trim()} added to the menu`);
          onClose();
        },
      },
    );
  }

  const deleteItem = () =>
    editing &&
    remove.mutate(editing.id, {
      onSuccess: () => {
        toast.show(`${editing.name} removed from the menu`);
        onClose();
      },
    });

  return (
    <Overlay
      open
      onClose={onClose}
      title={editing ? `Edit ${editing.name}` : 'Add item'}
      footer={
        <>
          {editing &&
            (confirmDelete ? (
              <Button variant="danger" className="mr-auto" onClick={deleteItem} pending={remove.isPending}>
                Confirm remove
              </Button>
            ) : (
              <Button variant="danger-quiet" className="mr-auto" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                Remove
              </Button>
            ))}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="menu-item" pending={save.isPending} disabled={!valid}>
            {editing ? 'Save changes' : 'Add item'}
          </Button>
        </>
      }
    >
      <form id="menu-item" onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <Input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} data-autofocus />
        </Field>
        <Field label="Description" optional hint="One line guests see under the name.">
          <Textarea value={description} rows={2} maxLength={500} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Price (${currency})`} error={priceError} hint="0 for free items.">
            <Input inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value.replace(/[^\d.]/g, ''))} />
          </Field>
          <Field label="Category">
            <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {confirmDelete && (
          <p className="text-[13px] text-ink-2">Guests will no longer see this item. Past orders keep their record of it.</p>
        )}
        <FormError>{save.error ? describeError(save.error) : remove.error ? describeError(remove.error) : null}</FormError>
      </form>
    </Overlay>
  );
}

function CategoryDialog({
  editor,
  nextSortOrder,
  onClose,
}: {
  editor: CategoryEditor | null;
  nextSortOrder: number;
  onClose: () => void;
}) {
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const toast = useToast();
  const [name, setName] = useState('');
  const editing = editor?.mode === 'edit' ? editor.category : null;

  useEffect(() => {
    if (!editor) return;
    setName(editing?.name ?? '');
    save.reset();
    remove.reset();
  }, [editor, editing?.id]);

  if (!editor) return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    save.mutate(
      { categoryId: editing?.id, name: name.trim(), sortOrder: nextSortOrder },
      {
        onSuccess: () => {
          toast.show(editing ? 'Category renamed' : `${name.trim()} added`);
          onClose();
        },
      },
    );
  }

  const canRemove = editing && editing.items.length === 0;

  return (
    <Overlay
      open
      onClose={onClose}
      width="sm"
      title={editing ? 'Rename category' : 'Add category'}
      footer={
        <>
          {canRemove && (
            <Button
              variant="danger-quiet"
              className="mr-auto"
              pending={remove.isPending}
              onClick={() =>
                remove.mutate(editing.id, {
                  onSuccess: () => {
                    toast.show(`${editing.name} removed`);
                    onClose();
                  },
                })
              }
            >
              Remove
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="menu-category" pending={save.isPending} disabled={!name.trim()}>
            {editing ? 'Save' : 'Add category'}
          </Button>
        </>
      }
    >
      <form id="menu-category" onSubmit={submit} className="space-y-4">
        <Field label="Name" hint={editing && editing.items.length > 0 ? 'Move or remove its items to delete this category.' : undefined}>
          <Input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} data-autofocus />
        </Field>
        <FormError>{save.error ? describeError(save.error) : remove.error ? describeError(remove.error) : null}</FormError>
      </form>
    </Overlay>
  );
}
