import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require authentication — redirect to /login if not logged in
const PROTECTED_ROUTES = ['/profile', '/wallet', '/admin']

// Routes that are always public
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/terms',
  '/privacy',
  '/provably-fair',
  '/responsible-gambling',
  '/leaderboards',
  '/faq',
  '/about',
]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Redirect authenticated users away from login/register
  if (user && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Protect routes that require authentication
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )
  if (isProtected && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Game routes: allow access (demo mode handled client-side)
  // API routes: auth handled per-route
  // Public routes: always accessible

  return supabaseResponse
}
