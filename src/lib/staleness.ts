export interface StaleStatus {
  stale: boolean;
  ageInDays: number;
  reviewWindowDays: number;
}

export function getStaleStatus(
  verifiedAt: Date,
  maturity: string,
  now: Date = new Date(),
): StaleStatus {
  if (Number.isNaN(verifiedAt.getTime())) {
    throw new Error('verifiedAt must be a valid date.');
  }

  const reviewWindowDays = maturity === 'frontier' ? 45 : 90;
  const elapsed = now.getTime() - verifiedAt.getTime();
  return {
    stale: elapsed > reviewWindowDays * 86_400_000,
    ageInDays: Math.floor(elapsed / 86_400_000),
    reviewWindowDays,
  };
}
