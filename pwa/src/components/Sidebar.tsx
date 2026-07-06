import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Inbox, FileText, BookOpen, Archive, Folder, LogOut, Settings, Zap, Sun, Moon, Monitor } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useTheme, type Theme } from '../context/ThemeContext'
import type { BookmarkStatus } from '../types'
import hikaeLogo from '../assets/hikae-icon.png'

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args))

interface SidebarProps {
  selectedStatus: BookmarkStatus | null
  setSelectedStatus: (s: BookmarkStatus | null) => void
  selectedFolderId: string | null
  setSelectedFolderId: (id: string | null) => void
  selectedTagId: string | null
  setSelectedTagId: (id: string | null) => void
}

const STATUS_ITEMS: { status: BookmarkStatus; label: string; icon: typeof Inbox }[] = [
  { status: 'inbox', label: 'Inbox', icon: Inbox },
  { status: 'filed', label: 'Filed', icon: FileText },
  { status: 'read', label: 'Read', icon: BookOpen },
  { status: 'archived', label: 'Archived', icon: Archive },
]

const CAPTURE_CHIPS = [
  { badge: 'iOS', label: 'iOS Shortcut', sub: 'Share Sheet' },
  { badge: '⌘', label: 'macOS', sub: 'Menu bar' },
  { badge: 'R', label: 'Raycast', sub: 'Quick capture' },
  { badge: '◉', label: 'Web', sub: 'This app' },
]

const THEME_CYCLE: Theme[] = ['light', 'dark', 'auto']
const THEME_ICON: Record<Theme, typeof Sun> = { light: Sun, dark: Moon, auto: Monitor }
const THEME_TITLE: Record<Theme, string> = { light: 'Light theme', dark: 'Dark theme', auto: 'Auto theme' }

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 px-[9px] font-sans text-[10.5px] font-semibold uppercase tracking-[.13em] text-ink-3 dark:text-dk-ink-3">
      {children}
    </p>
  )
}

