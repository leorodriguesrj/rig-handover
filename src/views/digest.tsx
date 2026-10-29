import type { DigestRow, NightDigest } from '../digest/types.js';

function rowIsWarn(row: DigestRow): boolean {
  return row.retries >= 3 || row.lastStatus === 'fail';
}

export function DigestPage({ digest }: { digest: NightDigest }) {
  const emptyNight = digest.rows.length === 0 && digest.badLines === 0;

  return (
    <>
      <h1>digest · {digest.night}</h1>
      {emptyNight ? (
        <p class="mute">nothing ran</p>
      ) : (
        <>
          {digest.badLines > 0 ? (
            <p class="mute">
              {digest.badLines} bad line{digest.badLines === 1 ? '' : 's'} skipped
            </p>
          ) : null}
          <table>
            <thead>
              <tr>
                <th>job</th>
                <th>owner</th>
                <th>runs</th>
                <th>retries</th>
                <th>last</th>
                <th>error</th>
                <th>first</th>
                <th>last</th>
              </tr>
            </thead>
            <tbody>
              {digest.rows.map((row) => (
                <tr class={rowIsWarn(row) ? 'warn' : undefined}>
                  <td>{row.job}</td>
                  <td>{row.owner ?? '—'}</td>
                  <td>{row.runs}</td>
                  <td>{row.retries}</td>
                  <td>{row.lastStatus}</td>
                  <td>{row.lastError ?? '—'}</td>
                  <td>{row.firstAt}</td>
                  <td>{row.lastAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
