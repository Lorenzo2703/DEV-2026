export function welcome(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name must not be empty.');
  return `Welcome, ${trimmed}!`;
}
