import type { RigConfig } from '../config.js';
import { readNight } from './read.js';
import type { DigestRow } from './types.js';

export type DigestJsonNotFound = { status: 404 };
export type DigestJsonOk = { status: 200; body: DigestRow[] };
export type DigestJsonResult = DigestJsonNotFound | DigestJsonOk;

/** Same rows as the digest page (ADR 0001); missing night file → 404. */
export function digestJson(config: RigConfig, night: string): DigestJsonResult {
  const digest = readNight(config.runsDir, night);
  if (digest === null) {
    return { status: 404 };
  }
  return { status: 200, body: digest.rows };
}
