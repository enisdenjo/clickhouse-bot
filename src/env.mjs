export const env = {
  DEBUG: process.env.DEBUG,
};

export function isDebug() {
  return env.DEBUG === '1' || env.DEBUG === 'true' || env.DEBUG === 't';
}
