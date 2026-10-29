import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { RigConfig } from '../src/config.js';

const NIGHT = '2026-11-01';
const MISSING_NIGHT = '2099-01-01';

const baseConfig: Omit<RigConfig, 'runsDir'> = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
};

function appFor(runsDir: string) {
  return createApp({ ...baseConfig, runsDir });
}

describe('digest routes', () => {
  let runsDir: string;

  beforeEach(() => {
    runsDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  });

  afterEach(() => {
    rmSync(runsDir, { recursive: true, force: true });
  });

  function writeNight(night: string, content: string) {
    writeFileSync(join(runsDir, `${night}.jsonl`), content, 'utf8');
  }

  const sampleLog = [
    '{"at":"2026-11-01T01:00:00+01:00","job":"alpha/job","status":"ok","owner":"rook"}',
    '{"at":"2026-11-01T02:00:00+01:00","job":"beta/job","status":"fail","owner":"lane-07","error":"boom"}',
  ].join('\n');

  describe('GET /digest/:night', () => {
    it('returns 200 with rendered rows for a night with data', async () => {
      writeNight(NIGHT, sampleLog);
      const res = await appFor(runsDir).request(`/digest/${NIGHT}`);
      const html = await res.text();

      expect(res.status).toBe(200);
      expect(html).toContain(`digest · ${NIGHT}`);
      expect(html).toContain('alpha/job');
      expect(html).toContain('beta/job');
      expect(html).toContain('boom');
      expect(html).toMatch(/class="warn"/);
    });

    it('returns 404 when the night file is missing', async () => {
      const res = await appFor(runsDir).request(`/digest/${MISSING_NIGHT}`);
      expect(res.status).toBe(404);
    });

    it('returns 200 with nothing ran for an empty night file', async () => {
      writeNight(NIGHT, '');
      const res = await appFor(runsDir).request(`/digest/${NIGHT}`);
      const html = await res.text();

      expect(res.status).toBe(200);
      expect(html).toContain('nothing ran');
      expect(html).not.toContain('<table>');
    });

    it('returns 200 when the file has a bad line', async () => {
      writeNight(NIGHT, `not valid jsonl\n${sampleLog}`);
      const res = await appFor(runsDir).request(`/digest/${NIGHT}`);
      const html = await res.text();

      expect(res.status).toBe(200);
      expect(html).toContain('1 bad line skipped');
      expect(html).toContain('alpha/job');
      expect(html).toContain('beta/job');
    });
  });

  describe('GET /api/digest/:night', () => {
    it('returns 200 with rows JSON for a night with data', async () => {
      writeNight(NIGHT, sampleLog);
      const res = await appFor(runsDir).request(`/api/digest/${NIGHT}`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual([
        expect.objectContaining({ job: 'alpha/job', lastStatus: 'ok' }),
        expect.objectContaining({ job: 'beta/job', lastStatus: 'fail', lastError: 'boom' }),
      ]);
    });

    it('returns 404 when the night file is missing', async () => {
      const res = await appFor(runsDir).request(`/api/digest/${MISSING_NIGHT}`);
      expect(res.status).toBe(404);
    });

    it('returns 200 with an empty array for an empty night file', async () => {
      writeNight(NIGHT, '');
      const res = await appFor(runsDir).request(`/api/digest/${NIGHT}`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([]);
    });

    it('returns 200 with rows when the file has a bad line', async () => {
      writeNight(NIGHT, `not valid jsonl\n${sampleLog}`);
      const res = await appFor(runsDir).request(`/api/digest/${NIGHT}`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(2);
      expect(body.map((r: { job: string }) => r.job)).toEqual(['alpha/job', 'beta/job']);
    });
  });

  it('page and JSON agree on job order for the same night', async () => {
    writeNight(NIGHT, sampleLog);
    const app = appFor(runsDir);
    const [htmlRes, jsonRes] = await Promise.all([
      app.request(`/digest/${NIGHT}`),
      app.request(`/api/digest/${NIGHT}`),
    ]);
    const html = await htmlRes.text();
    const rows = (await jsonRes.json()) as { job: string }[];

    expect(htmlRes.status).toBe(200);
    expect(jsonRes.status).toBe(200);
    for (const row of rows) {
      expect(html).toContain(row.job);
    }
    const alphaPos = html.indexOf('alpha/job');
    const betaPos = html.indexOf('beta/job');
    expect(alphaPos).toBeGreaterThan(-1);
    expect(betaPos).toBeGreaterThan(alphaPos);
  });
});
