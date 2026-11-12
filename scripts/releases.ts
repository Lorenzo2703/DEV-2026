export type ReleaseSource =
  | { kind: 'npm'; package: string }
  | { kind: 'github'; repository: string; tagPrefix: string }
  | { kind: 'postgres' };

export const releaseSources: Record<string, ReleaseSource> = {
  typescript: { kind: 'npm', package: 'typescript' },
  bun: { kind: 'github', repository: 'oven-sh/bun', tagPrefix: 'bun-v' },
  astro: { kind: 'npm', package: 'astro' },
  'tailwind-css': { kind: 'npm', package: 'tailwindcss' },
  vitest: { kind: 'npm', package: 'vitest' },
  playwright: { kind: 'npm', package: '@playwright/test' },
  postgresql: { kind: 'postgres' },
  'github-actions': { kind: 'github', repository: 'actions/runner', tagPrefix: 'v' },
  opentelemetry: { kind: 'npm', package: '@opentelemetry/sdk-trace' },
  cloudflare: { kind: 'npm', package: 'wrangler' },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseRelease(source: ReleaseSource, data: unknown): string {
  if (source.kind === 'postgres') {
    if (!Array.isArray(data)) throw new Error('PostgreSQL release data must be an array.');
    const current = data.filter((entry: unknown) => isRecord(entry) && entry.current === true);
    if (current.length !== 1 || !isRecord(current[0])) {
      throw new Error('PostgreSQL release data must contain exactly one current version.');
    }
    const { major, latestMinor } = current[0];
    if (typeof major !== 'string' || typeof latestMinor !== 'string') {
      throw new Error('PostgreSQL current version is missing its major or minor version.');
    }
    return `${major}.${latestMinor}`;
  }
  if (!isRecord(data)) throw new Error('Release response must be an object.');
  if (source.kind === 'npm') {
    if (typeof data.version !== 'string' || !data.version) {
      throw new Error('npm release response is missing its version.');
    }
    return data.version;
  }
  if (
    data.prerelease !== false ||
    typeof data.tag_name !== 'string' ||
    !data.tag_name.startsWith(source.tagPrefix)
  ) {
    throw new Error('GitHub release response has an unexpected tag or prerelease status.');
  }
  const version = data.tag_name.slice(source.tagPrefix.length);
  if (!version) throw new Error('GitHub release tag has no version.');
  return version;
}

export async function fetchRelease(
  source: ReleaseSource,
): Promise<{ version: string; url: string }> {
  const url =
    source.kind === 'npm'
      ? `https://registry.npmjs.org/${encodeURIComponent(source.package)}/latest`
      : source.kind === 'github'
        ? `https://api.github.com/repos/${source.repository}/releases/latest`
        : 'https://www.postgresql.org/versions.json';
  const headers: Record<string, string> = { 'User-Agent': 'dev-in-2026-stale-report' };
  if (source.kind === 'github' && process.env.GH_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
  }
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Release lookup ${url} failed with HTTP ${response.status}.`);
  const data: unknown = await response.json();
  return { version: parseRelease(source, data), url };
}
