export function isHealthy(status: number): boolean {
  return Number.isInteger(status) && status >= 200 && status < 300;
}
