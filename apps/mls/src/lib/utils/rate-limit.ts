import { HOUR_MS } from "@/lib/constants";
import { env } from '@kws/config';
import { sleep } from './helpers';
import { mlsQuotaTracker, type QuotaSnapshot } from "./quota";

// ---------------------------------------------------------------------------
// Rate limiter — serialized promise queue, same pattern as geocoder.ts
// ---------------------------------------------------------------------------

let _queue: Promise<void> = Promise.resolve();
const recentRequestSlotsMs: number[] = [];

interface AdaptiveDelayOverrides {
  requestDelayMs?: number;
  requestsPerHourLimit?: number;
  requestThrottleCurvePower?: number;
  requestThrottleMaxDelayMs?: number;
}

interface PerSecondHeadroomOverrides {
  requestsPerSecond?: number;
  requestsPerHourLimit?: number;
  requestsPerDayLimit?: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function computeEndLoadedCurveFactor(utilization: number, curvePower: number) {
  const knee = 0.85;
  const steepness = Math.max(1, curvePower) * 10;

  const logistic = 1 / (1 + Math.exp(-steepness * (utilization - knee)));
  const minLogistic = 1 / (1 + Math.exp(steepness * knee));
  const maxLogistic = 1 / (1 + Math.exp(-steepness * (1 - knee)));

  if (maxLogistic <= minLogistic) {
    return clamp(utilization, 0, 1);
  }

  return clamp((logistic - minLogistic) / (maxLogistic - minLogistic), 0, 1);
}

function computeEffectivePerSecondLimit(
  snapshot: QuotaSnapshot,
  nowMs: number = Date.now(),
  overrides?: PerSecondHeadroomOverrides,
) {
  const basePerSecond = Math.max(1, overrides?.requestsPerSecond ?? env.MLS_REQUESTS_PER_SECOND);
  const hourlyLimit = Math.max(
    1,
    overrides?.requestsPerHourLimit ?? env.MLS_REQUESTS_PER_HOUR_LIMIT,
  );
  const dailyLimit = Math.max(
    1,
    overrides?.requestsPerDayLimit ?? env.MLS_REQUESTS_PER_DAY_LIMIT,
  );

  const usedHour = Math.max(0, snapshot.hour.requests);
  const usedDay = Math.max(0, snapshot.day.requests);
  const hourUtilization = clamp(usedHour / hourlyLimit, 0, 1);
  const dayUtilization = clamp(usedDay / dailyLimit, 0, 1);
  const pressure = Math.max(hourUtilization, dayUtilization);

  if (pressure <= 0.7) {
    return basePerSecond;
  }

  const elapsedHourMs = clamp(nowMs - snapshot.hour.startedAtMs, 0, HOUR_MS);
  const elapsedDayMs = clamp(nowMs - snapshot.day.startedAtMs, 0, 24 * HOUR_MS);
  const remainingHourSec = Math.max(1, Math.ceil((HOUR_MS - elapsedHourMs) / 1000));
  const remainingDaySec = Math.max(1, Math.ceil((24 * HOUR_MS - elapsedDayMs) / 1000));

  const remainingHourRequests = Math.max(0, hourlyLimit - usedHour);
  const remainingDayRequests = Math.max(0, dailyLimit - usedDay);

  const headroomRps = Math.min(
    remainingHourRequests / remainingHourSec,
    remainingDayRequests / remainingDaySec,
  );
  const headroomCap = clamp(Math.floor(Math.max(1, headroomRps * 1.15)), 1, basePerSecond);

  const pressureFactor = clamp((pressure - 0.7) / 0.3, 0, 1);
  const blended = Math.round(basePerSecond + (headroomCap - basePerSecond) * pressureFactor);
  return clamp(blended, 1, basePerSecond);
}

export function computeAdaptiveThrottleDelayMs(
  snapshot: QuotaSnapshot,
  nowMs: number = Date.now(),
  overrides?: AdaptiveDelayOverrides,
) {
  const minimumDelayMs = Math.max(0, overrides?.requestDelayMs ?? env.MLS_REQUEST_DELAY_MS);
  const hourlyRequestLimit = Math.max(
    1,
    overrides?.requestsPerHourLimit ?? env.MLS_REQUESTS_PER_HOUR_LIMIT,
  );
  const hourlyAverageDelayMs = Math.ceil(HOUR_MS / hourlyRequestLimit);
  const curvePower = Math.max(
    1,
    overrides?.requestThrottleCurvePower ?? env.MLS_REQUEST_THROTTLE_CURVE_POWER,
  );
  const maxDelayMs = Math.max(
    minimumDelayMs,
    overrides?.requestThrottleMaxDelayMs ?? env.MLS_REQUEST_THROTTLE_MAX_DELAY_MS,
  );

  const usedThisHour = Math.max(0, snapshot.hour.requests);
  const utilization = clamp(usedThisHour / hourlyRequestLimit, 0, 1);
  const curveFactor = computeEndLoadedCurveFactor(utilization, curvePower);

  const curvedDelayMs = minimumDelayMs + (hourlyAverageDelayMs - minimumDelayMs) * curveFactor;

  const elapsedInHourMs = clamp(nowMs - snapshot.hour.startedAtMs, 0, HOUR_MS);
  const remainingInHourMs = Math.max(1, HOUR_MS - elapsedInHourMs);
  const remainingRequests = Math.max(1, hourlyRequestLimit - usedThisHour);
  const requiredDelayMs = Math.ceil(remainingInHourMs / remainingRequests);
  const recoveryDelayMs =
    minimumDelayMs + (Math.max(minimumDelayMs, requiredDelayMs) - minimumDelayMs) * curveFactor;

  const adaptiveDelayMs = Math.max(minimumDelayMs, curvedDelayMs, recoveryDelayMs);
  return Math.ceil(clamp(adaptiveDelayMs, minimumDelayMs, maxDelayMs));
}

export async function throttle(): Promise<void> {
  const slot = (_queue = _queue.then(async () => {
    const snapshot = mlsQuotaTracker.snapshot();
    const adaptiveDelayMs = computeAdaptiveThrottleDelayMs(snapshot);

    const nowMs = Date.now();
    const perSecondLimit = computeEffectivePerSecondLimit(snapshot, nowMs);
    const windowStartMs = nowMs - 1000;

    while (recentRequestSlotsMs.length > 0 && recentRequestSlotsMs[0]! <= windowStartMs) {
      recentRequestSlotsMs.shift();
    }

    let perSecondDelayMs = 0;
    if (recentRequestSlotsMs.length >= perSecondLimit) {
      const earliestMs = recentRequestSlotsMs[0]!;
      perSecondDelayMs = Math.max(0, earliestMs + 1000 - nowMs);
    }

    const delayMs = Math.max(adaptiveDelayMs, perSecondDelayMs);
    if (delayMs > 0) {
      await sleep(delayMs);
    }

    const slotMs = Date.now();
    recentRequestSlotsMs.push(slotMs);
  }));

  return slot;
}