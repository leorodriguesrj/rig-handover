import type { RigConfig } from '../config.js';
import { lane } from '../lane.js';
import { Layout } from '../views/layout.js';
import { DigestPage } from '../views/digest.js';
import { readNight } from './read.js';

export type DigestHtmlResult =
  | { status: 404 }
  | { status: 200; body: ReturnType<typeof Layout> };

export function digestHtml(config: RigConfig, night: string): DigestHtmlResult {
  const digest = readNight(config.runsDir, night);
  if (!digest) return { status: 404 };

  return {
    status: 200,
    body: (
      <Layout title={`digest ${night}`} lane={lane()}>
        <DigestPage digest={digest} />
      </Layout>
    ),
  };
}
