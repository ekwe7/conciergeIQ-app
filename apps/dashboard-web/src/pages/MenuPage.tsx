import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { Field, FormError, Input, Select, Textarea } from '../components/ui/Field';
import { Overlay } from '../components/ui/Overlay';
import { EmptyState, ErrorState, LoadingRows, PageHeader, Panel, PanelHeader } from '../components/ui/Page';
import { Tag } from '../components/ui/Status';
import { Switch } from '../components/ui/Switch';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../features/auth/AuthProvider';
import { useTranslatedLanguages } from '../features/hotel/useBranding';
import { useHotelLocale } from '../features/hotel/useHotel';
import {
  useDeleteCategory,
  useDeleteItem,
  useMenu,
  useSaveCategory,
  useSaveItem,
  useSetAvailability,
} from '../features/menu/api';
import { LANGUAGE_NAME, type MenuCategory, type MenuItem, type TranslatedLanguage } from '../lib/api-types';
import { describeError } from '../lib/error-handler';
import { formatCharge } from '../lib/format';
import { Permission } from '../lib/permissions';

type ItemEditor = { mode: 'new'; categoryId: string } | { mode: 'edit'; item: MenuItem };
type CategoryEditor = { mode: 'new' } | { mode: 'edit'; category: MenuCategory };

const MAX_SUGGESTIONS = 5;

