import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface AuthContextValue {
  token: string | null
  user: string | null
  avatarUrl: string | null
  setAuth: (token: string, user: string, avatarUrl: string) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('hikae_token'))
  const [user, setUser] = useState<string | null>(() => localStorage.getItem('hikae_user'))
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
    localStorage.getItem('hikae_avatar')
  )
  const navigate = useNavigate()

  const setAuth = useCallback((t: string, u: string, a: string) => {
    localStorage.setItem('hikae_token', t)
    localStorage.setItem('hikae_user', u)
    localStorage.setItem('hikae_avatar', a)
    setToken(t)
    setUser(u)
    setAvatarUrl(a)
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem('hikae_token')
    localStorage.removeItem('hikae_user')
    localStorage.removeItem('hikae_avatar')
    setToken(null)
    setUser(null)
    setAvatarUrl(null)
    navigate('/login')
  }, [navigate])

  return (
    <AuthContext.Provider value={{ token, user, avatarUrl, setAuth, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
