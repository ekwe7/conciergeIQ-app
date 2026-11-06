import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { Field, FormError, Input, Textarea } from '../components/ui/Field';
import { Overlay } from '../components/ui/Overlay';
import { EmptyState, ErrorState, LoadingRows, PageHeader, Panel } from '../components/ui/Page';
import { StatusLabel } from '../components/ui/Status';
import { Switch } from '../components/ui/Switch';
import { useToast } from '../components/ui/Toast';
import { useCurrentUser } from '../features/auth/AuthProvider';
import { useHotelLocale } from '../features/hotel/useHotel';
import { api } from '../lib/api-client';
import type { KnowledgeArticle } from '../lib/api-types';
import { describeError } from '../lib/error-handler';
import { formatDateTime } from '../lib/format';
import { queryKeys } from '../lib/query-keys';

const SUGGESTED = ['Wi-Fi', 'Breakfast and dining hours', 'Check-out time', 'Pool and gym', 'Airport transfer', 'Laundry'];

export function ConciergePage() {
  const { hotelId } = useCurrentUser();
  const { timeZone } = useHotelLocale();
  const [editing, setEditing] = useState<KnowledgeArticle | 'new' | null>(null);
  const articles = useQuery({
    queryKey: queryKeys.articles(hotelId),
    queryFn: ({ signal }) => api.get<{ enabled: boolean; articles: KnowledgeArticle[] }>('/concierge/articles', { signal }),
  });

  return (
    <>
      <PageHeader
        title="Concierge answers"
        description="The AI concierge answers guests only from what is written here, and names the article it used. It can draft orders, but guests always confirm them."
        actions={
          <Button variant="primary" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Add article
          </Button>
        }
      />

      {articles.data && !articles.data.enabled && (
        <p role="status" className="mb-5 rounded-md border border-notice-line bg-notice px-4 py-2.5 text-[13px] text-ink-2">
          The AI concierge is switched off on the server, so guests are asked to call the desk. You can still prepare articles.
        </p>
      )}

      <Panel>
        {articles.isPending && <LoadingRows rows={4} label="Loading articles" />}
        {articles.error && <ErrorState message={describeError(articles.error)} onRetry={() => void articles.refetch()} />}
        {articles.data?.articles.length === 0 && (
          <EmptyState title="Nothing written yet" action={<Button variant="primary" onClick={() => setEditing('new')}>Write the first article</Button>}>
            Start with what guests ask the desk most: {SUGGESTED.slice(0, 4).join(', ').toLowerCase()}.
          </EmptyState>
        )}
        {articles.data && articles.data.articles.length > 0 && (
          <ul className="divide-y divide-line">
            {articles.data.articles.map((article) => (
              <li key={article.id}>
                <button type="button" onClick={() => setEditing(article)} className="block w-full px-4 py-3 text-left hover:bg-canvas">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[13px] font-medium text-ink">{article.title}</p>
                    {article.isPublished ? <StatusLabel tone="done">Published</StatusLabel> : <StatusLabel tone="neutral">Draft</StatusLabel>}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-2">{article.body}</p>
                  <p className="mt-1 text-xs text-ink-3">
                    Updated by {article.updatedBy}, {formatDateTime(article.updatedAt, timeZone)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ArticleDialog article={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function ArticleDialog({ article, onClose }: { article: KnowledgeArticle | 'new' | null; onClose: () => void }) {
  const { hotelId } = useCurrentUser();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const existing = article && article !== 'new' ? article : null;

  const refresh = () => void queryClient.invalidateQueries({ queryKey: queryKeys.articles(hotelId) });
  const save = useMutation({
    mutationFn: (input: { title: string; body: string; isPublished: boolean }) =>
      existing ? api.put<KnowledgeArticle>(`/concierge/articles/${existing.id}`, input) : api.post<KnowledgeArticle>('/concierge/articles', input),
    onSuccess: (saved) => {
      refresh();
      toast.show(`${saved.title} saved`);
      onClose();
    },
  });
  const remove = useMutation({
    mutationFn: (articleId: string) => api.delete<void>(`/concierge/articles/${articleId}`),
    onSuccess: () => {
      refresh();
      toast.show('Article removed');
      onClose();
    },
  });

  useEffect(() => {
    if (!article) return;
    setTitle(existing?.title ?? '');
    setBody(existing?.body ?? '');
    setIsPublished(existing?.isPublished ?? true);
    setConfirmDelete(false);
    save.reset();
    remove.reset();
  }, [article]);

  if (!article) return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (title.trim() && body.trim()) save.mutate({ title: title.trim(), body: body.trim(), isPublished });
  }

  return (
    <Overlay
      open
      onClose={onClose}
      width="lg"
      title={existing ? `Edit ${existing.title}` : 'Add article'}
      description="Write it the way the desk would answer. Include exact times, prices and names."
      footer={
        <>
          {existing &&
            (confirmDelete ? (
              <Button variant="danger" className="mr-auto" pending={remove.isPending} onClick={() => remove.mutate(existing.id)}>
                Confirm remove
              </Button>
            ) : (
              <Button variant="danger-quiet" className="mr-auto" onClick={() => setConfirmDelete(true)}>
                Remove
              </Button>
            ))}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="article" pending={save.isPending} disabled={!title.trim() || !body.trim()}>
            Save
          </Button>
        </>
      }
    >
      <form id="article" onSubmit={submit} className="space-y-4">
        <Field label="Title">
          <Input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="Wi-Fi" data-autofocus />
        </Field>
        <Field label="Answer" hint={`${body.length} / 4000 characters`}>
          <Textarea
            rows={8}
            value={body}
            maxLength={4000}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Network: AzureBay-Guest. Password: sunrise2026. Ask the desk if it does not connect."
          />
        </Field>
        <div className="flex items-center justify-between gap-4 rounded-md border border-line px-3.5 py-3">
          <div>
            <p className="text-[13px] font-medium text-ink">Published</p>
            <p className="text-xs text-ink-3">Drafts are saved but not used to answer guests.</p>
          </div>
          <Switch checked={isPublished} onChange={setIsPublished} label="Published" />
        </div>
        <FormError>{save.error ? describeError(save.error) : remove.error ? describeError(remove.error) : null}</FormError>
      </form>
    </Overlay>
  );
}
