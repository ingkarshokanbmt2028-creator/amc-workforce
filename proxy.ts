import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login']

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  const isApi    = pathname.startsWith('/api')

  if (isPublic || isApi) return NextResponse.next()

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
