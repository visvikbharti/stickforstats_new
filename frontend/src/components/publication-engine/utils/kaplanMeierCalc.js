/**
 * Kaplan-Meier Estimator Utilities
 *
 * Product-limit estimator with Greenwood's formula for CI
 * and risk table generation for survival analysis plots.
 */

/**
 * Compute Kaplan-Meier survival estimates from time-to-event data.
 *
 * @param {number[]} times  - Observed times
 * @param {number[]} events - Event indicators (1 = event, 0 = censored)
 * @returns {{ time: number, survival: number, nRisk: number, nEvent: number, nCensored: number, variance: number }[]}
 */
export function kaplanMeierEstimate(times, events) {
  if (!times || !times.length) return [];

  // Build individual observations
  const obs = times.map((t, i) => ({ time: t, event: events[i] ? 1 : 0 }));
  obs.sort((a, b) => a.time - b.time);

  // Collect unique event times
  const uniqueTimes = [...new Set(obs.filter(o => o.event === 1).map(o => o.time))].sort((a, b) => a - b);

  const n = obs.length;
  let nAtRisk = n;
  let survival = 1;
  let varianceSum = 0; // Greenwood accumulator
  const curve = [{ time: 0, survival: 1, nRisk: n, nEvent: 0, nCensored: 0, variance: 0 }];

  let obsIdx = 0;

  for (const t of uniqueTimes) {
    // Count censored before this time
    while (obsIdx < n && obs[obsIdx].time < t) {
      if (obs[obsIdx].event === 0) {
        nAtRisk--;
      }
      obsIdx++;
    }

    // Count events and censored at this time
    let dj = 0;
    let cj = 0;
    while (obsIdx < n && obs[obsIdx].time === t) {
      if (obs[obsIdx].event === 1) dj++;
      else cj++;
      obsIdx++;
    }

    if (nAtRisk > 0 && dj > 0) {
      survival *= (1 - dj / nAtRisk);
      varianceSum += dj / (nAtRisk * (nAtRisk - dj));
    }

    curve.push({
      time: t,
      survival: Math.max(0, survival),
      nRisk: nAtRisk,
      nEvent: dj,
      nCensored: cj,
      variance: varianceSum,
    });

    nAtRisk -= (dj + cj);
  }

  return curve;
}

/**
 * Compute confidence intervals using Greenwood's formula (log transform).
 *
 * @param {Object[]} curve - Output from kaplanMeierEstimate
 * @param {number} z - Z-value for CI (default 1.96 for 95% CI)
 * @returns {{ time: number, lower: number, upper: number }[]}
 */
export function kaplanMeierCI(curve, z = 1.96) {
  return curve.map(pt => {
    if (pt.survival <= 0 || pt.survival >= 1 || pt.variance === 0) {
      return { time: pt.time, lower: pt.survival, upper: pt.survival };
    }
    const se = pt.survival * Math.sqrt(pt.variance);
    return {
      time: pt.time,
      lower: Math.max(0, pt.survival - z * se),
      upper: Math.min(1, pt.survival + z * se),
    };
  });
}

/**
 * Find median survival time (where survival crosses 0.5).
 *
 * @param {Object[]} curve - Output from kaplanMeierEstimate
 * @returns {number|null}
 */
export function medianSurvival(curve) {
  for (let i = 1; i < curve.length; i++) {
    if (curve[i].survival <= 0.5) {
      return curve[i].time;
    }
  }
  return null;
}

/**
 * Generate risk table data at specified time points.
 *
 * @param {Object[]} curve - Output from kaplanMeierEstimate
 * @param {number} numPoints - Number of time points for the table (default 6)
 * @returns {{ time: number, nRisk: number }[]}
 */
export function riskTable(curve, numPoints = 6) {
  if (!curve.length) return [];
  const maxTime = curve[curve.length - 1].time;
  const step = maxTime / (numPoints - 1);
  const table = [];

  for (let i = 0; i < numPoints; i++) {
    const t = i * step;
    // Find closest curve point at or before t
    let closest = curve[0];
    for (const pt of curve) {
      if (pt.time <= t) closest = pt;
      else break;
    }
    table.push({ time: Math.round(t * 100) / 100, nRisk: closest.nRisk });
  }

  return table;
}

/**
 * Process raw data with group stratification.
 *
 * @param {Object[]} data - Raw data rows
 * @param {string} timeCol - Column name for time
 * @param {string} eventCol - Column name for event
 * @param {string|null} groupCol - Optional column name for group
 * @returns {Object} { groups: { [groupName]: { curve, ci, median, riskTable, censorTimes } } }
 */
export function processKMData(data, timeCol, eventCol, groupCol = null) {
  const groupNames = groupCol
    ? [...new Set(data.map(d => d[groupCol]))]
    : ['All'];

  const result = {};

  for (const grp of groupNames) {
    const subset = groupCol ? data.filter(d => d[groupCol] === grp) : data;
    const times = subset.map(d => +d[timeCol]).filter(t => !isNaN(t));
    const events = subset.map(d => +d[eventCol]).filter((_, i) => !isNaN(+subset[i][timeCol]));

    const curve = kaplanMeierEstimate(times, events);
    const ci = kaplanMeierCI(curve);
    const median = medianSurvival(curve);
    const rt = riskTable(curve);

    // Censored observation times for tick marks
    const censorTimes = [];
    for (let i = 0; i < times.length; i++) {
      if (events[i] === 0) {
        // Find survival at that time
        let surv = 1;
        for (const pt of curve) {
          if (pt.time <= times[i]) surv = pt.survival;
          else break;
        }
        censorTimes.push({ time: times[i], survival: surv });
      }
    }

    result[grp] = { curve, ci, median, riskTable: rt, censorTimes };
  }

  return { groups: result };
}
