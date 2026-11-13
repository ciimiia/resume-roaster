import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = ['/dashboard', '/profile']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PROTECTED.some(p => pathname.startsWith(p))) {
    const session = req.cookies.get('rr-session')
    if (!session?.value) {
      // Preserve the original path (+ query) so sign-in can send the user
      // back to where they actually were — without this, everyone bounced
      // here lands on /signin's default (/dashboard) instead, which for a
      // page like /profile means never reaching the thing they clicked.
      const nextPath = `${req.nextUrl.pathname}${req.nextUrl.search}`
      const target = req.nextUrl.clone()
      target.pathname = '/signin'
      target.search = ''
      target.searchParams.set('next', nextPath)
      return NextResponse.redirect(target)
    }
  }
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*', '/profile/:path*'] }
