export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'The request could not be completed. Please try again.');
  return data as T;
}
