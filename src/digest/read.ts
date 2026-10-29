import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, DigestStatus, NightDigest, ReadNight } from './types.js';

type LogLine = {
  at: string;
  job: string;
  status: DigestStatus;
  owner: string | null;
  error?: string;
};

const STATUSES = new Set<DigestStatus>(['ok', 'retry', 'fail']);

function parseLine(line: string): LogLine | null {
  try {
    const raw = JSON.parse(line) as Record<string, unknown>;
    if (typeof raw.at !== 'string' || typeof raw.job !== 'string') return null;
    if (typeof raw.status !== 'string' || !STATUSES.has(raw.status as DigestStatus)) return null;
    if (!(raw.owner === null || typeof raw.owner === 'string')) return null;
    const out: LogLine = {
      at: raw.at,
      job: raw.job,
      status: raw.status as DigestStatus,
      owner: raw.owner,
    };
    if (typeof raw.error === 'string') out.error = raw.error;
    return out;
  } catch {
    return null;
  }
}

export const readNight: ReadNight = (runsDir, night) => {
  const path = join(runsDir, `${night}.jsonl`);
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return null;
  }

  const byJob = new Map<
    string,
    {
      owner: string | null;
      runs: number;
      retries: number;
      lastStatus: DigestStatus;
      lastError: string | null;
      firstAt: string;
      lastAt: string;
    }
  >();
  let badLines = 0;

  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const parsed = parseLine(line);
    if (!parsed) {
      badLines += 1;
      continue;
    }
    const existing = byJob.get(parsed.job);
    if (!existing) {
      byJob.set(parsed.job, {
        owner: parsed.owner,
        runs: 1,
        retries: parsed.status === 'retry' ? 1 : 0,
        lastStatus: parsed.status,
        lastError: parsed.error ?? null,
        firstAt: parsed.at,
        lastAt: parsed.at,
      });
      continue;
    }
    existing.runs += 1;
    if (parsed.status === 'retry') existing.retries += 1;
    existing.owner = parsed.owner;
    existing.lastStatus = parsed.status;
    existing.lastError = parsed.error ?? null;
    existing.lastAt = parsed.at;
  }

  const rows: DigestRow[] = [...byJob.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([job, row]) => ({ job, ...row }));

  return { night, rows, badLines };
};
