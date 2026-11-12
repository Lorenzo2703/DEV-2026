import { basename, extname, resolve } from 'node:path';
import { contentId, getStaleStatus, listMarkdownFiles, readContentFile } from './content-utils';
import { fetchRelease, releaseSources } from './releases';

const root = resolve('src/content/tools');
const files = await listMarkdownFiles(root);
const checkVersions = process.argv.includes('--check-versions');
const findings: string[] = [];

for (const file of files) {
  const { data } = await readContentFile(file);
  if (typeof data.verifiedAt !== 'string' && !(data.verifiedAt instanceof Date)) {
    throw new Error(`${contentId(file, root)}: verifiedAt is missing or invalid.`);
  }
  if (typeof data.maturity !== 'string') {
    throw new Error(`${contentId(file, root)}: maturity is missing or invalid.`);
  }

  const status = getStaleStatus(new Date(data.verifiedAt), data.maturity);
  const reasons: string[] = [];
  if (status.stale) {
    reasons.push(`${status.ageInDays} days old (limit ${status.reviewWindowDays})`);
  }
  if (data.needsVerification === true) reasons.push('explicitly marked for verification');
  if (checkVersions) {
    if (typeof data.toolVersion !== 'string')
      throw new Error(`${contentId(file, root)}: toolVersion is missing or invalid.`);
    const slug = basename(file, extname(file));
    const source = releaseSources[slug];
    if (!source) {
      reasons.push('release source not configured');
    } else {
      const release = await fetchRelease(source);
      if (release.version !== data.toolVersion) {
        reasons.push(
          `recorded ${data.toolVersion}; source reports ${release.version} (${release.url})`,
        );
      }
    }
  }
  if (reasons.length) findings.push(`- ${contentId(file, root)}: ${reasons.join('; ')}.`);
}

console.log(findings.length ? findings.join('\n') : 'No tool pages need review.');
