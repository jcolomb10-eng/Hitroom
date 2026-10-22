// Sources d'extraits de 30 s : iTunes d'abord, Deezer en secours.
// getJSON(source, url) est fourni par le Hub (gère erreurs, pauses et diagnostic).
import { pickBest } from './itunes.js';

const art600 = u => (u || '').replace(/\/\d+x\d+bb\./, '/600x600bb.');

export async function itunesFind(getJSON, song) {
  const term = `${song.a[0]} ${song.t[0]}`;
  const d = await getJSON('it', `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=15&country=FR`);
  const b = pickBest(d.results, song);
  return b ? { ok: 1, src: 'it', ext: String(b.trackId || ''), url: b.previewUrl, art: art600(b.artworkUrl100), link: b.trackViewUrl || '' } : null;
}

const dzShape = x => ({
  kind: 'song', artistName: x.artist?.name || '', trackName: x.title || '', collectionName: x.album?.title || '', previewUrl: x.preview || '', rank: x.rank || 0, x,
});

export async function deezerFind(getJSON, song) {
  // recherche simple d'abord (la recherche avancée « artist: » ne répond plus rien en octobre 2026), avancée en secours
  const queries = [`${song.a[0]} ${song.t[0]}`, `artist:"${song.a[0]}" track:"${song.t[0]}"`];
  for (const q of queries) {
    const d = await getJSON('dz', `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=25`);
    const b = pickBest((d.data || []).map(dzShape), song);
    if (b) return { ok: 1, src: 'dz', ext: String(b.x.id), url: b.previewUrl, art: b.x.album?.cover_big || b.x.album?.cover_medium || '', link: b.x.link || '' };
  }
  return null;
}

// les liens d'extraits Deezer expirent : on en redemande un frais à chaque partie
export async function deezerPreview(getJSON, id) {
  const d = await getJSON('dz', `https://api.deezer.com/track/${encodeURIComponent(id)}`);
  return d.preview || null;
}
