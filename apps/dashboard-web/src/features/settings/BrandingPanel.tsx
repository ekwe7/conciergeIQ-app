import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, FormError, Input } from '../../components/ui/Field';
import { ErrorState, LoadingRows, Panel, PanelHeader } from '../../components/ui/Page';
import { Switch } from '../../components/ui/Switch';
import { useToast } from '../../components/ui/Toast';
import { cx } from '../../components/ui/cx';
import { api } from '../../lib/api-client';
import { LANGUAGES, LANGUAGE_NAME, type HotelBranding, type Language } from '../../lib/api-types';
import { apiAssetUrl } from '../../lib/config';
import { contrastRatio, isHexColor } from '../../lib/contrast';
import { describeError } from '../../lib/error-handler';
import { initialsOf } from '../../lib/format';
import { queryKeys } from '../../lib/query-keys';
import { useCurrentUser } from '../auth/AuthProvider';
import { useBranding } from '../hotel/useBranding';

const BRAND_PRESETS = ['#1B2A3A', '#0F4C45', '#5B1F2E', '#2B2B2B', '#1E3A8A'];
const ACCENT_PRESETS = ['#B8862F', '#B4442F', '#2F7A5B', '#5B4B9A', '#C06A1B'];
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_LOGO_BYTES = 256 * 1024;

interface Draft {
  brandColor: string;
  accentColor: string;
  welcomeHeadline: Partial<Record<Language, string>>;
  languages: Language[];
}

export function BrandingPanel() {
  const { hotelId } = useCurrentUser();
  const branding = useBranding();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!branding.data) return;
    const { brandColor, accentColor, welcomeHeadline, languages } = branding.data;
    setDraft({ brandColor, accentColor, welcomeHeadline, languages });
  }, [branding.data]);

  const store = (updated: HotelBranding) => queryClient.setQueryData(queryKeys.branding(hotelId), updated);
  const save = useMutation({
    mutationFn: (changes: Draft) => api.patch<HotelBranding>('/hotel/branding', changes),
    onSuccess: (updated) => {
      store(updated);
      toast.show('Guest page branding saved');
    },
  });
  const uploadLogo = useMutation({
    mutationFn: (logo: { contentType: string; data: string }) => api.put<HotelBranding>('/hotel/logo', logo),
    onSuccess: (updated) => {
      store(updated);
      toast.show('Logo updated');
    },
    onError: (error) => toast.error(describeError(error)),
  });
  const removeLogo = useMutation({
    mutationFn: () => api.delete<HotelBranding>('/hotel/logo'),
    onSuccess: store,
    onError: (error) => toast.error(describeError(error)),
  });

  if (!draft || !branding.data) {
    return (
      <Panel>
        {branding.error ? <ErrorState message={describeError(branding.error)} onRetry={() => void branding.refetch()} /> : <LoadingRows rows={4} />}
      </Panel>
    );
  }

  const saved = branding.data;
  const dirty =
    JSON.stringify(draft) !==
    JSON.stringify({ brandColor: saved.brandColor, accentColor: saved.accentColor, welcomeHeadline: saved.welcomeHeadline, languages: saved.languages });
  const brandValid = isHexColor(draft.brandColor);
  const accentValid = isHexColor(draft.accentColor);
  const lowContrast = brandValid && contrastRatio('#FFFFFF', draft.brandColor) < 4.5;

  function onLogoChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) return toast.error('Choose a PNG, JPEG, WebP or SVG file.');
    if (file.size > MAX_LOGO_BYTES) return toast.error('The logo must be 256 KB or smaller.');
    const reader = new FileReader();
    reader.onload = () => uploadLogo.mutate({ contentType: file.type, data: String(reader.result) });
    reader.readAsDataURL(file);
  }

  const toggleLanguage = (language: Language, on: boolean) =>
    setDraft({ ...draft, languages: on ? LANGUAGES.filter((l) => l === language || draft.languages.includes(l)) : draft.languages.filter((l) => l !== language) });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (draft && brandValid && accentValid) save.mutate(draft);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Panel>
        <PanelHeader title="Guest page branding and languages" description="How the page guests open from the room QR code looks." />
        <form onSubmit={submit} className="space-y-6 p-5">
          <div className="space-y-1.5">
            <p className="text-[13px] font-medium text-ink">Logo</p>
            <div className="flex items-center gap-3 rounded-md border border-line px-3 py-2.5">
              <LogoMark branding={saved} brandColor={draft.brandColor} />
              <p className="flex-1 text-xs text-ink-3">{saved.logoUrl ? 'Shown at the top of the guest page.' : 'No logo yet: guests see the hotel initials.'}</p>
              <input ref={fileInput} type="file" accept={LOGO_TYPES.join(',')} className="sr-only" onChange={onLogoChosen} aria-label="Logo file" />
              {saved.logoUrl && (
                <Button size="sm" variant="ghost" onClick={() => removeLogo.mutate()} pending={removeLogo.isPending}>
                  Remove
                </Button>
              )}
              <Button size="sm" onClick={() => fileInput.current?.click()} pending={uploadLogo.isPending}>
                {saved.logoUrl ? 'Replace' : 'Upload'}
              </Button>
            </div>
            <p className="text-xs text-ink-3">PNG, JPEG, WebP or SVG, up to 256 KB. A square logo works best.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <ColorField label="Brand colour" value={draft.brandColor} presets={BRAND_PRESETS} onChange={(brandColor) => setDraft({ ...draft, brandColor })} />
            <ColorField label="Accent colour" value={draft.accentColor} presets={ACCENT_PRESETS} onChange={(accentColor) => setDraft({ ...draft, accentColor })} />
          </div>
          {lowContrast && (
            <p className="text-xs text-danger">White text on this brand colour is hard to read. Choose a darker colour.</p>
          )}

          <div className="space-y-2">
            <p className="text-[13px] font-medium text-ink">Languages guests can choose</p>
            <ul className="divide-y divide-line rounded-md border border-line">
              {LANGUAGES.map((language) => (
                <li key={language} className="flex items-center justify-between gap-4 px-3.5 py-2.5 text-[13px]">
                  <span className="text-ink">
                    {LANGUAGE_NAME[language]}
                    {language === 'en' && <span className="ml-1.5 text-xs text-ink-3">(default)</span>}
                  </span>
                  <Switch
                    checked={draft.languages.includes(language)}
                    onChange={(on) => toggleLanguage(language, on)}
                    disabled={language === 'en'}
                    label={`${LANGUAGE_NAME[language]} on`}
                  />
                </li>
              ))}
            </ul>
            <p className="text-xs text-ink-3">Translate menu items on the Menu page. Untranslated items show in English.</p>
          </div>

          <div className="space-y-3">
            <p className="text-[13px] font-medium text-ink">Welcome headline</p>
            {draft.languages.map((language) => (
              <Field key={language} label={LANGUAGE_NAME[language]} hint={language === 'en' ? '{room} becomes the guest’s room number.' : undefined}>
                <Input
                  dir={language === 'ar' ? 'rtl' : undefined}
                  value={draft.welcomeHeadline[language] ?? ''}
                  maxLength={80}
                  placeholder={language === 'en' ? 'Welcome to Room {room}' : 'Uses English if left empty'}
                  onChange={(event) => setDraft({ ...draft, welcomeHeadline: { ...draft.welcomeHeadline, [language]: event.target.value } })}
                />
              </Field>
            ))}
          </div>

          <FormError>{save.error ? describeError(save.error) : null}</FormError>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button
              disabled={!dirty || save.isPending}
              onClick={() =>
                setDraft({ brandColor: saved.brandColor, accentColor: saved.accentColor, welcomeHeadline: saved.welcomeHeadline, languages: saved.languages })
              }
            >
              Discard changes
            </Button>
            <Button variant="primary" type="submit" pending={save.isPending} disabled={!dirty || !brandValid || !accentValid}>
              Save
            </Button>
          </div>
        </form>
      </Panel>

      <Panel className="self-start">
        <PanelHeader title="Preview" description="Room 101, in English" />
        <div className="p-5">
          <GuestPreview branding={saved} draft={draft} />
        </div>
      </Panel>
    </div>
  );
}

