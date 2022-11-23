import { isTrue } from './utils.mjs';

export const env = {
  DEBUG: process.env.DEBUG,
};

export function isDebug() {
  return isTrue(env.DEBUG);
}
