# The Hall scores

Original music for every published cabinet, synthesised in the browser from a written
score rather than shipped as audio files. `js/audio.js` is the engine, `js/scores.js`
is the music.

## Why generated and not recorded

The Hall's contract is original cabinets only. A score built from a scale, a chord
progression and a seeded melody is unambiguously ours — nothing to clear, nothing
borrowed from a machine somebody else built. It also weighs nothing: the soundtrack
for seven games is two files. And it can react, which a mixdown cannot.

## Adaptive arrangement

Each cab reports a tension in 0..1 derived from **state it already publishes for its
agent lane**. No cab was modified to feed the music. Tension gates whole layers rather
than turning a volume knob — vertical remixing, the way game scores actually do this:

| tension | layer added |
|--------:|-------------|
| always  | pad |
| > 0.04  | bass |
| > 0.22  | drums |
| > 0.38  | arpeggio |
| > 0.60  | lead (density rises with tension) |
| > 0.72  | counter-line |
| > 0.78  | sub-octave bass |
| > 0.82  | doubled kick |
| > 0.88  | octave-doubled lead |

| cab | mode | bpm | tension is |
|-----|------|----:|------------|
| WELL | aeolian | 138 | stack height, holes counted against you |
| VOID | dorian | 96 | rock density, spiking on a lost life |
| TAR | phrygian | 152 | heat — the game's own aggression counter |
| FLIP | mixolydian | 128 | balls spent, and whether one is live |
| CUBE | harmonic minor | 112 | closing speed, which only ever rises |
| GRAIN | lydian | 84 | rate of reactions — nothing here can kill you |
| HAUL | aeolian | 68 | crew lost, habitat, stores, and distance covered |

Melodies come from a seeded RNG keyed on the cab id, so WELL's theme is WELL's theme
every time. A score that improvises fresh each session is a wind chime, not a soundtrack.

## Audit

`tools/audio-audit.html` renders every score at a ladder of tension values through the
engine's own `emit()` — via `HallAudio.renderOffline` — and measures RMS, peak, clipping
and per-layer note counts. It drives the real code path deliberately: the first version
re-implemented the arrangement beside it, which meant it could pass while the engine
drifted underneath.

**Standing gates, all currently passing:**
- zero clipped samples across all 35 renders
- no cab saturates early (5/5 distinct arrangements across the tension ladder)
- RMS rises monotonically with tension on every cab
- RMS spread between cabs ≤ 0.6 dB at every tension level

## What the audit caught that listening would not have

1. **The arrangement saturated at 0.70.** Tension 0.70 and 1.00 produced *identical*
   note counts in every layer on every cab. The top third of the dial was decorative.
   Fixed with a counter-line, doubled kick, sixteenth hats and octave doubling.
2. **The resting state was inaudible** at about −46 dBFS — silence under any game's own
   effects.
3. **CUBE pinned at peak 0.7103 across three tension levels** — the signature of one
   transient slamming the compressor. Its RMS was *below* average; it was never loud,
   just spiky. Chased for three iterations before the measurement showed the peak was
   **one sample in 176,400** and therefore inaudible. Recorded because knowing when to
   stop optimising is worth as much as the fix.
4. **FLIP's tension ran backwards.** `balls` is balls *remaining*, not a multiball count.
   The table opened at 0.85 and got calmer every time you drained. Corrected: the
   plunger is quiet, a live ball is tense, the last ball is the tensest thing on it.
5. **HAUL could not reach its own upper layers.** A ship down a crew member with half
   its habitat gone measured 0.29, so the melody never played. Voyage progress is now
   its own pressure and the score builds across the transit.

## Playing

Silent until the player acts — browsers require a gesture, and a machine that starts
making noise before you touch it is obnoxious. `M` or the `♪` button toggles; the
choice persists in `localStorage` under `hall.audio`.
