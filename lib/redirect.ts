export function getSafeRedirectPath(
  redirectPath: string | null | undefined,
  fallback = '/dashboard'
) {
  if (!redirectPath) return fallback

  const trimmed = redirectPath.trim()

  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\') ||
    trimmed.includes('\n') ||
    trimmed.includes('\r') ||
    trimmed.toLowerCase().startsWith('/\\')
  ) {
    return fallback
  }

  return trimmed
}
