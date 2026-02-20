import { authClient } from '#/lib/auth-client'
import { Link } from '@tanstack/react-router'

export default function BetterAuthHeader() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="h-8 w-8 border-2 border-black bg-[#F5FF7B] rounded-lg animate-pulse" />
    )
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        {session.user.image ? (
          <img src={session.user.image} alt="" className="h-8 w-8 rounded-full border-2 border-black" />
        ) : (
          <div className="h-8 w-8 border-2 border-black rounded-full bg-[#F5FF7B] flex items-center justify-center">
            <span className="text-xs font-medium text-[#11110F]">
              {session.user.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
        )}
        <button
          onClick={() => {
            void authClient.signOut()
          }}
          className="flex-1 h-9 px-4 text-sm font-semibold rounded-xl border-2 border-black bg-[#11110F] text-[#F5FF7B] shadow-[2px_2px_0_0_#11110F] hover:-translate-y-0.5 transition-transform"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <Link
      to="/sign-in"
      className="h-9 px-4 text-sm font-semibold rounded-xl border-2 border-black bg-[#11110F] text-[#F5FF7B] shadow-[2px_2px_0_0_#11110F] hover:-translate-y-0.5 transition-transform inline-flex items-center"
    >
      Sign in
    </Link>
  )
}
