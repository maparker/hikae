import { Github } from 'lucide-react'
import { Button } from '../components/ui/button'

const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID as string

export function Login() {
  const handleSignIn = () => {
    const redirectUri = `${window.location.origin}/hikae/callback`
    window.location.href =
      `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo&redirect_uri=${encodeURIComponent(redirectUri)}`
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Hikae</h1>
          <p className="mt-2 text-sm text-gray-500">Your personal read-later inbox</p>
        </div>
        <Button className="w-full gap-2" onClick={handleSignIn}>
          <Github className="h-4 w-4" />
          Sign in with GitHub
        </Button>
      </div>
    </div>
  )
}
