# The Long Haul soundtrack

Eight-track cue sheet for the browser game. No audio is in git yet. The player at
`hall/haul/index.html` reads `tracks.json`, stays quiet when a file is missing, and
starts only after the first tap or keypress.

The procedural cabinet score (`js/audio.js`, the ♪ button) is the fallback while this
folder is empty. When a reel actually loads, it takes the speakers and the cabinet
score waits.

## Where files go

Drop masters in **`hall/haul/audio/tracks/`**, next to this file’s `tracks.json`.
Ship each cue as **OGG Vorbis** and an **MP3** with the same base name:

| Base name | Role |
| --- | --- |
| `01-ten-seconds-to-rust` | One-shot that ends in a hold loop |
| `02-quiet-between-stars` | Loop |
| `03-kappa-lounge-level-zero` | Loop |
| `04-point-of-no-return-policy` | One-shot that builds into a loop |
| `05-burn-angle` | Loop |
| `05b-burn-angle-touchdown` | Tail, one-shot after Burn Angle |
| `06-dust-on-the-greenhouse-glass` | Loop |
| `07-shop-hours` | Loop |
| `07b-shop-hours-intro` | Intro, one-shot before Shop Hours |
| `08-something-aboard-is-breaking` | Loop |

Example: `tracks/02-quiet-between-stars.ogg` and `tracks/02-quiet-between-stars.mp3`.

The player does not scan the directory (GitHub Pages will not list it). It plays
the base names in `tracks.json`. Add a row there to pick up a new cue. `.gitkeep`
is not a track.

## Loudness

Normalize to about **−16 LUFS** integrated, true peak at or below **−1 dBTP**.
The player does not measure or re-normalize. Unity gain is the master. The volume
slider is the only level control.

## How a row plays

`mode` is `loop`, `one-shot`, or `one-shot-then-loop`.

- **loop** — gapless loop of the body. A separate `intro` base name, if the file
  loads, plays once and the body starts at the exact end of that buffer.
- **one-shot** — plays once, then the next track.
- **one-shot-then-loop** — the opening plays once, then a region holds. Set
  `loopStart` and `loopEnd` in seconds when the master is cut. Audio before
  `loopStart` is the one-shot; `loopStart` through `loopEnd` (or the end of the
  file) repeats. Tracks 01 and 04 are this mode. Until those points are filled in,
  the whole file loops.
- **tail** — a one-shot base name. It plays when that track ends or the listener
  hits Next, then the next track crossfades in. A missing tail is skipped.

Looping uses `AudioBufferSourceNode` (`loop`, `loopStart`, `loopEnd`) on a decoded
buffer. It does not use `<audio loop>`. Intro-to-body handoff is two buffers
scheduled on `AudioContext.currentTime`, so the join is sample-accurate. Track
changes crossfade (default 1.5s, `crossfadeSeconds` in the cue sheet).

The browser picks the extension with `canPlayType`: OGG Vorbis when it can play
`audio/ogg; codecs="vorbis"`, otherwise MP3. If the chosen file 404s, it tries the
other extension. A missing body drops that title from the reel. A missing intro or
tail drops only that piece.

Prefer the OGG for gapless loops. The MP3 of each delivered cue has about 23 ms
of encoder priming at the start (1105 samples at 48 kHz; ffprobe reports a start
time of about 0.023 s). Loop points in `tracks.json` are on the OGG timeline.
Chrome's `decodeAudioData` removes that prime, so the MP3 buffer matches the OGG
and the same points apply. If a decoder leaves the prime in the buffer, the
buffer runs long past the authored `loopEnd` by about one prime, and the player
shifts `loopStart` and `loopEnd` forward by that extra length. It does not shift
a loop that ends seconds before the file does.

Delivered so far, 48 kHz, about −16 LUFS: `01-ten-seconds-to-rust` (hold from
90.186229 s to the file end at 114.186229 s) and `07-shop-hours` (loop 0–120 s)
with intro `07b-shop-hours-intro`.

## Controls

On the title screen and in the voyage bar:

- **MUSIC** — on/off, stored in `localStorage` as `haul.ost.on` (`on` / `off`).
  Default on. This is separate from the cabinet score key `hall.audio`.
- **SHUFFLE** — `haul.ost.shuffle`.
- **NEXT** — crossfade to the next title. Shuffle wraps without repeating the
  current title when it can.
- **VOL** — `haul.ost.volume`, from 0 to 1.

Nothing is fetched into the audio graph until that first gesture. With an empty
`tracks/` folder the buttons still work and the page does not throw.
