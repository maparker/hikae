import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { getBookmarksData, saveBookmarksData } from '../lib/github'
import { useAuth } from './AuthContext'
import type { BookmarksData } from '../types'

interface DataContextValue {
  data: BookmarksData | null
  sha: string | null
  loading: boolean
  error: string | null
  save: (updatedData: BookmarksData, message: string) => Promise<void>
  refresh: () => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth()
  const [data, setData] = useState<BookmarksData | null>(null)
  const [sha, setSha] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token || !user) return
    setLoading(true)
    setError(null)
    try {
      const result = await getBookmarksData(user, token)
      setData(result.data)
      setSha(result.sha)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [token, user])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(
    async (updatedData: BookmarksData, message: string) => {
      if (!token || !user || !sha) throw new Error('Not ready')
      const previous = data
      const previousSha = sha
      setData(updatedData)
      try {
        const result = await saveBookmarksData(user, token, updatedData, sha, message)
        setSha(result.sha)
      } catch (e) {
        setData(previous)
        setSha(previousSha)
        throw e
      }
    },
    [token, user, sha, data]
  )

  const refresh = useCallback(() => load(), [load])

  return (
    <DataContext.Provider value={{ data, sha, loading, error, save, refresh }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
