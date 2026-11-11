import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { Field, FormError, Input, Select, Textarea } from '../components/ui/Field';
import { Overlay } from '../components/ui/Overlay';
import { EmptyState, ErrorState, LoadingRows, PageHeader, Panel, PanelHeader } from '../components/ui/Page';
import { Switch } from '../components/ui/Switch';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../features/auth/AuthProvider';
import { useTranslatedLanguages } from '../features/hotel/useBranding';
import { useHotelLocale } from '../features/hotel/useHotel';
import {
  useDeleteCategory,
  useDeleteItem,
  useSaveCategory,
  useSaveItem,
  useStaffMenu,
} from '../features/menu/api';
import { ItemAvailabilityTable } from '../features/menu/components/ItemAvailabilityTable';
import { LANGUAGE_NAME, type MenuCategory, type MenuItem, type TranslatedLanguage } from '../lib/api-types';
import { describeError } from '../lib/error-handler';
import { formatCharge } from '../lib/format';
import { Permission } from '../lib/permissions';

type ItemEditorState =
  | { mode: 'new'; categoryId: string }
  | { mode: 'edit'; item: MenuItem };

type CategoryEditorState =
  | { mode: 'new' }
  | { mode: 'edit'; category: MenuCategory };

const MAXIMUM_PAIRING_SUGGESTIONS = 5;

function formatCategoryHoursLabel(category: MenuCategory): string | null {
  if (!category.availableFrom || !category.availableUntil) {
    return null;
  }
  return `Served ${category.availableFrom}–${category.availableUntil}${
    category.isOpenNow ? '' : ' · not being served now'
  }`;
}

/**
 * MenuManagementPage — Screen UI-07: Menu Catalog Item Availability Toggling (86ing).
 *
 * Provides:
 * - Real-time menu inventory overview
 * - Category filter sidebar with item count badges
 * - Streamlined ItemAvailabilityTable with one-tap 86ing switches
 * - Search by item name, description, or category
 * - Role-based permissions guarding (MARK_ITEMS_UNAVAILABLE for 86ing, EDIT_MENU for updates)
 */
