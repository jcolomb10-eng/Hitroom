"""Musique d'ambiance de l'accueil : boucle originale composée par programme (libre de droits).

Usage : python3 tools/musique.py public/fonds/ambiance   (écrit ambiance.m4a et ambiance.ogg)
Lo-fi rêveuse à 84 BPM, 16 mesures (≈ 46 s) : nappe, piano électrique, basse, arpège avec écho, batterie douce
(à partir de la mesure 5), léger craquement de vinyle. Les fins de notes et la réverbération débordent sur le début :
la boucle se raccorde sans coupure. Encodée en AAC (.m4a) et en Opus (.ogg, pour les navigateurs sans AAC) ;
l'appli la joue en boucle avec Web Audio.
"""
import os, subprocess, sys, tempfile, wave
import numpy as np

SR = 44100
BPM = 84
BEAT = 60 / BPM
BAR = 4 * BEAT
BARS = 16
L = int(round(BARS * BAR * SR))     # longueur de la boucle en échantillons
TAIL = int(4 * SR)                  # débordement ramené au début
N = L + TAIL
rng = np.random.default_rng(7)

def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)

# accords (notes MIDI) : Fmaj9 | Em7 | Am9 | Cmaj7, quatre fois
PROG = [
    (41, [57, 60, 64, 67]),   # F  : la do mi sol
    (40, [55, 59, 62, 64]),   # Em : sol si ré mi
    (45, [55, 59, 60, 64]),   # Am : sol si do mi
    (36, [55, 59, 60, 64]),   # C  : sol si do mi
]
chord = lambda bar: PROG[bar % 4]

def stem():
    return np.zeros((N, 2))

def add(buf, start_s, sig, pan=0.0, gain=1.0):
    i = int(start_s * SR)
    if i >= N:
        return
    sig = sig[:N - i] * gain
    l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    buf[i:i + len(sig), 0] += sig * l
    buf[i:i + len(sig), 1] += sig * r

def env(n, a, d, s=0.0, r=None):
    """Enveloppe : attaque a, déclin exponentiel d (secondes) vers le niveau s, relâchement r à la fin."""
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    e = e * (s + (1 - s) * np.exp(-np.maximum(t - a, 0) / max(d, 1e-4)))
    if r:
        k = int(r * SR)
        e[-k:] *= np.linspace(1, 0, k) ** 2
    return e

def fft_filter(x, lo=None, hi=None, slope=2):
    """Filtre doux passe-haut (lo) et passe-bas (hi), appliqué à toute une piste."""
    X = np.fft.rfft(x, axis=0)
    f = np.fft.rfftfreq(len(x), 1 / SR)[:, None]
    g = np.ones_like(f)
    if hi:
        g /= np.sqrt(1 + (f / hi) ** (2 * slope))
    if lo:
        g /= np.sqrt(1 + (lo / np.maximum(f, 1)) ** (2 * slope))
    return np.fft.irfft(X * g, n=len(x), axis=0)

def saw(freq, n, harm=14):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(1, harm + 1):
        if freq * k > 9000:
            break
        out += np.sin(2 * np.pi * freq * k * t + k * 0.7) / k
    return out

# ---------- nappe (scie désaccordée, filtrée, attaque lente) ----------
pad = stem()
for bar in range(BARS + 1):
    _, notes = chord(bar)
    n = int((BAR + 1.2) * SR)
    e = env(n, 0.7, 9, s=0.85, r=1.2)
    for m in notes:
        for det, pan in ((-7, -0.6), (0, 0), (7, 0.6)):
            add(pad, bar * BAR, saw(hz(m) * 2 ** (det / 1200), n) * e, pan, 0.05)
pad = fft_filter(pad, lo=120, hi=1400)

# ---------- piano électrique (sinus + harmonique, trémolo), accords syncopés ----------
keys = stem()
def ep(freq, n):
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(4 * np.pi * freq * t) * np.exp(-t / 0.3)
    return s * (1 + 0.15 * np.sin(2 * np.pi * 4.5 * t)) * env(n, 0.005, 1.4, r=0.3)
for bar in range(BARS):
    _, notes = chord(bar)
    for beat, vel in ((0, 1.0), (1.5, 0.7), (3, 0.5)):
        for j, m in enumerate(notes):
            add(keys, bar * BAR + beat * BEAT + j * 0.012, ep(hz(m + 12), int(2.2 * SR)), (j - 1.5) * 0.25, 0.045 * vel)
keys = fft_filter(keys, lo=180, hi=3200)

# ---------- basse (sinus chaud, légère saturation) ----------
bass = stem()
def bassnote(freq, n):
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t)
    return np.tanh(1.6 * s * env(n, 0.01, 0.9, s=0.5, r=0.08))
for bar in range(BARS):
    root, _ = chord(bar)
    f = hz(root) if root >= 40 else hz(root + 12)
    add(bass, bar * BAR, bassnote(f, int(1.4 * BEAT * SR)), 0, 0.16)
    add(bass, bar * BAR + 2.5 * BEAT, bassnote(f, int(1.2 * BEAT * SR)), 0, 0.12)
    add(bass, bar * BAR + 3.5 * BEAT, bassnote(f * 1.5, int(0.45 * BEAT * SR)), 0, 0.08)
