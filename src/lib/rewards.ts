export const DEFAULT_POINTS_PER_DOLLAR = 1;
export const DEFAULT_POINT_REDEMPTION_VALUE = 0.01;

export const REWARD_REDEMPTION_STATUS = {
  PENDING: "pending",
  USED: "used",
  APPLIED: "applied",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
} as const;

export function normalizePointsPerDollar(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return DEFAULT_POINTS_PER_DOLLAR;
  }
  return value;
}

export function normalizePointRedemptionValue(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return DEFAULT_POINT_REDEMPTION_VALUE;
  }
  return value;
}

export function getPointsPerDollarFromRedemptionValue(pointValue: number): number {
  const safePointValue = normalizePointRedemptionValue(pointValue);
  return Math.max(1, Math.round(1 / safePointValue));
}

export function formatPointsRedemptionRule(pointValue: number): string {
  const safePointValue = normalizePointRedemptionValue(pointValue);
  const pointsPerDollar = getPointsPerDollarFromRedemptionValue(safePointValue);

  if (pointsPerDollar === 1) {
    return "1 point = $1";
  }

  return `${pointsPerDollar} points = $1`;
}

