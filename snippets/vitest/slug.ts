export function slugify(input: string): string {
  const slug = input.trim().toLowerCase().replace(/\s+/g, '-');
  if (!slug) throw new Error('A title is required.');
  return slug;
}
