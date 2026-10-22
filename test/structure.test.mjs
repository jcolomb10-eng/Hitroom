import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// deux méthodes du même nom dans une classe : la 2e efface la 1re sans prévenir
// (arrivé en 1.12 : report() des signalements avait remplacé report() des salons publics)
test('pas deux méthodes du même nom dans le Hub ni dans un salon', () => {
  for (const f of ['src/hub.js', 'src/room.js']) {
    const names = [...readFileSync(new URL('../' + f, import.meta.url), 'utf8').matchAll(/^ {2}(?:async )?([a-zA-Z_]\w*)\(/gm)].map(m => m[1]);
    const dup = names.filter((n, i) => names.indexOf(n) !== i);
    assert.deepEqual(dup, [], `${f} : ${dup.join(', ')}`);
  }
});
