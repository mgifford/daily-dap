/**
 * Rounds a numeric value to two decimal places.
 * @param {number} value
 * @returns {number}
 */
export function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Normalizes a traffic/page-load count value to a non-negative number.
 * Returns 0 for non-numeric, NaN, or negative values.
 * @param {*} value
 * @returns {number}
 */
export function normalizeTraffic(value) {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return 0;
  }
  return value;
}
