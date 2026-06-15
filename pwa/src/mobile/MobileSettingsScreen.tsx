import { ChevronRight, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useTheme, type Theme } from '../context/ThemeContext'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const CAPTURE_SURFACES = [
  { badge: 'iOS', label: 'iOS Shortcut', status: 'connected' as const },
  { badge: '⌘', label: 'macOS App', status: 'connected' as const },
  { badge: 'R', label: 'Raycast', status: 'setup' as const },
  { badge: '◉', label: 'Web', status: 'connected' as const },
]

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' },
]

function GroupCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-hairline-card bg-surface dark:border-dk-border dark:bg-dk-card">
      {children}
    </div>
  )
}

function Row({
  label,
  value,
  accent,
  children,
  last,
}: {
  label: string
  value?: string
  accent?: boolean
  children?: React.ReactNode
  last?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 ${
        !last ? 'border-b border-hairline-faint dark:border-dk-divider' : ''
      }`}
    >
      <span
        className={`flex-1 text-[15px] ${accent ? 'font-medium text-accent' : 'text-ink-title dark:text-dk-ink'}`}
      >
        {label}
      </span>
      {value && (
        <span className="font-mono text-[12px] text-ink-mono dark:text-dk-ink-3">{value}</span>
      )}
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[.1em] text-ink-3 dark:text-dk-ink-3">
      {children}
    </p>
  )
}

export function MobileSettingsScreen() {
  const { user, avatarUrl, signOut } = useAuth()
  const { data, loading, lastFetched, refresh } = useData()
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex h-full flex-col bg-canvas-mobile dark:bg-dk-bg">
      <div className="px-5 pb-3 pt-[54px]">
        <h1 className="font-serif text-[32px] font-semibold text-ink dark:text-dk-ink">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-[160px]">
        <div className="flex flex-col gap-5">
          {/* Account */}
          <div>
            <SectionLabel>Account</SectionLabel>
            <GroupCard>
              <div className="flex items-center gap-3 px-4 py-3.5">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-11 w-11 flex-shrink-0 rounded-full" />
                ) : (
                  <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[16px] font-medium text-white"
                    style={{ background: 'linear-gradient(135deg, #C9BDA2, #9C8F73)' }}
                  >
                    {(user ?? 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-[15px] font-medium text-ink-title dark:text-dk-ink">{user}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-sync-green dark:bg-dk-green" />
                    <span className="text-[12px] text-ink-3 dark:text-dk-ink-3">GitHub connected</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-chevron" />
              </div>
            </GroupCard>
          </div>

          {/* Data */}
          <div>
            <SectionLabel>Data</SectionLabel>
            <GroupCard>
              <Row label="Repository" value={`${user}/hikae-data`} />
              <Row label="Data last modified" value={data?.meta.last_modified ? timeAgo(data.meta.last_modified) : '—'} />
              <Row label="Last fetched" last>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-ink-mono dark:text-dk-ink-3">
                    {lastFetched ? timeAgo(lastFetched.toISOString()) : '—'}
                  </span>
                  <button
                    onClick={() => refresh()}
                    disabled={loading}
                    className="rounded-full p-1.5 text-ink-3 active:bg-hairline disabled:opacity-40"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </Row>
            </GroupCard>
          </div>

          {/* Capture surfaces */}
          <div>
            <SectionLabel>Capture Surfaces</SectionLabel>
            <GroupCard>
              {CAPTURE_SURFACES.map(({ badge, label, status }, i) => (
                <div
                  key={label}
                  className={`flex items-center gap-3 px-4 py-3.5 ${
                    i < CAPTURE_SURFACES.length - 1 ? 'border-b border-hairline-faint dark:border-dk-divider' : ''
                  }`}
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px] bg-chip-bg dark:bg-dk-chip-bg">
                    <span className="font-mono text-[12px] font-medium text-ink-2 dark:text-dk-ink-2">{badge}</span>
                  </div>
                  <span className="flex-1 text-[15px] text-ink-title dark:text-dk-ink">{label}</span>
                  {status === 'connected' ? (
                    <span className="flex items-center gap-1.5 text-[12px] text-ink-3 dark:text-dk-ink-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-sync-green dark:bg-dk-green" />
                      connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[12px] font-medium text-accent">
                      set up
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              ))}
            </GroupCard>
          </div>

          {/* Appearance */}
          <div>
            <SectionLabel>Appearance</SectionLabel>
            <GroupCard>
              <div className="px-4 py-3.5">
                <p className="mb-2.5 text-[15px] text-ink-title dark:text-dk-ink">Theme</p>
                <div className="flex rounded-[10px] bg-chip-bg p-1 dark:bg-dk-chip-bg">
                  {THEME_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className="flex-1 rounded-[8px] py-1.5 text-[13px] font-medium transition-colors"
                      style={
                        theme === value
                          ? { background: '#C13D2B', color: '#fff' }
                          : { color: '#6F675B' }
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </GroupCard>
          </div>

          {/* Sign out */}
          <GroupCard>
            <button
              onClick={signOut}
              className="w-full px-4 py-4 text-center text-[15px] font-medium text-accent"
            >
              Sign out
            </button>
          </GroupCard>
        </div>
      </div>
    </div>
  )
}