function ColorField({ label, value, presets, onChange }: { label: string; value: string; presets: string[]; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium text-ink">{label}</p>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`${label} presets`}>
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-label={preset}
            aria-pressed={value.toUpperCase() === preset}
            onClick={() => onChange(preset)}
            className={cx('h-7 w-7 rounded border', value.toUpperCase() === preset ? 'border-ink ring-2 ring-ink ring-offset-2' : 'border-line-strong')}
            style={{ backgroundColor: preset }}
          />
        ))}
        <Input
          aria-label={`${label} hex`}
          value={value}
          maxLength={7}
          onChange={(event) => onChange(event.target.value.startsWith('#') ? event.target.value : `#${event.target.value}`)}
          className="w-28 font-mono uppercase"
          aria-invalid={!isHexColor(value) || undefined}
        />
      </div>
    </div>
  );
}

function LogoMark({ branding, brandColor, size = 'md' }: { branding: HotelBranding; brandColor: string; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-10 w-10 text-sm' : 'h-9 w-9 text-xs';
  if (branding.logoUrl) {
    return <img src={apiAssetUrl(branding.logoUrl)} alt={`${branding.hotelName} logo`} className={cx(box, 'rounded object-contain')} />;
  }
  return (
    <span aria-hidden="true" className={cx(box, 'flex shrink-0 items-center justify-center rounded font-semibold text-white')} style={{ backgroundColor: isHexColor(brandColor) ? brandColor : '#1B2A3A' }}>
      {initialsOf(branding.hotelName)}
    </span>
  );
}

/** A small, static picture of the guest welcome screen with the unsaved choices applied. */
function GuestPreview({ branding, draft }: { branding: HotelBranding; draft: Draft }) {
  const brand = isHexColor(draft.brandColor) ? draft.brandColor : branding.brandColor;
  const accent = isHexColor(draft.accentColor) ? draft.accentColor : branding.accentColor;
  const headline = (draft.welcomeHeadline.en?.trim() || 'Welcome to Room {room}').replace('{room}', '101');
  return (
    <div aria-hidden="true" className="mx-auto max-w-[260px] overflow-hidden rounded-xl border border-line-strong bg-surface">
      <div className="px-4 pb-5 pt-4 text-white" style={{ backgroundColor: brand }}>
        <div className="flex items-center gap-2">
          <LogoMark branding={branding} brandColor={brand} />
          <span className="text-xs font-medium">{branding.hotelName}</span>
        </div>
        <p className="mt-5 text-lg font-semibold leading-snug">{headline}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        {['Room service', 'Amenities', 'My orders', 'Concierge'].map((tile) => (
          <div key={tile} className="rounded-md border border-line px-2.5 py-3 text-[11px] font-medium text-ink">
            {tile}
          </div>
        ))}
      </div>
      <div className="px-3 pb-3">
        <div className="rounded-md py-2 text-center text-[11px] font-medium text-white" style={{ backgroundColor: accent }}>
          Browse the menu
        </div>
      </div>
    </div>
  );
}
