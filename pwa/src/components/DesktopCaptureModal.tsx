import { useEffect, useRef, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useTheme } from '../context/ThemeContext'
import type { Bookmark, BookmarksData, Source } from '../types'
import hikaeLogo from '../assets/hikae-icon.png'

interface DesktopCaptureModalProps {
  initialUrl?: string
  initialMode?: 'link' | 'note'
  onClose: () => void
}

function domainFrom(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return '' }
}

function normalizeUrl(input: string): string {
  const s = input.trim()
  if (!s) return ''
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  return `https://${s}`
}

function detectSource(url: string, sources: Source[]): Source | null {
  const host = domainFrom(normalizeUrl(url))
  if (!host) return null
  return sources.find((s) => {
    try { return new URL(s.url).hostname.replace(/^www\./, '') === host }
    catch { return false }
  }) ?? null
}

export function DesktopCaptureModal({ initialUrl = '', initialMode = 'link', onClose }: DesktopCaptureModalProps) {
  const { data, save } = useData()
  const { isDark } = useTheme()
  const [mode, setMode] = useState<'link' | 'note'>(initialMode)
  const [url, setUrl] = useState(initialUrl)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [why, setWhy] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const urlRef = useRef<HTMLInputElement>(null)
  const noteTitleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === 'link') urlRef.current?.focus()
    else noteTitleRef.current?.focus()
  }, [mode])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleKeep()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [url, noteTitle, noteBody, why, selectedTagIds, mode])

  const detectedSource = data ? detectSource(url, data.sources) : null
  const urlHost = domainFrom(normalizeUrl(url))

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleKeep = async () => {
    if (!data) return
    if (mode === 'link' && !normalizeUrl(url)) return
    if (mode === 'note' && !noteTitle.trim() && !noteBody.trim()) return
    setSaving(true)
    setError(null)
    const now = new Date().toISOString()

    const newBookmark: Bookmark = mode === 'note'
      ? {
          id: crypto.randomUUID(),
          type: 'note',
          url: '',
          title: noteTitle.trim() || noteBody.trim().split('\n')[0].slice(0, 80),
          folder_id: null,
          tag_ids: [...selectedTagIds],
          source_id: null,
          note: noteBody.trim() || null,
          why: why.trim() || null,
          status: 'inbox',
          captured_at: now,
          captured_by: 'pwa',
          last_modified_at: now,
          last_modified_by: 'pwa',
          filed_at: null,
          read_at: null,
          archived_at: null,
          deleted_at: null,
        }
      : {
          id: crypto.randomUUID(),
          url: normalizeUrl(url),
          title: normalizeUrl(url),
          folder_id: null,
          tag_ids: [...selectedTagIds],
          source_id: detectedSource?.id ?? null,
          note: null,
          why: why.trim() || null,
          status: 'inbox',
          captured_at: now,
          captured_by: 'pwa',
          last_modified_at: now,
          last_modified_by: 'pwa',
          filed_at: null,
          read_at: null,
          archived_at: null,
          deleted_at: null,
        }
    const updated: BookmarksData = {
      ...data,
      meta: { ...data.meta, last_modified: now, last_modified_by: 'pwa' },
      bookmarks: [newBookmark, ...data.bookmarks],
    }
    try {
      await save(updated, mode === 'note' ? `Note: ${noteTitle.trim() || 'quick note'}` : `Capture: ${normalizeUrl(url)}`)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ background: isDark ? 'rgba(10,8,5,.55)' : 'rgba(40,30,15,.32)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-[520px] rounded-[16px] bg-surface-sheet shadow-[0_24px_64px_rgba(40,28,10,.22),0_0_0_1px_rgba(60,40,15,.06)] dark:bg-dk-card dark:shadow-[0_24px_64px_rgba(0,0,0,.5),0_0_0_1px_rgba(255,255,255,.04)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-hairline-faint px-5 py-4 dark:border-dk-divider">
          <img
            src={hikaeLogo}
            alt=""
            className="h-7 w-7 flex-shrink-0"
            style={{ borderRadius: '6.2px', boxShadow: '0 1px 2px rgba(80,55,20,.18)' }}
          />
          <div>
            <p className="font-serif text-[15px] font-semibold text-ink dark:text-dk-ink">Keep for later</p>
            <p className="font-mono text-[10.5px] text-ink-mono-faint dark:text-dk-ink-faint">⌘↵ to save · Esc to cancel</p>
          </div>
          {/* Mode tabs */}
          <div className="ml-auto flex items-center gap-1 rounded-[8px] bg-surface-sunken p-0.5 dark:bg-dk-chip-bg">
            {(['link', 'note'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="rounded-[6px] px-3 py-1 text-[12px] font-medium transition-colors"
                style={mode === m
                  ? isDark
                    ? { background: '#38322A', color: '#F0E9DB' }
                    : { background: '#fff', color: '#3A3226', boxShadow: '0 1px 2px rgba(60,40,15,.10)' }
                  : { color: '#8A8173' }
                }
              >
                {m === 'link' ? 'Link' : 'Note'}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="rounded-[6px] p-1.5 text-ink-3 hover:bg-hairline-faint dark:text-dk-ink-3 dark:hover:bg-dk-chip-bg">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-5 pt-4">
          {mode === 'link' ? (
            <>
              {/* URL */}
              <div className="rounded-[10px] border border-hairline bg-surface px-3.5 py-2.5 dark:border-dk-border dark:bg-[#221E19]">
                <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[.12em] text-ink-3 dark:text-dk-ink-3">Link</p>
                <input
                  ref={urlRef}
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://"
                  className="w-full bg-transparent font-mono text-[13px] text-ink outline-none placeholder:text-ink-3 dark:text-dk-ink dark:placeholder:text-dk-ink-3"
                />
              </div>

              {/* Source detection */}
              {urlHost && (
                <div className="mt-2 flex items-center gap-1.5 px-0.5">
                  {detectedSource ? (
                    <>
                      <Check className="h-3 w-3 text-sync-green dark:text-dk-green" />
                      <span className="text-[11.5px] text-ink-2 dark:text-dk-ink-2">
                        source auto-detected — <strong>{detectedSource.name}</strong>
                      </span>
                    </>
                  ) : (
                    <span className="text-[11.5px] text-ink-3 dark:text-dk-ink-3">
                      source: <span className="font-mono">{urlHost}</span> (no match)
                    </span>
                  )}
                </div>
              )}

              {/* Why */}
              <div className="mt-3 rounded-[10px] border border-hairline bg-surface dark:border-dk-border dark:bg-[#221E19]">
                <div className="flex gap-2.5 px-3.5 py-2.5">
                  <div className="mt-1 w-0.5 flex-shrink-0 self-stretch rounded-full bg-accent dark:bg-dk-accent" />
                  <div className="flex-1">
                    <p className="mb-1 font-serif text-[9.5px] uppercase tracking-[.16em] text-[#C68B7C] dark:text-[#D4907C]">
                      控 · why keep it?
                    </p>
                    <textarea
                      value={why}
                      onChange={(e) => setWhy(e.target.value)}
                      placeholder="What made you save this?"
                      rows={2}
                      className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-3 dark:text-dk-ink dark:placeholder:text-dk-ink-3"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Note title */}
              <div className="rounded-[10px] border border-hairline bg-surface px-3.5 py-2.5 dark:border-dk-border dark:bg-[#221E19]">
                <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[.12em] text-ink-3 dark:text-dk-ink-3">Title</p>
                <input
                  ref={noteTitleRef}
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Short headline…"
                  className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3 dark:text-dk-ink dark:placeholder:text-dk-ink-3"
                />
              </div>

              {/* Note body */}
              <div className="mt-3 rounded-[10px] border border-hairline bg-surface px-3.5 py-2.5 dark:border-dk-border dark:bg-[#221E19]">
                <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[.12em] text-ink-3 dark:text-dk-ink-3">Note</p>
                <textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Write something…"
                  rows={4}
                  className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-3 dark:text-dk-ink dark:placeholder:text-dk-ink-3"
                />
              </div>

              {/* Why */}
              <div className="mt-3 rounded-[10px] border border-hairline bg-surface dark:border-dk-border dark:bg-[#221E19]">
                <div className="flex gap-2.5 px-3.5 py-2.5">
                  <div className="mt-1 w-0.5 flex-shrink-0 self-stretch rounded-full bg-accent dark:bg-dk-accent" />
                  <div className="flex-1">
                    <p className="mb-1 font-serif text-[9.5px] uppercase tracking-[.16em] text-[#C68B7C] dark:text-[#D4907C]">
                      控 · context (optional)
                    </p>
                    <textarea
                      value={why}
                      onChange={(e) => setWhy(e.target.value)}
                      placeholder="Why write this down?"
                      rows={2}
                      className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-3 dark:text-dk-ink dark:placeholder:text-dk-ink-3"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Tags */}
          {data && data.tags.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-[.12em] text-ink-3 dark:text-dk-ink-3">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {data.tags.map((tag) => {
                  const active = selectedTagIds.has(tag.id)
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className="rounded-[6px] px-2.5 py-1 font-mono text-[11px] transition-colors"
                      style={
                        active
                          ? { background: isDark ? '#E2705A' : '#C13D2B', color: '#fff' }
                          : isDark
                          ? { background: '#322E26', color: '#8A8173', border: '1px solid #3C362D' }
                          : { background: '#F1ECE0', color: '#8A8173', border: '1px solid #E9E1D1' }
                      }
                    >
                      #{tag.name}
                    </button>
                  )
                })}
                <button className="flex items-center gap-1 rounded-[6px] border border-dashed border-hairline px-2.5 py-1 font-mono text-[11px] text-ink-3 dark:border-dk-border dark:text-dk-ink-3">
                  <Plus className="h-3 w-3" />
                  tag
                </button>
              </div>
            </div>
          )}

          {error && <p className="mt-3 text-[11.5px] text-red-600">{error}</p>}

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={onClose}
              className="flex h-9 flex-1 items-center justify-center rounded-[8px] border border-hairline-warm bg-surface-sunken text-[13px] font-medium text-ink-2 transition-colors hover:bg-sidebar dark:border-dk-border dark:bg-dk-surface-sunken dark:text-dk-ink-2 dark:hover:bg-dk-row-hover"
            >
              Cancel
            </button>
            <button
              onClick={handleKeep}
              disabled={mode === 'link' ? !url.trim() || saving : (!noteTitle.trim() && !noteBody.trim()) || saving}
              className="flex h-9 flex-[2] items-center justify-center rounded-[8px] bg-accent text-[13px] font-semibold text-white transition-colors hover:brightness-105 disabled:opacity-50 dark:bg-dk-accent"
            >
              {saving ? 'Saving…' : mode === 'note' ? 'Keep Note' : 'Keep in Inbox'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
