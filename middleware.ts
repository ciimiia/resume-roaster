import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = ['/dashboard']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PROTECTED.some(p => pathname.startsWith(p))) {
    const session = req.cookies.get('rr-session')
    if (!session?.value) {
      const url = req.nextUrl.clone()
      url.pathname = '/signin'
      return NextResponse.redirect(url)
    }
  }
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*'] }
