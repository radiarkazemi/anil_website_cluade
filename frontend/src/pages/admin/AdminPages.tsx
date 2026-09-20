import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/endpoints';
import { ContentBody } from '../../components/ContentBody';
import { useToast } from '../../store/toastStore';
import { faDate, faNum, readingMinutes } from '../../utils/format';
import { PageHeader } from './adminShared';
import type { ContentPage } from '../../types';

type FormState = Partial<ContentPage> & { _coverFile?: File | null };
type FilterTab = 'all' | 'blog' | 'page';

const emptyBlog: FormState = {
  title: '',
  slug: '',
  page_type: 'blog',
  excerpt: '',
  body: '',
  is_published: true,
  show_in_nav: false,
  order: 0,
  _coverFile: null,
};

const emptyPage: FormState = {
  ...emptyBlog,
  page_type: 'page',
  show_in_nav: true,
};

function unwrapList(data: unknown): ContentPage[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'results' in data) {
    return (data as { results: ContentPage[] }).results;
  }
  return [];
}

function slugifyFa(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180);
}

function insertAtCursor(
  textarea: HTMLTextAreaElement | null,
  value: string,
  snippet: string,
  setValue: (next: string) => void,
) {
  if (!textarea) {
    setValue(`${value}${value && !value.endsWith('\n') ? '\n' : ''}${snippet}`);
    return;
  }
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const next = value.slice(0, start) + snippet + value.slice(end);
  setValue(next);
  requestAnimationFrame(() => {
    textarea.focus();
    const pos = start + snippet.length;
    textarea.setSelectionRange(pos, pos);
  });
}