bass = fft_filter(bass, hi=900)

# ---------- arpège (pincé) avec écho, à partir de la mesure 5 ----------
arp = stem()
def pluck(freq, n):
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(6 * np.pi * freq * t) * np.exp(-t / 0.08)) * env(n, 0.003, 0.28)
PATTERN = [0, 2, 1, 3, 2, 1, 3, 2]
for bar in range(4, BARS):
    _, notes = chord(bar)
    for k, idx in enumerate(PATTERN):
        swing = 0.08 * BEAT if k % 2 else 0
        add(arp, bar * BAR + k * BEAT / 2 + swing, pluck(hz(notes[idx] + 24), int(0.6 * SR)), [-0.4, 0.4][k % 2], 0.05 * (1 if k % 2 == 0 else 0.7))
# écho en ping-pong (3/8 de mesure)
d = int(0.75 * BEAT * SR)
echo = np.zeros_like(arp)
src = arp.copy()
for i in range(1, 5):
    shifted = np.zeros_like(src)
    shifted[d * i:] = src[:-d * i]
    if i % 2:
        shifted = shifted[:, ::-1]
    echo += shifted * (0.38 ** i)
arp = fft_filter(arp + echo, lo=400, hi=5000)

# ---------- batterie douce (à partir de la mesure 5) ----------
drums = stem()
def kick():
    n = int(0.4 * SR); t = np.arange(n) / SR
    f = 48 + 70 * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.16)
def snare():
    n = int(0.3 * SR); t = np.arange(n) / SR
    noise = fft_filter(rng.standard_normal((n, 1)), lo=1200, hi=6000)[:, 0]
    return (0.7 * noise / np.abs(noise).max() + 0.4 * np.sin(2 * np.pi * 190 * t)) * env(n, 0.002, 0.09)
def hat():
    n = int(0.08 * SR)
    noise = fft_filter(rng.standard_normal((n, 1)), lo=7000)[:, 0]
    return noise / np.abs(noise).max() * env(n, 0.001, 0.02)
K, S_, H = kick(), snare(), hat()
kicks = []
for bar in range(4, BARS):
    for b in (0, 2.5) if bar % 4 == 3 else (0, 2):
        add(drums, bar * BAR + b * BEAT, K, 0, 0.5); kicks.append(bar * BAR + b * BEAT)
    for b in (1, 3):
        add(drums, bar * BAR + b * BEAT + 0.01, S_, 0.05, 0.16)
    for k in range(8):
        add(drums, bar * BAR + k * BEAT / 2 + (0.08 * BEAT if k % 2 else 0), H, 0.3, 0.05 if k % 2 else 0.08)
drums = fft_filter(drums, hi=9000)

# pompe de la nappe et du piano sur la grosse caisse
duck = np.ones(N)
for s in kicks:
    i = int(s * SR); n = min(int(0.45 * SR), N - i)
    duck[i:i + n] *= 1 - 0.35 * np.exp(-np.arange(n) / SR / 0.12)
pad *= duck[:, None]; keys *= duck[:, None]

# ---------- craquement de vinyle ----------
crackle = stem()
for _ in range(int(BARS * BAR * 6)):
    i = rng.integers(0, L)
    crackle[i, rng.integers(0, 2)] += rng.uniform(-1, 1) * 0.05
crackle = fft_filter(crackle, lo=1500, hi=7000)

# ---------- réverbération (convolution) ----------
def reverb(x, secs=2.4, wet=0.28):
    n = int(secs * SR); t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-t / (secs / 5))[:, None]
    ir = fft_filter(ir, hi=4500)
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    m = len(x) + n
    y = np.fft.irfft(np.fft.rfft(x, m, axis=0) * np.fft.rfft(ir, m, axis=0), m, axis=0)[:len(x)]
    return x + wet * y

music = reverb(pad + keys + arp, 2.6, 0.32) + reverb(drums, 1.2, 0.12) + bass + crackle
# la fin (notes et réverbération qui débordent) revient sur le début : boucle sans raccord
loop = music[:L].copy()
loop[:TAIL] += music[L:L + TAIL]
loop = np.tanh(1.3 * loop) / 1.3
loop /= np.abs(loop).max() / 0.89

base = sys.argv[1]
with tempfile.TemporaryDirectory() as tmp:
    wav = os.path.join(tmp, 'ambiance.wav')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((loop * 32767).astype('<i2').tobytes())
    for ext, codec in (('m4a', ['-c:a', 'aac', '-b:a', '112k', '-movflags', '+faststart']), ('ogg', ['-c:a', 'libopus', '-b:a', '96k'])):
        out = f'{base}.{ext}'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-af', 'loudnorm=I=-17:TP=-1.5:LRA=9', '-ar', '48000' if ext == 'ogg' else str(SR), *codec, out], check=True)
        print(f'{out} : {L / SR:.2f} s, {os.path.getsize(out) // 1024} Ko')
