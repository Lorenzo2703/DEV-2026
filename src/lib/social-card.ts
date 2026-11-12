import { escapeXml } from './xml';

export function socialCardSvg(title: string): string {
  const characters = Array.from(title.trim());
  const shortened = characters.length > 56 ? `${characters.slice(0, 55).join('')}…` : title.trim();
  const words = shortened.match(/\S{1,32}/gu) ?? [];
  const lines: string[] = [];
  for (const word of words) {
    const last = lines.at(-1);
    if (last && last.length + word.length + 1 <= 32) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  const text = lines
    .map((line, index) => `<tspan x="72" dy="${index === 0 ? 0 : 80}">${escapeXml(line)}</tspan>`)
    .join('');
  const maxLineLength = Math.max(1, ...lines.map((line) => Array.from(line).length));
  const fontSize = Math.min(64, Math.floor(1056 / maxLineLength));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#101923"/>
    <rect x="72" y="72" width="88" height="8" fill="#9de3ef"/>
    <text x="72" y="150" fill="#9de3ef" font-family="Arial, sans-serif" font-size="32">DEV IN 2026</text>
    <text x="72" y="265" fill="#f2f6fa" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700">${text}</text>
    <text x="72" y="550" fill="#bbc8d5" font-family="Arial, sans-serif" font-size="28">Build and operate software with confidence.</text>
  </svg>`;
}
