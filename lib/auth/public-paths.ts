const PUBLIC_PREFIXES = ['/login', '/auth', '/credits']

export function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}
