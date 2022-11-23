/**
 * @param {string=} val
 */
export function isTrue(val) {
  return ['true', 't', '1', 'y', 'yes'].includes((val || '').toLowerCase());
}