export function AdminPages() {
  const qc = useQueryClient();
  const toast = useToast((s) => s.show);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pages'],
    queryFn: () => api.adminPages().then((r) => unwrapList(r.data)),
  });
  const [form, setForm] = useState<FormState | null>(null);
  const [tab, setTab] = useState<FilterTab>('blog');
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState(true);
  const [slugTouched, setSlugTouched] = useState(false);
  const pages = data ?? [];

  useEffect(() => {
    if (!form || form.id || slugTouched) return;
    if (!form.title) return;
    setForm((f) => (f ? { ...f, slug: slugifyFa(f.title || '') } : f));
  }, [form?.title, form?.id, slugTouched]);

  const filtered = useMemo(() => {
    const q = query.trim();
    return pages.filter((p) => {
      if (tab !== 'all' && p.page_type !== tab) return false;
      if (!q) return true;
      return [p.title, p.slug, p.excerpt].some((x) => (x || '').includes(q));
    });
  }, [pages, tab, query]);

  const coverPreview = useMemo(() => {
    if (form?._coverFile) return URL.createObjectURL(form._coverFile);
    return form?.cover_url || null;
  }, [form?._coverFile, form?.cover_url]);

  useEffect(() => {
    if (!form?._coverFile || !coverPreview) return;
    return () => URL.revokeObjectURL(coverPreview);
  }, [form?._coverFile, coverPreview]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error('no form');
      const fd = new FormData();
      fd.append('title', form.title || '');
      fd.append('slug', form.slug || '');
      fd.append('page_type', form.page_type || 'page');
      fd.append('excerpt', form.excerpt || '');
      fd.append('body', form.body || '');
      fd.append('is_published', String(form.is_published !== false));
      fd.append('show_in_nav', String(!!form.show_in_nav));
      fd.append('order', String(Number(form.order || 0)));
      if (form._coverFile) fd.append('cover', form._coverFile);

      if (form.id) {
        return api.adminUpdatePage(form.id, fd as unknown as Partial<ContentPage>);
      }
      return api.adminCreatePage(fd as unknown as Partial<ContentPage>);
    },
    onSuccess: () => {
      toast('صفحه ذخیره شد');
      setForm(null);
      setSlugTouched(false);
      qc.invalidateQueries({ queryKey: ['admin-pages'] });
      qc.invalidateQueries({ queryKey: ['nav-pages'] });
      qc.invalidateQueries({ queryKey: ['blog-pages'] });
    },
    onError: (e: { response?: { data?: unknown } }) => {
      const d = e.response?.data;
      let msg = 'خطا در ذخیره صفحه';
      if (d && typeof d === 'object') {
        const detail = (d as { detail?: string }).detail;
        if (typeof detail === 'string') msg = detail;
        else {
          const first = Object.values(d as Record<string, unknown>)
            .flat()
            .map(String)[0];
          if (first) msg = first;
        }
      }
      toast(msg);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.adminDeletePage(id),
    onSuccess: () => {
      toast('حذف شد');
      qc.invalidateQueries({ queryKey: ['admin-pages'] });
      qc.invalidateQueries({ queryKey: ['nav-pages'] });
      qc.invalidateQueries({ queryKey: ['blog-pages'] });
    },
  });

  const openNew = (type: 'blog' | 'page') => {
    setSlugTouched(false);
    setPreview(true);
    setForm({
      ...(type === 'blog' ? emptyBlog : emptyPage),
      order: pages.length + 1,
    });
  };

  const openEdit = (p: ContentPage) => {
    setSlugTouched(true);
    setPreview(true);
    setForm({ ...p, _coverFile: null });
  };

  const bodyLen = (form?.body || '').length;
  const mins = readingMinutes(form?.body);

  return (
    <div>
      <PageHeader
        title="صفحات و بلاگ"
        subtitle="استودیوی محتوا — نوشته بلاگ با تصویر کاور، پیش‌نمایش زنده و ابزارهای ویرایش"
        actions={(
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="gold-btn" onClick={() => openNew('blog')}>
              + نوشته بلاگ
            </button>
            <button type="button" className="outline-btn" onClick={() => openNew('page')}>
              + صفحه راهنما
            </button>
            <Link to="/panel/blog-analytics" className="outline-btn">تحلیل بلاگ</Link>
          </div>
        )}
      />

      {form && (
        <div className="admin-blog-studio">
          <div className="admin-blog-studio-main">
            <div className="admin-card">
              <div className="admin-blog-studio-top">
                <h3>{form.id ? 'ویرایش محتوا' : form.page_type === 'blog' ? 'نوشته جدید بلاگ' : 'صفحه جدید'}</h3>
                <div className="admin-blog-studio-actions">
                  <button
                    type="button"
                    className={`outline-btn${preview ? ' is-active' : ''}`}
                    onClick={() => setPreview((v) => !v)}
                  >
                    {preview ? 'مخفی کردن پیش‌نمایش' : 'پیش‌نمایش'}
                  </button>
                  <button type="button" className="gold-btn" disabled={save.isPending} onClick={() => save.mutate()}>
                    {save.isPending ? 'در حال ذخیره…' : 'ذخیره'}
                  </button>
                  <button
                    type="button"
                    className="outline-btn"
                    onClick={() => {
                      setForm(null);
                      setSlugTouched(false);
                    }}
                  >
                    انصراف
                  </button>
                </div>
              </div>

              <div className="form-grid">
                <label className="full">
                  <span>عنوان</span>
                  <input
                    className="input"
                    value={form.title || ''}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="عنوان جذاب برای نوشته"
                  />
                </label>
                <label>
                  <span>اسلاگ (آدرس)</span>
                  <input
                    className="input"
                    dir="ltr"
                    value={form.slug || ''}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setForm({ ...form, slug: e.target.value });
                    }}
                    placeholder="slug-example"
                  />
                </label>
                <label>
                  <span>نوع</span>
                  <select
                    className="input"
                    value={form.page_type || 'page'}
                    onChange={(e) => setForm({ ...form, page_type: e.target.value as 'page' | 'blog' })}
                  >
                    <option value="blog">بلاگ</option>
                    <option value="page">صفحه راهنما</option>
                  </select>
                </label>
                <label>
                  <span>ترتیب</span>
                  <input
                    className="input"
                    type="number"
                    value={form.order ?? 0}
                    onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                  />
                </label>
                <label className="full">
                  <span>خلاصه (نمایش در لیست بلاگ)</span>
                  <input
                    className="input"
                    value={form.excerpt || ''}
                    maxLength={300}
                    onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                    placeholder="یک یا دو جمله برای جذب خواننده"
                  />
                  <small className="admin-field-hint">{faNum((form.excerpt || '').length)} / ۳۰۰</small>
                </label>
              </div>

              <div className="admin-cover-block">
                <div className="admin-cover-head">
                  <span>تصویر کاور</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="outline-btn"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => coverInputRef.current?.click()}
                    >
                      انتخاب تصویر
                    </button>
                    {(coverPreview || form._coverFile) && (
                      <button
                        type="button"
                        className="outline-btn"
                        style={{ padding: '6px 12px', fontSize: 12, color: 'var(--down)' }}
                        onClick={() => setForm({ ...form, _coverFile: null, cover_url: null, cover: null })}
                      >
                        حذف کاور
                      </button>
                    )}
                  </div>
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setForm({ ...form, _coverFile: file });
                    e.target.value = '';
                  }}
                />
                <div
                  className="admin-cover-drop"
                  onClick={() => coverInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') coverInputRef.current?.click();
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {coverPreview ? (
                    <img src={coverPreview} alt="کاور" />
                  ) : (
                    <div className="admin-cover-placeholder">
                      <strong>کاور را اینجا رها کنید یا کلیک کنید</strong>
                      <span>نسبت پیشنهادی ۱۶:۹ · JPG/PNG/WebP</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-editor-toolbar">
                <button
                  type="button"
                  onClick={() =>
                    insertAtCursor(bodyRef.current, form.body || '', '\n## عنوان بخش\n', (body) =>
                      setForm({ ...form, body }),
                    )
                  }
                >
                  عنوان
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertAtCursor(bodyRef.current, form.body || '', '\n### زیرعنوان\n', (body) =>
                      setForm({ ...form, body }),
                    )
                  }
                >
                  زیرعنوان
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertAtCursor(bodyRef.current, form.body || '', '\n- مورد فهرست\n', (body) =>
                      setForm({ ...form, body }),
                    )
                  }
                >
                  فهرست
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertAtCursor(bodyRef.current, form.body || '', '\n> نقل‌قول\n', (body) =>
                      setForm({ ...form, body }),
                    )
                  }
                >
                  نقل‌قول
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertAtCursor(bodyRef.current, form.body || '', '**متن پررنگ**', (body) =>
                      setForm({ ...form, body }),
                    )
                  }
                >
                  پررنگ
                </button>
                <span className="admin-editor-stats">
                  {faNum(bodyLen)} کاراکتر · حدود {faNum(mins)} دقیقه مطالعه
                </span>
              </div>

              <label className="full" style={{ display: 'block' }}>
                <span style={{ display: 'block', marginBottom: 8 }}>متن اصلی</span>
                <textarea
                  ref={bodyRef}
                  className="input admin-blog-textarea"
                  rows={14}
                  value={form.body || ''}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder={'هر پاراگراف در یک خط.\nبرای عنوان بنویسید: ## عنوان\nبرای فهرست: - مورد'}
                />
              </label>

              <div className="admin-blog-flags">
                <label className="layout-toggle">
                  <input
                    type="checkbox"
                    checked={form.is_published !== false}
                    onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  />
                  منتشر شده
                </label>
                <label className="layout-toggle">
                  <input
                    type="checkbox"
                    checked={!!form.show_in_nav}
                    onChange={(e) => setForm({ ...form, show_in_nav: e.target.checked })}
                  />
                  نمایش در منوی سایت
                </label>
              </div>
            </div>
          </div>

          {preview && (
            <aside className="admin-blog-preview admin-card">
              <div className="admin-blog-preview-label">پیش‌نمایش زنده</div>
              {coverPreview && (
                <div className="admin-blog-preview-cover">
                  <img src={coverPreview} alt="" />
                </div>
              )}
              <p className="blog-kicker">{form.page_type === 'blog' ? 'بلاگ آنیل' : 'راهنما'}</p>
              <h2>{form.title || 'عنوان نوشته'}</h2>
              {form.excerpt && <p className="admin-blog-preview-excerpt">{form.excerpt}</p>}
              <ContentBody body={form.body || 'متن نوشته اینجا نمایش داده می‌شود…'} />
              {form.slug && form.page_type === 'blog' && form.is_published !== false && (
                <Link className="text-link" to={`/blog/${form.slug}`} target="_blank" rel="noreferrer">
                  مشاهده در سایت ↗
                </Link>
              )}
              {form.share_code && (
                <div className="admin-share-box">
                  <div className="admin-share-box-label">لینک کوتاه برای اینستاگرام / تلگرام / واتساپ</div>
                  <div className="admin-share-box-row">
                    <code>{`https://goldanil.ir/b/${form.share_code}`}</code>
                    <button
                      type="button"
                      className="gold-btn"
                      style={{ padding: '6px 14px', fontSize: 12 }}
                      onClick={async () => {
                        const link = `https://goldanil.ir/b/${form.share_code}`;
                        try {
                          await navigator.clipboard.writeText(link);
                          toast('لینک کوتاه کپی شد');
                        } catch {
                          toast(link);
                        }
                      }}
                    >
                      کپی لینک کوتاه
                    </button>
                    <a
                      className="outline-btn"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      href={`https://wa.me/?text=${encodeURIComponent(`${form.title || ''}\nhttps://goldanil.ir/b/${form.share_code}`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      واتساپ
                    </a>
                    <a
                      className="outline-btn"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      href={`https://t.me/share/url?url=${encodeURIComponent(`https://goldanil.ir/b/${form.share_code}`)}&text=${encodeURIComponent(form.title || '')}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      تلگرام
                    </a>
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>
      )}

      <div className="admin-card" style={{ marginBottom: 14 }}>
        <div className="admin-blog-filters">
          {([
            ['blog', 'بلاگ'],
            ['page', 'صفحات'],
            ['all', 'همه'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`outline-btn${tab === key ? ' is-active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
          <input
            className="input"
            style={{ flex: 1, minWidth: 160 }}
            placeholder="جستجو در عنوان یا اسلاگ…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-card">
        {isLoading ? (
          '…'
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>کاور</th>
                <th>عنوان</th>
                <th>نوع</th>
                <th>اسلاگ</th>
                <th>لینک کوتاه</th>
                <th>تاریخ</th>
                <th>منو</th>
                <th>وضعیت</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.cover_url ? (
                      <img src={p.cover_url} alt="" className="admin-page-thumb" />
                    ) : (
                      <span className="admin-page-thumb empty" />
                    )}
                  </td>
                  <td>
                    <strong>{p.title}</strong>
                    {p.excerpt && (
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, maxWidth: 280 }}>
                        {p.excerpt.slice(0, 80)}
                        {p.excerpt.length > 80 ? '…' : ''}
                      </div>
                    )}
                  </td>
                  <td>{p.page_type === 'blog' ? 'بلاگ' : 'صفحه'}</td>
                  <td dir="ltr" style={{ fontSize: 12 }}>{p.slug}</td>
                  <td>
                    {p.share_code ? (
                      <button
                        type="button"
                        className="gold-btn"
                        style={{ padding: '4px 10px', fontSize: 11 }}
                        title={`کپی https://goldanil.ir/b/${p.share_code}`}
                        onClick={async () => {
                          const link = `https://goldanil.ir/b/${p.share_code}`;
                          try {
                            await navigator.clipboard.writeText(link);
                            toast('لینک کوتاه کپی شد');
                          } catch {
                            toast(link);
                          }
                        }}
                      >
                        goldanil.ir/b/{p.share_code}
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{faDate(p.created_at)}</td>
                  <td>{p.show_in_nav ? 'بله' : '—'}</td>
                  <td>
                    <span className={`admin-status-pill${p.is_published === false ? ' draft' : ''}`}>
                      {p.is_published === false ? 'پیش‌نویس' : 'منتشر'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="outline-btn"
                      style={{ padding: '6px 12px', fontSize: 12, marginLeft: 6 }}
                      onClick={() => openEdit(p)}
                    >
                      ویرایش
                    </button>
                    {p.page_type === 'blog' && p.is_published !== false && (
                      <Link
                        to={`/blog/${p.slug}`}
                        className="outline-btn"
                        style={{ padding: '6px 12px', fontSize: 12, marginLeft: 6, display: 'inline-block' }}
                        target="_blank"
                        rel="noreferrer"
                      >
                        مشاهده
                      </Link>
                    )}
                    <button
                      type="button"
                      className="outline-btn"
                      style={{ padding: '6px 12px', fontSize: 12, color: 'var(--down)' }}
                      onClick={() => {
                        if (window.confirm(`حذف «${p.title}»؟`)) remove.mutate(p.id);
                      }}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 28, color: 'var(--text-dim)' }}>
                    موردی یافت نشد — یک نوشته بلاگ جدید بسازید.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
