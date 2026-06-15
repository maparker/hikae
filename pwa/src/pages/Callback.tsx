import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUser } from '../lib/github'
import { Spinner } from '../components/ui/spinner'

const WORKER_URL = 'https://hikae-auth.mattparker.workers.dev'

export function Callback() {
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const code = searchParams.get('code')
    if (!code) {
      setError('No authorization code received.')
      return
    }

    ;(async () => {
      try {
        const tokenRes = await fetch(WORKER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, client_id: import.meta.env.VITE_GITHUB_CLIENT_ID }),
        })
        if (!tokenRes.ok) throw new Error(`Worker returned ${tokenRes.status}`)
        const { access_token } = (await tokenRes.json()) as { access_token: string }
        const { login, avatar_url } = await getUser(access_token)
        setAuth(access_token, login, avatar_url)
        navigate('/')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Authentication failed.')
      }
    })()
  }, [searchParams, setAuth, navigate])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-700">Sign-in failed</p>
          <p className="mt-1 text-xs text-red-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex items-center gap-3 text-gray-500">
        <Spinner />
        <span className="text-sm">Signing in…</span>
      </div>
    </div>
  )
}
