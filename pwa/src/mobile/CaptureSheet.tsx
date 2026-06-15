import { useEffect, useRef, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { useData } from '../context/DataContext'
import type { Bookmark, BookmarksData, Source } from '../types'
import hikaeLogo from '../assets/hikae-icon.png'

interface CaptureSheetProps {
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

export function CaptureSheet({ onClose }: CaptureSheetProps) {
  const { data, save } = useData()
  const [visible, setVisible] = useState(false)
  const [url, setUrl] = useState('')
  const [why, setWhy] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const urlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    urlRef.current?.focus()
  }, [])

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

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  const handleKeep = async () => {
    const normalized = normalizeUrl(url)
    if (!normalized || !data) return
    setSaving(true)
    setError(null)
    const now = new Date().toISOString()
    const newBookmark: Bookmark = {
      id: crypto.randomUUID(),
      url: normalized,
      title: normalized,
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
      await save(updated, `Capture: ${normalized}`)
      handleClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: 'rgba(40,30,15,.32)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 280ms',
        }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-surface-sheet"
        style={{
          borderRadius: '26px 26px 0 0',
          boxShadow: '0 -12px 40px rgba(40,28,10,.28)',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 280ms cubic-bezier(.4,0,.2,1)',
        }}
      >
        {/* Grabber */}
        <div className="flex justify-center pt-3">
          <div className="h-[5px] w-10 rounded-full bg-hairline" />
        </div>

        <div className="px-5 pb-[40px] pt-4">
          {/* Header */}
          <div className="mb-5 flex items-center gap-3">
            <img
              src={hikaeLogo}
              alt=""
              className="h-[30px] w-[30px]"
              style={{ borderRadius: '6.7px', boxShadow: '0 1px 2px rgba(80,55,20,.18)' }}
            />
            <div>
              <p className="font-serif text-[17px] font-semibold text-ink">Keep for later</p>
              <p className="font-mono text-[11px] text-ink-mono-faint">writes to maparker/hikae-data</p>
            </div>
            <button onClick={handleClose} className="ml-auto rounded-full p-1.5 text-ink-3 hover:bg-hairline">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* URL field */}
          <div className="rounded-[13px] border border-hairline bg-surface px-4 py-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[.1em] text-ink-3">Link</p>
            <input
              ref={urlRef}
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              className="w-full bg-transparent font-mono text-[14px] text-ink outline-none placeholder:text-ink-3"
            />
          </div>

          {/* Source detection */}
          {urlHost && (
            <div className="mt-2 flex items-center gap-2 px-1">
              {detectedSource ? (
                <>
                  <Check className="h-3.5 w-3.5 text-sync-green" />
                  <span className="text-[12px] text-ink-2">
                    source auto-detected — <strong>{detectedSource.name}</strong>
                  </span>
                </>
              ) : (
                <span className="text-[12px] text-ink-3">
                  source: <span className="font-mono">{urlHost}</span> (no match)
                </span>
              )}
            </div>
          )}

          {/* Why field */}
          <div className="mt-4 rounded-[13px] border border-hairline bg-surface">
            <div className="flex gap-3 px-4 py-3">
              <div className="mt-1.5 w-[3px] flex-shrink-0 self-stretch rounded-full bg-accent" />
              <div className="flex-1">
                <p className="mb-1 font-serif text-[11px] uppercase tracking-[.16em]" style={{ color: '#C68B7C' }}>
                  控 · why keep it?
                </p>
                <textarea
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                  placeholder="What made you save this?"
                  rows={3}
                  className="w-full resize-none bg-transparent text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink-3"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          {data && data.tags.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.1em] text-ink-3">Tags</p>
              <div className="flex flex-wrap gap-2">
                {data.tags.map((tag) => {
                  const active = selectedTagIds.has(tag.id)
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className="rounded-[8px] px-3 py-1.5 font-mono text-[12px] transition-colors"
                      style={
                        active
                          ? { background: '#C13D2B', color: '#fff' }
                          : { background: '#F1ECE0', color: '#8A8173', border: '1px solid #E9E1D1' }
                      }
                    >
                      #{tag.name}
                    </button>
                  )
                })}
                <button className="flex items-center gap-1 rounded-[8px] border border-dashed border-hairline px-3 py-1.5 font-mono text-[12px] text-ink-3">
                  <Plus className="h-3 w-3" />
                  tag
                </button>
              </div>
            </div>
          )}

          {error && <p className="mt-3 text-[12px] text-red-600">{error}</p>}

          {/* Keep button */}
          <button
            onClick={handleKeep}
            disabled={!url.trim() || saving}
            className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-[13px] bg-accent text-[15px] font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Keep in Inbox'}
          </button>
        </div>
      </div>
    </>
  )
}
