export function isShellWorkspaceRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/spaces') ||
    pathname.startsWith('/campaigns') ||
    pathname.startsWith('/programs') ||
    pathname.startsWith('/clients') ||
    pathname.startsWith('/client-campaigns') ||
    pathname.startsWith('/all-tasks') ||
    pathname.startsWith('/brain') ||
    pathname.startsWith('/artifacts') ||
    pathname.startsWith('/flows') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/team')
  )
}

export function isShellHomeRoute(pathname: string): boolean {
  return pathname === '/home'
}
