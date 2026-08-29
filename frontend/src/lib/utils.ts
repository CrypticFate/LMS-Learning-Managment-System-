export function getMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const baseUrl = (process.env.NEXT_PUBLIC_STRAPI_URL ?? 'http://localhost:1337').replace(
    /\/$/,
    '',
  );
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
