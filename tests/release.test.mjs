import assert from 'node:assert/strict';
import test from 'node:test';
import { appVersion, releaseNotes } from '../app/release.ts';

test('each app version must ship with a dated visible release note', () => {
  assert.equal(releaseNotes[0].version, appVersion, '更新版本时必须补充本版本更新内容');
  assert.equal(new Set(releaseNotes.map(release => release.version)).size, releaseNotes.length);
  for (const release of releaseNotes) {
    assert.match(release.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Number.isFinite(Date.parse(release.date)));
    assert.ok(release.items.length > 0);
    assert.ok(release.items.every(item => item.trim().length > 0));
  }
});
