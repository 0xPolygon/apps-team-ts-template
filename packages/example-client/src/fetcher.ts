// Module-level baseUrl — set once by createExampleClient().
// Safe for server-side use where one baseUrl is configured per process,
// and for browser use where the client is typically a singleton.
let _baseUrl = '';

export function setBaseUrl(url: string): void {
  _baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
}

// Orval's fetch client generates response types as { data: T, status: N, headers: Headers }.
// This fetcher returns that exact shape so runtime values match the generated types.
export async function customFetch<T extends { data: unknown; status: number; headers: Headers }>(
  url: string,
  options: RequestInit
): Promise<T> {
  const response = await fetch(`${_baseUrl}${url}`, options);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} ${response.statusText} [${response.url}]: ${body}`);
  }
  const data = await response.json();
  return { data, status: response.status, headers: response.headers } as T;
}