function hoursLabel(category: MenuCategory): string | null {
  if (!category.availableFrom || !category.availableUntil) return null;
  return `Served ${category.availableFrom}–${category.availableUntil}${category.isOpenNow ? '' : ' · not being served now'}`;
}

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
  const allItems = categories.flatMap((category) => category.items);
  const nameOf = (itemId: string) => allItems.find((item) => item.id === itemId)?.name;
  const unavailable = allItems.filter((item) => !item.isAvailable).length;

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
            ? `${allItems.length} items in ${categories.length} categories${unavailable ? ` · ${unavailable} unavailable` : ''}`
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

      {!canToggle && <p className="mb-4 text-[13px] text-ink-3">Ask reception or a manager to mark an item unavailable.</p>}

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
              description={[`${category.items.length} ${category.items.length === 1 ? 'item' : 'items'}`, hoursLabel(category)]
                .filter(Boolean)
                .join(' · ')}
              actions={
                canEdit && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setCategoryEditor({ mode: 'edit', category })}>
                      Edit
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
                {category.items.map((item) => {
                  const suggestions = item.pairsWith.map(nameOf).filter(Boolean);
                  return (
                    <li key={item.id} className="flex items-center gap-4 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium">
                          <span className={item.isAvailable ? 'text-ink' : 'text-ink-3'}>{item.name}</span>
                          {!item.isAvailable && <span className="text-xs font-normal text-ink-3">Unavailable</span>}
                          {item.isFeatured && <Tag>Featured</Tag>}
                        </p>
                        {item.description && <p className="mt-0.5 line-clamp-1 text-xs text-ink-3">{item.description}</p>}
                        {suggestions.length > 0 && <p className="mt-0.5 text-xs text-ink-3">Suggests {suggestions.join(', ')}</p>}
                      </div>
                      <span className="tabular w-24 shrink-0 text-right text-[13px] text-ink">{formatCharge(item.price, currency)}</span>
                      {canToggle && <Switch checked={item.isAvailable} onChange={(next) => toggle(item, next)} label={`${item.name} available`} />}
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
                  );
                })}
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
  const languages = useTranslatedLanguages();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [pairsWith, setPairsWith] = useState<string[]>([]);
  const [translations, setTranslations] = useState<MenuItem['translations']>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const editing = editor?.mode === 'edit' ? editor.item : null;
  const editorKey = editor ? (editor.mode === 'edit' ? editor.item.id : `new-${editor.categoryId}`) : null;

  useEffect(() => {
    if (!editor) return;
    setName(editing?.name ?? '');
    setDescription(editing?.description ?? '');
    setPrice(editing ? String(editing.price) : '');
    setCategoryId(editor.mode === 'edit' ? editor.item.categoryId : editor.categoryId);
    setIsFeatured(editing?.isFeatured ?? false);
    setPairsWith(editing?.pairsWith ?? []);
    setTranslations(editing?.translations ?? {});
    setConfirmDelete(false);
    save.reset();
    remove.reset();
  }, [editorKey]);

  if (!editor) return null;

  const priceError = price !== '' && !/^\d{1,8}(\.\d{1,2})?$/.test(price) ? 'Enter an amount with at most two decimal places, e.g. 4500 or 4500.50.' : null;
  const valid = name.trim() && price !== '' && !priceError && categoryId;
  const candidates = categories.flatMap((category) => category.items).filter((item) => item.id !== editing?.id);

  const togglePairing = (itemId: string, on: boolean) =>
    setPairsWith((current) => (on ? [...current, itemId].slice(0, MAX_SUGGESTIONS) : current.filter((id) => id !== itemId)));

  const setTranslation = (language: TranslatedLanguage, field: 'name' | 'description', value: string) =>
    setTranslations((current) => ({ ...current, [language]: { name: current[language]?.name ?? '', ...current[language], [field]: value } }));

  /** Drops empty translations so untranslated items fall back to English. */
  const cleanTranslations = (): MenuItem['translations'] =>
    Object.fromEntries(
      Object.entries(translations)
        .map(([language, text]) => [language, { name: text?.name.trim() ?? '', ...(text?.description?.trim() ? { description: text.description.trim() } : {}) }] as const)
        .filter(([, text]) => text.name),
    );

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    save.mutate(
      {
        itemId: editing?.id,
        input: {
          categoryId,
          name: name.trim(),
          description: description.trim() || undefined,
          price: Number(price),
          isFeatured,
          pairsWith,
          translations: cleanTranslations(),
        },
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
      width="lg"
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
      <form id="menu-item" onSubmit={submit} className="space-y-5">
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

        <div className="flex items-center justify-between gap-4 rounded-md border border-line px-3.5 py-3">
          <div>
            <p className="text-[13px] font-medium text-ink">Featured</p>
            <p className="text-xs text-ink-3">Shown at the top of the guest menu while it can be ordered.</p>
          </div>
          <Switch checked={isFeatured} onChange={setIsFeatured} label="Featured" />
        </div>

        {candidates.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-medium text-ink">
              Suggest with this item <span className="font-normal text-ink-3">(up to {MAX_SUGGESTIONS})</span>
            </legend>
            <p className="text-xs text-ink-3">Guests adding this item are asked if they want these too, e.g. a drink.</p>
            <div className="max-h-44 overflow-y-auto rounded-md border border-line">
              {candidates.map((item) => {
                const checked = pairsWith.includes(item.id);
                return (
                  <label key={item.id} className="flex cursor-pointer items-center gap-3 border-b border-line px-3 py-2 text-[13px] last:border-b-0 hover:bg-canvas">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && pairsWith.length >= MAX_SUGGESTIONS}
                      onChange={(event) => togglePairing(item.id, event.target.checked)}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    <span className="flex-1 text-ink">{item.name}</span>
                    <span className="tabular text-xs text-ink-3">{formatCharge(item.price, currency)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {languages.length > 0 && (
          <fieldset className="space-y-3">
            <legend className="text-[13px] font-medium text-ink">Translations</legend>
            <p className="text-xs text-ink-3">Leave empty to show the English text.</p>
            {languages.map((language) => (
              <div key={language} className="grid gap-2 rounded-md border border-line p-3 sm:grid-cols-2">
                <Field label={`Name · ${LANGUAGE_NAME[language]}`}>
                  <Input
                    dir={language === 'ar' ? 'rtl' : undefined}
                    value={translations[language]?.name ?? ''}
                    maxLength={120}
                    onChange={(event) => setTranslation(language, 'name', event.target.value)}
                  />
                </Field>
                <Field label={`Description · ${LANGUAGE_NAME[language]}`}>
                  <Input
                    dir={language === 'ar' ? 'rtl' : undefined}
                    value={translations[language]?.description ?? ''}
                    maxLength={500}
                    onChange={(event) => setTranslation(language, 'description', event.target.value)}
                  />
                </Field>
              </div>
            ))}
          </fieldset>
        )}

        {confirmDelete && <p className="text-[13px] text-ink-2">Guests will no longer see this item. Past orders keep their record of it.</p>}
        <FormError>{save.error ? describeError(save.error) : remove.error ? describeError(remove.error) : null}</FormError>
      </form>
    </Overlay>
  );
}

function CategoryDialog({ editor, nextSortOrder, onClose }: { editor: CategoryEditor | null; nextSortOrder: number; onClose: () => void }) {
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const toast = useToast();
  const languages = useTranslatedLanguages();
  const [name, setName] = useState('');
  const [timed, setTimed] = useState(false);
  const [from, setFrom] = useState('06:30');
  const [until, setUntil] = useState('11:00');
  const [translations, setTranslations] = useState<MenuCategory['translations']>({});
  const editing = editor?.mode === 'edit' ? editor.category : null;

  useEffect(() => {
    if (!editor) return;
    setName(editing?.name ?? '');
    setTimed(Boolean(editing?.availableFrom));
    setFrom(editing?.availableFrom ?? '06:30');
    setUntil(editing?.availableUntil ?? '11:00');
    setTranslations(editing?.translations ?? {});
    save.reset();
    remove.reset();
  }, [editor, editing?.id]);

  if (!editor) return null;

  const hoursError = timed && from === until ? 'Start and end must differ.' : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || hoursError) return;
    save.mutate(
      {
        categoryId: editing?.id,
        name: name.trim(),
        sortOrder: nextSortOrder,
        availableFrom: timed ? from : null,
        availableUntil: timed ? until : null,
        translations: Object.fromEntries(
          Object.entries(translations)
            .map(([language, text]) => [language, { name: text?.name.trim() ?? '' }] as const)
            .filter(([, text]) => text.name),
        ),
      },
      {
        onSuccess: () => {
          toast.show(editing ? `${name.trim()} saved` : `${name.trim()} added`);
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
      width="md"
      title={editing ? `Edit ${editing.name}` : 'Add category'}
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
          <Button variant="primary" type="submit" form="menu-category" pending={save.isPending} disabled={!name.trim() || Boolean(hoursError)}>
            {editing ? 'Save' : 'Add category'}
          </Button>
        </>
      }
    >
      <form id="menu-category" onSubmit={submit} className="space-y-5">
        <Field label="Name" hint={editing && editing.items.length > 0 ? 'Move or remove its items to delete this category.' : undefined}>
          <Input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} data-autofocus />
        </Field>

        <div className="space-y-3 rounded-md border border-line px-3.5 py-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-ink">Served at set hours</p>
              <p className="text-xs text-ink-3">For breakfast, lunch or late night. Outside these hours guests cannot order from it.</p>
            </div>
            <Switch checked={timed} onChange={setTimed} label="Served at set hours" />
          </div>
          {timed && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="From" error={hoursError}>
                <Input type="time" value={from} onChange={(event) => setFrom(event.target.value)} />
              </Field>
              <Field label="Until" hint={until < from ? 'Runs past midnight.' : undefined}>
                <Input type="time" value={until} onChange={(event) => setUntil(event.target.value)} />
              </Field>
            </div>
          )}
        </div>

        {languages.length > 0 && (
          <fieldset className="space-y-3">
            <legend className="text-[13px] font-medium text-ink">Translations</legend>
            {languages.map((language) => (
              <Field key={language} label={LANGUAGE_NAME[language]} optional>
                <Input
                  dir={language === 'ar' ? 'rtl' : undefined}
                  value={translations[language]?.name ?? ''}
                  maxLength={80}
                  onChange={(event) => setTranslations({ ...translations, [language]: { name: event.target.value } })}
                />
              </Field>
            ))}
          </fieldset>
        )}

        <FormError>{save.error ? describeError(save.error) : remove.error ? describeError(remove.error) : null}</FormError>
      </form>
    </Overlay>
  );
}