export function Sidebar({
  selectedStatus,
  setSelectedStatus,
  selectedFolderId,
  setSelectedFolderId,
  selectedTagId,
  setSelectedTagId,
}: SidebarProps) {
  const { user, avatarUrl, signOut } = useAuth()
  const { data } = useData()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  const ThemeIcon = THEME_ICON[theme]

  const cycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(theme)
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length])
  }

  const countByStatus = (status: BookmarkStatus) =>
    data?.bookmarks.filter((b) => b.status === status).length ?? 0

  const countByFolder = (folderId: string) =>
    data?.bookmarks.filter((b) => b.folder_id === folderId && b.status !== 'deleted').length ?? 0

  const handleStatusClick = (status: BookmarkStatus) => {
    setSelectedStatus(status)
    setSelectedFolderId(null)
    setSelectedTagId(null)
  }

  const handleFolderClick = (id: string) => {
    setSelectedFolderId(id)
    setSelectedStatus(null)
    setSelectedTagId(null)
  }

  const handleTagClick = (id: string) => {
    setSelectedTagId(id)
    setSelectedStatus(null)
    setSelectedFolderId(null)
  }

  const inboxCount = countByStatus('inbox')
  const activeFolders = data?.folders.filter((f) => !f.archived) ?? []

  return (
    <aside className="flex h-screen w-[248px] flex-shrink-0 flex-col border-r border-hairline-warm bg-sidebar dark:border-dk-border dark:bg-dk-sidebar">
      {/* Brand row */}
      <div className="flex items-center gap-[11px] px-[18px] pb-4 pt-[18px]">
        <img
          src={hikaeLogo}
          alt="Hikae"
          className="h-[30px] w-[30px] flex-shrink-0"
          style={{
            borderRadius: '6.7px',
            boxShadow: '0 1px 2px rgba(80,55,20,.18)',
          }}
        />
        <div className="flex flex-col">
          <span className="font-serif text-[18px] font-semibold leading-tight tracking-[.01em] text-ink dark:text-dk-ink">
            Hikae
          </span>
          <span className="font-serif text-[11px] font-medium leading-tight tracking-[.18em] text-[#A0967F] dark:text-dk-ink-3">
            控え · kept for later
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {/* STATUS */}
        <div className="mb-4">
          <SectionLabel>Status</SectionLabel>
          {STATUS_ITEMS.map(({ status, label, icon: Icon }) => {
            const active = selectedStatus === status
            const count = countByStatus(status)
            return (
              <button
                key={status}
                onClick={() => handleStatusClick(status)}
                className={cn(
                  'flex w-full items-center justify-between rounded-[7px] px-[9px] py-[7px] text-[13.5px] transition-colors duration-150',
                  active
                    ? 'bg-accent-wash font-semibold dark:bg-dk-accent-wash'
                    : 'font-normal hover:bg-chip-bg-alt dark:hover:bg-dk-chip-bg'
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon
                    className={cn('h-4 w-4', active ? 'text-accent dark:text-dk-accent' : 'text-ink-3 dark:text-dk-ink-3')}
                  />
                  <span className={active ? 'text-accent-ink dark:text-dk-accent' : 'text-ink-2 dark:text-dk-ink-2'}>
                    {label}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  {status === 'inbox' && inboxCount > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-accent dark:bg-dk-accent" />
                  )}
                  <span className={cn('font-mono text-[11px]', active ? 'text-[#C2776B] dark:text-dk-accent' : 'text-ink-3 dark:text-dk-ink-3')}>
                    {count}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {/* FOLDERS */}
        {activeFolders.length > 0 && (
          <div className="mb-4">
            <SectionLabel>Folders</SectionLabel>
            {activeFolders.map((folder) => {
              const active = selectedFolderId === folder.id
              return (
                <button
                  key={folder.id}
                  onClick={() => handleFolderClick(folder.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-[7px] px-[9px] py-[7px] text-[13px] transition-colors duration-150',
                    active
                      ? 'bg-accent-wash font-medium dark:bg-dk-accent-wash'
                      : 'hover:bg-chip-bg-alt dark:hover:bg-dk-chip-bg'
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Folder className="h-4 w-4 flex-shrink-0 text-icon-default dark:text-dk-ink-3" />
                    <span className={cn('truncate', active ? 'text-accent-ink dark:text-dk-accent' : 'text-ink-2 dark:text-dk-ink-2')}>
                      {folder.name}
                    </span>
                  </span>
                  <span className="font-mono text-[11px] text-ink-3 dark:text-dk-ink-3">
                    {countByFolder(folder.id)}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* TAGS */}
        {data && data.tags.length > 0 && (
          <div className="mb-4">
            <SectionLabel>Tags</SectionLabel>
            <div className="flex flex-wrap gap-1 px-[9px]">
              {data.tags.map((tag) => {
                const active = selectedTagId === tag.id
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleTagClick(tag.id)}
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[12px] transition-colors duration-150',
                      active
                        ? 'bg-accent-wash font-medium text-accent-ink dark:bg-dk-accent-wash dark:text-dk-accent'
                        : 'bg-chip-bg-alt text-[#6F675B] hover:bg-[#DED3BC] dark:bg-dk-chip-bg dark:text-dk-ink-3 dark:hover:bg-[#3A3528]'
                    )}
                  >
                    <span className="font-mono text-[10px] text-ink-mono-faint dark:text-dk-ink-faint">#</span>
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* CAPTURE ANYWHERE */}
        <div className="mx-1 rounded-[10px] border border-chip-bg-alt bg-surface-sunken p-[11px] dark:border-dk-border dark:bg-dk-surface-sunken">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-sans text-[10.5px] font-semibold uppercase tracking-[.13em] text-ink-3 dark:text-dk-ink-3">
              Capture Anywhere
            </span>
            <Zap className="h-3.5 w-3.5 text-icon-default dark:text-dk-ink-3" />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {CAPTURE_CHIPS.map(({ badge, label, sub }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-[7px] border border-[#EBE3D3] bg-surface p-2 dark:border-dk-border dark:bg-dk-card"
              >
                <span className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[4px] bg-chip-bg font-mono text-[9px] font-medium text-[#8A7F68] dark:bg-dk-chip-bg dark:text-dk-ink-3">
                  {badge}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-ink-2 dark:text-dk-ink-2">{label}</p>
                  <p className="truncate font-mono text-[9.5px] text-ink-mono-faint dark:text-dk-ink-faint">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* User footer */}
      <div className="flex items-center justify-between border-t border-hairline-warm px-4 py-[11px] dark:border-dk-border">
        <div className="flex min-w-0 items-center gap-2">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user ?? ''}
              className="h-[26px] w-[26px] flex-shrink-0 rounded-full"
            />
          ) : (
            <div
              className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-white"
              style={{ background: 'linear-gradient(135deg, #C9BDA2, #9C8F73)' }}
            >
              {(user ?? 'U')[0].toUpperCase()}
            </div>
          )}
          <span className="truncate text-[13px] text-ink-2 dark:text-dk-ink-2">{user}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={cycleTheme}
            className="rounded-[6px] p-1.5 text-ink-3 transition-colors hover:bg-chip-bg-alt hover:text-ink-2 dark:text-dk-ink-3 dark:hover:bg-dk-chip-bg dark:hover:text-dk-ink-2"
            title={THEME_TITLE[theme]}
          >
            <ThemeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate('/organize')}
            className="rounded-[6px] p-1.5 text-ink-3 transition-colors hover:bg-chip-bg-alt hover:text-ink-2 dark:text-dk-ink-3 dark:hover:bg-dk-chip-bg dark:hover:text-dk-ink-2"
            title="Organize"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={signOut}
            className="rounded-[6px] p-1.5 text-ink-3 transition-colors hover:bg-chip-bg-alt hover:text-ink-2 dark:text-dk-ink-3 dark:hover:bg-dk-chip-bg dark:hover:text-dk-ink-2"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