export function MenuManagementPage() {
  const { can } = useAuth();
  const { currency } = useHotelLocale();
  const menuQuery = useStaffMenu();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [itemEditor, setItemEditor] = useState<ItemEditorState | null>(null);
  const [categoryEditor, setCategoryEditor] = useState<CategoryEditorState | null>(null);

  const canEditMenu = can(Permission.EDIT_MENU);
  const canToggleAvailability = can(Permission.MARK_ITEMS_UNAVAILABLE);

  const categories = menuQuery.data ?? [];
  const allMenuItems = categories.flatMap((categoryItem) => categoryItem.items);
  const unavailableItemCount = allMenuItems.filter(
    (menuItem) => !menuItem.isAvailable,
  ).length;

  // Filter categories based on sidebar selection:
  // If selectedCategoryId is null or 'all', display all categories.
  // Otherwise, filter to only the selected category.
  const displayedCategories = useMemo(() => {
    if (!selectedCategoryId || selectedCategoryId === 'all') {
      return categories;
    }
    return categories.filter(
      (categoryItem) => categoryItem.id === selectedCategoryId,
    );
  }, [categories, selectedCategoryId]);

  return (
    <>
      <PageHeader
        title="Menu"
        description={
          menuQuery.data
            ? `${allMenuItems.length} items in ${categories.length} categories${
                unavailableItemCount ? ` · ${unavailableItemCount} unavailable` : ''
              }`
            : 'Changes push to every guest phone instantly'
        }
        actions={
          canEditMenu && (
            <Button
              variant="primary"
              onClick={() => setCategoryEditor({ mode: 'new' })}
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Add category
            </Button>
          )
        }
      />

      {!canToggleAvailability && (
        <p className="mb-4 text-[13px] text-ink-3">
          Ask reception or a manager to mark an item unavailable.
        </p>
      )}

      {menuQuery.isPending && <LoadingRows rows={6} label="Loading menu" />}

      {menuQuery.error && !menuQuery.data && (
        <Panel>
          <ErrorState
            message={describeError(menuQuery.error)}
            onRetry={() => void menuQuery.refetch()}
          />
        </Panel>
      )}

      {menuQuery.data && categories.length === 0 && (
        <Panel>
          <EmptyState
            title="The menu is empty"
            action={
              canEditMenu && (
                <Button
                  variant="primary"
                  onClick={() => setCategoryEditor({ mode: 'new' })}
                >
                  Add the first category
                </Button>
              )
            }
          >
            Guests see categories and items in the order shown here.
          </EmptyState>
        </Panel>
      )}

      {menuQuery.data && categories.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5 items-start">
          {/* Left Column: Category Filter Sidebar */}
          <div className="rounded-lg border border-line bg-surface p-3 shadow-sm">
            <div className="flex items-center justify-between px-2 py-1 mb-2 border-b border-line pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-3">
                Categories
              </span>
              {canEditMenu && (
                <button
                  type="button"
                  aria-label="Add category"
                  onClick={() => setCategoryEditor({ mode: 'new' })}
                  className="rounded p-1 text-ink-3 hover:bg-sunken hover:text-ink transition-colors"
                >
                  <Plus className="h-4 w-4" strokeWidth={2} />
                </button>
              )}
            </div>

            <nav className="space-y-1" aria-label="Menu category filter">
              {/* All categories option */}
              <button
                type="button"
                onClick={() => setSelectedCategoryId('all')}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                  selectedCategoryId === 'all'
                    ? 'bg-accent/10 font-semibold text-accent'
                    : 'text-ink-2 hover:bg-sunken hover:text-ink'
                }`}
              >
                <span>All items</span>
                <span className="text-xs tabular text-ink-3">
                  {allMenuItems.length}
                </span>
              </button>

              {/* Individual category rows */}
              {categories.map((categoryItem) => {
                const isSelected = selectedCategoryId === categoryItem.id;
                return (
                  <button
                    key={categoryItem.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(categoryItem.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                      isSelected
                        ? 'bg-accent/10 font-semibold text-accent'
                        : 'text-ink-2 hover:bg-sunken hover:text-ink'
                    }`}
                  >
                    <span className="truncate">{categoryItem.name}</span>
                    <span className="text-xs tabular text-ink-3 ml-2">
                      {categoryItem.items.length}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Column: Category Panels and Availability Table */}
          <div className="space-y-5">
            {displayedCategories.map((categoryItem) => (
              <Panel key={categoryItem.id}>
                <PanelHeader
                  title={categoryItem.name}
                  description={[
                    `${categoryItem.items.length} ${
                      categoryItem.items.length === 1 ? 'item' : 'items'
                    }`,
                    formatCategoryHoursLabel(categoryItem),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  actions={
                    canEditMenu && (
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setCategoryEditor({
                              mode: 'edit',
                              category: categoryItem,
                            })
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            setItemEditor({
                              mode: 'new',
                              categoryId: categoryItem.id,
                            })
                          }
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                          Add item
                        </Button>
                      </div>
                    )
                  }
                />

                <div className="p-4 pt-1">
                  <ItemAvailabilityTable
                    categories={[categoryItem]}
                    currency={currency}
                    canEdit={canEditMenu}
                    canToggle={canToggleAvailability}
                    onEditItem={(targetMenuItem) =>
                      setItemEditor({ mode: 'edit', item: targetMenuItem })
                    }
                  />
                </div>
              </Panel>
            ))}
          </div>
        </div>
      )}

      {/* Item create / edit modal */}
      <ItemEditorModal
        editor={itemEditor}
        categories={categories}
        currency={currency}
        onClose={() => setItemEditor(null)}
      />

      {/* Category create / edit modal */}
      <CategoryEditorModal
        editor={categoryEditor}
        nextSortOrder={categories.length}
        onClose={() => setCategoryEditor(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Item Editor Dialog
// ---------------------------------------------------------------------------

function ItemEditorModal({
  editor,
  categories,
  currency,
  onClose,
}: {
  editor: ItemEditorState | null;
  categories: MenuCategory[];
  currency: string;
  onClose: () => void;
}) {
  const saveItemMutation = useSaveItem();
  const deleteItemMutation = useDeleteItem();
  const toastNotification = useToast();
  const translatedLanguages = useTranslatedLanguages();

  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [isFeaturedItem, setIsFeaturedItem] = useState(false);
  const [pairingItemIdentifiers, setPairingItemIdentifiers] = useState<string[]>([]);
  const [itemTranslations, setItemTranslations] = useState<
    MenuItem['translations']
  >({});
  const [confirmDeletePrompt, setConfirmDeletePrompt] = useState(false);

  const editingMenuItem = editor?.mode === 'edit' ? editor.item : null;
  const editorUniqueKey = editor ? (editingMenuItem ? editingMenuItem.id : 'new') : 'none';

  useEffect(() => {
    if (!editor) {
      return;
    }
    setItemName(editingMenuItem?.name ?? '');
    setItemDescription(editingMenuItem?.description ?? '');
    setItemPrice(editingMenuItem ? String(editingMenuItem.price) : '');
    setTargetCategoryId(
      editor.mode === 'edit' ? editor.item.categoryId : editor.categoryId,
    );
    setIsFeaturedItem(editingMenuItem?.isFeatured ?? false);
    setPairingItemIdentifiers(editingMenuItem?.pairsWith ?? []);
    setItemTranslations(editingMenuItem?.translations ?? {});
    setConfirmDeletePrompt(false);
    saveItemMutation.reset();
    deleteItemMutation.reset();
  }, [editorUniqueKey]);

  if (!editor) {
    return null;
  }

  const priceFormatError =
    itemPrice !== '' && !/^\d{1,8}(\.\d{1,2})?$/.test(itemPrice)
      ? 'Enter an amount with at most two decimal places, e.g. 4500 or 4500.50.'
      : null;

  const isFormValid =
    itemName.trim().length > 0 &&
    itemPrice !== '' &&
    !priceFormatError &&
    Boolean(targetCategoryId);

  const candidatePairingItems = categories
    .flatMap((categoryItem) => categoryItem.items)
    .filter((menuItem) => menuItem.id !== editingMenuItem?.id);

  function handleTogglePairing(candidateItemId: string, shouldInclude: boolean) {
    setPairingItemIdentifiers((currentPairings) =>
      shouldInclude
        ? [...currentPairings, candidateItemId].slice(0, MAXIMUM_PAIRING_SUGGESTIONS)
        : currentPairings.filter((identifier) => identifier !== candidateItemId),
    );
  }

  function handleSetTranslation(
    languageKey: TranslatedLanguage,
    fieldKey: 'name' | 'description',
    translatedValue: string,
  ) {
    setItemTranslations((currentTranslations) => ({
      ...currentTranslations,
      [languageKey]: {
        name: currentTranslations[languageKey]?.name ?? '',
        ...currentTranslations[languageKey],
        [fieldKey]: translatedValue,
      },
    }));
  }

  function handleCleanTranslations(): MenuItem['translations'] {
    return Object.fromEntries(
      Object.entries(itemTranslations)
        .map(([languageKey, textRecord]) => [
          languageKey,
          {
            name: textRecord?.name.trim() ?? '',
            ...(textRecord?.description?.trim()
              ? { description: textRecord.description.trim() }
              : {}),
          },
        ] as const)
        .filter(([, textRecord]) => textRecord.name),
    );
  }

  function handleFormSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (!isFormValid) {
      return;
    }

    saveItemMutation.mutate(
      {
        itemId: editingMenuItem?.id,
        input: {
          categoryId: targetCategoryId,
          name: itemName.trim(),
          description: itemDescription.trim() || undefined,
          price: Number(itemPrice),
          isFeatured: isFeaturedItem,
          pairsWith: pairingItemIdentifiers,
          translations: handleCleanTranslations(),
        },
      },
      {
        onSuccess: () => {
          toastNotification.show(
            editingMenuItem
              ? `${itemName.trim()} updated`
              : `${itemName.trim()} added to the menu`,
          );
          onClose();
        },
      },
    );
  }

  function handleDeleteConfirmed() {
    if (!editingMenuItem) {
      return;
    }
    deleteItemMutation.mutate(editingMenuItem.id, {
      onSuccess: () => {
        toastNotification.show(`${editingMenuItem.name} removed from the menu`);
        onClose();
      },
    });
  }

  return (
    <Overlay
      open
      onClose={onClose}
      width="lg"
      title={editingMenuItem ? `Edit ${editingMenuItem.name}` : 'Add item'}
      footer={
        <>
          {editingMenuItem &&
            (confirmDeletePrompt ? (
              <Button
                variant="danger"
                className="mr-auto"
                onClick={handleDeleteConfirmed}
                pending={deleteItemMutation.isPending}
              >
                Confirm remove
              </Button>
            ) : (
              <Button
                variant="danger-quiet"
                className="mr-auto"
                onClick={() => setConfirmDeletePrompt(true)}
              >
                Remove
              </Button>
            ))}
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            form="menu-item-form"
            pending={saveItemMutation.isPending}
            disabled={!isFormValid}
          >
            {editingMenuItem ? 'Save changes' : 'Add item'}
          </Button>
        </>
      }
    >
      <form id="menu-item-form" onSubmit={handleFormSubmit} className="space-y-5">
        <Field label="Name">
          <Input
            value={itemName}
            maxLength={120}
            onChange={(inputEvent) => setItemName(inputEvent.target.value)}
            data-autofocus
          />
        </Field>

        <Field
          label="Description"
          optional
          hint="One line guests see under the name."
        >
          <Textarea
            value={itemDescription}
            rows={2}
            maxLength={500}
            onChange={(textareaEvent) =>
              setItemDescription(textareaEvent.target.value)
            }
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label={`Price (${currency})`}
            error={priceFormatError}
            hint="0 for free items."
          >
            <Input
              inputMode="decimal"
              value={itemPrice}
              onChange={(priceInputEvent) =>
                setItemPrice(priceInputEvent.target.value.replace(/[^\d.]/g, ''))
              }
            />
          </Field>

          <Field label="Category">
            <Select
              value={targetCategoryId}
              onChange={(selectChangeEvent) =>
                setTargetCategoryId(selectChangeEvent.target.value)
              }
            >
              {categories.map((categoryItem) => (
                <option key={categoryItem.id} value={categoryItem.id}>
                  {categoryItem.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-md border border-line px-3.5 py-3">
          <div>
            <p className="text-[13px] font-medium text-ink">Featured</p>
            <p className="text-xs text-ink-3">
              Shown at the top of the guest menu while it can be ordered.
            </p>
          </div>
          <Switch
            checked={isFeaturedItem}
            onChange={setIsFeaturedItem}
            label="Featured"
          />
        </div>

        {candidatePairingItems.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-medium text-ink">
              Suggest with this item{' '}
              <span className="font-normal text-ink-3">
                (up to {MAXIMUM_PAIRING_SUGGESTIONS})
              </span>
            </legend>
            <p className="text-xs text-ink-3">
              Guests adding this item are asked if they want these too, e.g. a drink.
            </p>
            <div className="max-h-44 overflow-y-auto rounded-md border border-line">
              {candidatePairingItems.map((candidateItem) => {
                const isSelected = pairingItemIdentifiers.includes(candidateItem.id);
                return (
                  <label
                    key={candidateItem.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-line px-3 py-2 text-[13px] last:border-b-0 hover:bg-canvas"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={
                        !isSelected &&
                        pairingItemIdentifiers.length >=
                          MAXIMUM_PAIRING_SUGGESTIONS
                      }
                      onChange={(checkboxChangeEvent) =>
                        handleTogglePairing(
                          candidateItem.id,
                          checkboxChangeEvent.target.checked,
                        )
                      }
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    <span className="flex-1 text-ink">{candidateItem.name}</span>
                    <span className="tabular text-xs text-ink-3">
                      {formatCharge(candidateItem.price, currency)}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {translatedLanguages.length > 0 && (
          <fieldset className="space-y-3">
            <legend className="text-[13px] font-medium text-ink">Translations</legend>
            <p className="text-xs text-ink-3">
              Leave empty to show the English text.
            </p>
            {translatedLanguages.map((languageCode) => (
              <div
                key={languageCode}
                className="grid gap-2 rounded-md border border-line p-3 sm:grid-cols-2"
              >
                <Field label={`Name · ${LANGUAGE_NAME[languageCode]}`}>
                  <Input
                    dir={languageCode === 'ar' ? 'rtl' : undefined}
                    value={itemTranslations[languageCode]?.name ?? ''}
                    maxLength={120}
                    onChange={(nameChangeEvent) =>
                      handleSetTranslation(
                        languageCode,
                        'name',
                        nameChangeEvent.target.value,
                      )
                    }
                  />
                </Field>
                <Field label={`Description · ${LANGUAGE_NAME[languageCode]}`}>
                  <Input
                    dir={languageCode === 'ar' ? 'rtl' : undefined}
                    value={itemTranslations[languageCode]?.description ?? ''}
                    maxLength={500}
                    onChange={(descChangeEvent) =>
                      handleSetTranslation(
                        languageCode,
                        'description',
                        descChangeEvent.target.value,
                      )
                    }
                  />
                </Field>
              </div>
            ))}
          </fieldset>
        )}

        {confirmDeletePrompt && (
          <p className="text-[13px] text-ink-2">
            Guests will no longer see this item. Past orders keep their record of it.
          </p>
        )}

        <FormError>
          {saveItemMutation.error
            ? describeError(saveItemMutation.error)
            : deleteItemMutation.error
              ? describeError(deleteItemMutation.error)
              : null}
        </FormError>
      </form>
    </Overlay>
  );
}

// ---------------------------------------------------------------------------
// Category Editor Dialog
// ---------------------------------------------------------------------------

function CategoryEditorModal({
  editor,
  nextSortOrder,
  onClose,
}: {
  editor: CategoryEditorState | null;
  nextSortOrder: number;
  onClose: () => void;
}) {
  const saveCategoryMutation = useSaveCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const toastNotification = useToast();
  const translatedLanguages = useTranslatedLanguages();

  const [categoryName, setCategoryName] = useState('');
  const [isTimedCategory, setIsTimedCategory] = useState(false);
  const [timeAvailableFrom, setTimeAvailableFrom] = useState('06:30');
  const [timeAvailableUntil, setTimeAvailableUntil] = useState('11:00');
  const [categoryTranslations, setCategoryTranslations] = useState<
    MenuCategory['translations']
  >({});

  const editingCategory = editor?.mode === 'edit' ? editor.category : null;

  useEffect(() => {
    if (!editor) {
      return;
    }
    setCategoryName(editingCategory?.name ?? '');
    setIsTimedCategory(Boolean(editingCategory?.availableFrom));
    setTimeAvailableFrom(editingCategory?.availableFrom ?? '06:30');
    setTimeAvailableUntil(editingCategory?.availableUntil ?? '11:00');
    setCategoryTranslations(editingCategory?.translations ?? {});
    saveCategoryMutation.reset();
    deleteCategoryMutation.reset();
  }, [editor, editingCategory?.id]);

  if (!editor) {
    return null;
  }

  const hoursValidationError =
    isTimedCategory && timeAvailableFrom === timeAvailableUntil
      ? 'Start and end must differ.'
      : null;

  function handleCategorySubmit(submitEvent: FormEvent) {
    submitEvent.preventDefault();
    if (!categoryName.trim() || hoursValidationError) {
      return;
    }

    saveCategoryMutation.mutate(
      {
        categoryId: editingCategory?.id,
        name: categoryName.trim(),
        sortOrder: nextSortOrder,
        availableFrom: isTimedCategory ? timeAvailableFrom : null,
        availableUntil: isTimedCategory ? timeAvailableUntil : null,
        translations: Object.fromEntries(
          Object.entries(categoryTranslations)
            .map(([languageKey, textRecord]) => [
              languageKey,
              { name: textRecord?.name.trim() ?? '' },
            ] as const)
            .filter(([, textRecord]) => textRecord.name),
        ),
      },
      {
        onSuccess: () => {
          toastNotification.show(
            editingCategory
              ? `${categoryName.trim()} saved`
              : `${categoryName.trim()} added`,
          );
          onClose();
        },
      },
    );
  }

  const canRemoveCategory = editingCategory && editingCategory.items.length === 0;

  return (
    <Overlay
      open
      onClose={onClose}
      width="md"
      title={editingCategory ? `Edit ${editingCategory.name}` : 'Add category'}
      footer={
        <>
          {canRemoveCategory && (
            <Button
              variant="danger-quiet"
              className="mr-auto"
              pending={deleteCategoryMutation.isPending}
              onClick={() =>
                deleteCategoryMutation.mutate(editingCategory.id, {
                  onSuccess: () => {
                    toastNotification.show(`${editingCategory.name} removed`);
                    onClose();
                  },
                })
              }
            >
              Remove
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            form="menu-category-form"
            pending={saveCategoryMutation.isPending}
            disabled={!categoryName.trim() || Boolean(hoursValidationError)}
          >
            {editingCategory ? 'Save' : 'Add category'}
          </Button>
        </>
      }
    >
      <form
        id="menu-category-form"
        onSubmit={handleCategorySubmit}
        className="space-y-5"
      >
        <Field
          label="Name"
          hint={
            editingCategory && editingCategory.items.length > 0
              ? 'Move or remove its items to delete this category.'
              : undefined
          }
        >
          <Input
            value={categoryName}
            maxLength={80}
            onChange={(inputChangeEvent) =>
              setCategoryName(inputChangeEvent.target.value)
            }
            data-autofocus
          />
        </Field>

        <div className="space-y-3 rounded-md border border-line px-3.5 py-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-ink">Served at set hours</p>
              <p className="text-xs text-ink-3">
                For breakfast, lunch or late night. Outside these hours guests cannot
                order from it.
              </p>
            </div>
            <Switch
              checked={isTimedCategory}
              onChange={setIsTimedCategory}
              label="Served at set hours"
            />
          </div>

          {isTimedCategory && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="From" error={hoursValidationError}>
                <Input
                  type="time"
                  value={timeAvailableFrom}
                  onChange={(fromChangeEvent) =>
                    setTimeAvailableFrom(fromChangeEvent.target.value)
                  }
                />
              </Field>
              <Field
                label="Until"
                hint={
                  timeAvailableUntil < timeAvailableFrom
                    ? 'Runs past midnight.'
                    : undefined
                }
              >
                <Input
                  type="time"
                  value={timeAvailableUntil}
                  onChange={(untilChangeEvent) =>
                    setTimeAvailableUntil(untilChangeEvent.target.value)
                  }
                />
              </Field>
            </div>
          )}
        </div>

        {translatedLanguages.length > 0 && (
          <fieldset className="space-y-3">
            <legend className="text-[13px] font-medium text-ink">Translations</legend>
            {translatedLanguages.map((languageCode) => (
              <Field
                key={languageCode}
                label={LANGUAGE_NAME[languageCode]}
                optional
              >
                <Input
                  dir={languageCode === 'ar' ? 'rtl' : undefined}
                  value={categoryTranslations[languageCode]?.name ?? ''}
                  maxLength={80}
                  onChange={(transChangeEvent) =>
                    setCategoryTranslations({
                      ...categoryTranslations,
                      [languageCode]: { name: transChangeEvent.target.value },
                    })
                  }
                />
              </Field>
            ))}
          </fieldset>
        )}

        <FormError>
          {saveCategoryMutation.error
            ? describeError(saveCategoryMutation.error)
            : deleteCategoryMutation.error
              ? describeError(deleteCategoryMutation.error)
              : null}
        </FormError>
      </form>
    </Overlay>
  );
}
