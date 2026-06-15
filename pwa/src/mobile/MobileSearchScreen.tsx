import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { SwipeableCard } from './SwipeableCard'
import { useData } from '../context/DataContext'

interface MobileSearchScreenProps {
  onSelectBookmark: (id: string) => void
}

export function MobileSearchScreen({ onSelectBookmark }: MobileSearchScreenProps) {
  const { data } = useData()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return (data?.bookmarks ?? [])
      .filter((b) => {
        if (b.status === 'deleted') return false
        if (b.title.toLowerCase().includes(q)) return true
        const source = data?.sources.find((s) => s.id === b.source_id)
        if (source?.name.toLowerCase().includes(q)) return true
        const tags = data?.tags.filter((t) => b.tag_ids.includes(t.id)) ?? []
        if (tags.some((t) => t.name.toLowerCase().includes(q))) return true
        try {
          if (new URL(b.url).hostname.includes(q)) return true
        } catch { /* ignore */ }
        return false
      })
      .sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime())
  }, [data, query])

  const recentTags = useMemo(() => {
    const tagCounts = new Map<string, number>()
    data?.bookmarks.forEach((b) => {
      b.tag_ids.forEach((id) => tagCounts.set(id, (tagCounts.get(id) ?? 0) + 1))
    })
    return (data?.tags ?? [])
      .filter((t) => (tagCounts.get(t.id) ?? 0) > 0)
      .sort((a, b) => (tagCounts.get(b.id) ?? 0) - (tagCounts.get(a.id) ?? 0))
      .slice(0, 8)
  }, [data])

  return (
    <div className="flex h-full flex-col bg-canvas-mobile dark:bg-dk-bg">
      <div className="px-5 pb-3 pt-[54px]">
        <h1 className="font-serif text-[32px] font-semibold text-ink dark:text-dk-ink">Search</h1>
        {query && results.length > 0 && (
          <p className="mt-0.5 font-mono text-[12.5px] text-ink-3 dark:text-dk-ink-3">
            {results.length} {results.length === 1 ? 'match' : 'matches'}
          </p>
        )}
      </div>

      {/* Search field */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 rounded-[13px] border border-hairline bg-surface px-4 py-3 dark:border-dk-border dark:bg-dk-card">
          <Search className="h-4 w-4 flex-shrink-0 text-ink-3 dark:text-dk-ink-3" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bookmarks…"
            autoFocus
            className="flex-1 bg-transparent font-mono text-[14px] text-ink outline-none placeholder:text-ink-3 dark:text-dk-ink dark:placeholder:text-dk-ink-3"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-ink-3 dark:text-dk-ink-3">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-[160px]">
        {/* Results */}
        {query && (
          <div className="flex flex-col gap-[13px]">
            {results.length === 0 && (
              <p className="mt-6 text-center text-[14px] text-ink-3 dark:text-dk-ink-3">
                No results for "{query}"
              </p>
            )}
            {results.map((b) => (
              <SwipeableCard key={b.id} bookmark={b} onTap={() => onSelectBookmark(b.id)} />
            ))}
          </div>
        )}

        {/* Recent tags */}
        {!query && recentTags.length > 0 && (
          <div>
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[.1em] text-ink-3 dark:text-dk-ink-3">
              Recent
            </p>
            <div className="flex flex-wrap gap-2">
              {recentTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setQuery(tag.name)}
                  className="rounded-[8px] border border-hairline-card bg-chip-bg px-3 py-1.5 font-mono text-[13px] text-ink-mono dark:border-dk-chip-border dark:bg-dk-chip-bg dark:text-dk-ink-3"
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
