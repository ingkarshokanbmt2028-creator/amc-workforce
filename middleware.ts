import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  const isApi    = pathname.startsWith('/api')

  if (isPublic || isApi) return NextResponse.next()

  const authed = req.cookies.get('amc_auth')?.value === '1'
  if (!authed) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
