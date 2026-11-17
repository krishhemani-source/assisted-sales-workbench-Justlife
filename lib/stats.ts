/**
 * Approximate frequentist helpers. Normal approximations throughout:
 * fine for planning and illustration, not a substitute for a proper analysis.
 */

/** Standard normal CDF via erf (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7). */
export function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

/** Inverse standard normal CDF (Acklam's rational approximation). */
export function normalInv(p: number): number {
  if (p <= 0 || p >= 1) throw new RangeError("p must be in (0, 1)");
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - lo) return -normalInv(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

export interface ZTestResult {
  z: number;
  pValue: number;
}

/** Pooled two-proportion z-test, two-sided. Rates are proportions in [0, 1]. */
export function twoProportionZTest(p1: number, n1: number, p2: number, n2: number): ZTestResult {
  const pooled = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  if (!(se > 0)) return { z: 0, pValue: 1 };
  const z = (p1 - p2) / se;
  return { z, pValue: Math.min(1, 2 * (1 - normalCdf(Math.abs(z)))) };
}

/**
 * Approximate sample size per arm to detect p1 vs p2 with a two-sided test.
 * n = (z_{1-α/2}·√(2·p̄·q̄) + z_{power}·√(p1q1 + p2q2))² / (p1 − p2)²
 * Returns null when there is no difference to detect.
 */
export function sampleSizePerArm(p1: number, p2: number, alpha = 0.05, power = 0.8): number | null {
  const delta = Math.abs(p1 - p2);
  if (delta === 0) return null;
  const zA = normalInv(1 - alpha / 2);
  const zB = normalInv(power);
  const pBar = (p1 + p2) / 2;
  const n = (zA * Math.sqrt(2 * pBar * (1 - pBar)) + zB * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2 / delta ** 2;
  return Math.ceil(n);
}
