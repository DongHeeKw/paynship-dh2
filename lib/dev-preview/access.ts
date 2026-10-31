export function devPreviewAllowed(mode: string | undefined, enabled: string | undefined, host: string | null | undefined): boolean {
  if (mode !== 'development' || enabled !== '1' || !host) return false;
  const authority = host.trim();
  if (!/^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(authority)) return false;
  try {
    const url = new URL(`http://${authority}`);
    return !url.port || (Number(url.port) > 0 && Number(url.port) <= 65535);
  } catch { return false; }
}
