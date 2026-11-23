# The Word Storm algorithm

This is the spec the TypeScript port follows. It describes what the original
Java code (`src/`) actually does, separated from the WordCram/Processing
scaffolding it is built on. Quirks of the Java version are called out as
**Java quirk**, and places where the port deliberately differs as **Port**.

Method reference: Quim Castella and Charles Sutton, *Word Storms: Multiples of
Word Clouds for Visual Comparison of Documents*, WWW 2014.

## Inputs and outputs

- **Input:** a list of documents `{name, text}`. Each document becomes one cloud.
- **Output:** for every cloud, a list of placed words with `text`, font `size`,
  `angle` (0 or ±π/2), `color`, and the top-left corner `(x, y)` of the word's
  tight bounding box, all in one shared coordinate frame of `width × height`.

Defaults used by the Java launchers: 25 words per cloud, 640×480 clouds,
font sizes 8–65 px, seed 123456.

## 1. Text → weighted words (per document)

1. Lower-case the text (`textCase`: lower by default; upper and as-is exist).
2. Tokenize. A token is `[@+letter/digit]+` optionally joined by
   `- . : / ' ’ U+2032 NBSP ZWNJ ZWJ ~` or combining marks to more letter/digit
   runs (cue.language `WordIterator`).
3. Drop stop words: single-character tokens, and tokens in the stop list
   (cue.language guesses the language by which list matches the most tokens;
   English is the one that matters for the examples). `’` is normalized to `'`
   before lookup.
   **Port:** the default list is `extended`: the list above plus common
   verbs, adverbs and determiners (one, now, come, went, must, much…), early
   modern English function words (thou, hath, 'tis…) and title
   abbreviations (mr, mrs, dr). The original list is still available as
   `english`, and `npm run compare` uses it so word choice matches Java.
4. Drop tokens that parse as numbers. **Port:** also strip a trailing `'s`
   so possessives count with their noun (`romney's` → `romney`); the stop
   list is checked before stripping, so `it's` and `that's` stay stop words.
5. Count occurrences.
6. Merge plurals: if both `x` and `xs` exist, add the count of `xs` to `x` and
   drop `xs`. **Java quirk:** the loop removes items while iterating, so some
   pairs are skipped (the reference has both `job` and `jobs` in some clouds).
   **Port:** merge all pairs.
7. Sort by count, descending. Ties: **Java quirk** — `Word.compareTo` order on
   equal weights is not specified here; **Port:** break ties alphabetically.
8. Keep the top `maxWords`.
9. Normalize: `weight_i = 1.2 · count_i · n / (2 · Σcount)`, so the mean
   weight is 0.6. `origWeight = weight`.

### Port: keyness and size contrast

Two port-only steps (`JAVA_OPTIONS` turns keyness off):

- **Keyness** (`distinctiveness` = s, default 0.2), between steps 5 and 7:
  multiply each count by `(rate_doc(w) / rate_corpus(w))^s`, where a rate is
  the word's count over all counted words. A word used at the same rate
  everywhere keeps its count; one a document uses twice as much as the corpus
  is multiplied by `2^s`. Unlike tf-idf, a word in every document is not
  zeroed, so shared words stay to coordinate.
- **Size contrast** (`sizeExponent` = e, default 1 as in Java): step 9
  normalizes `count^e` instead of `count`; `e > 1` widens the gap between the
  top word and the rest, `e < 1` narrows it.

### Optional idf

`D` = number of clouds, `idf(w) = ln(D / df(w)) / ln(D)` (0 for a word in
every cloud, 1 for a word in one cloud).

- `weighting: "tfidf"` (Java `tfIdf = 1`): between steps 7 and 8, multiply
  every counted word's count by idf, where `df` counts the documents whose
  *full* vocabulary contains the word, then re-sort. Steps 8–9 then apply as
  usual.
- `idfColor` (Java `tfIdf = 2`): weights untouched; `df` counts the clouds
  whose *top* words contain the word, and idf only sets color opacity (see 3).

## 2. The shared index

For each distinct word across clouds, keep a `CoordProp`: which clouds contain
it, the word object per cloud, the current location per cloud (unset at
first), the average of the set locations, its color, angle and idf.

Words that appear in only one cloud are **unique**; they are set aside after
the index is built and placed at the very end (step 6), at their original
weight.

## 3. Size, angle and color

- **Size:** `size = lerp(8, 65, weight)` px.
- **Angle**, coordinated (`coorAngler`): one angle per word for the whole
  storm, picked uniformly from `[0, 0, 0, 0, 0, +π/2, −π/2]`.
  Independent: same distribution, drawn per cloud.
  **Port:** the vertical share is an option (`verticalShare`, default 2/7 as in Java,
  split evenly between +π/2 and −π/2; Java: 2/7).
- **Color**, coordinated (`coorColorer`): one color per word. HSB on a 0–255
  scale: hue `U(0,256)`, saturation 200, brightness `50 + U(0,150)`. With
  `idfColor`, alpha is a logistic of idf so words shared by every cloud fade:
  `alpha = 2.55 · (40 + 60 / (1 + e^(−20 (idf − 0.2))))` (≈40% → 100%).
  Independent: same HSB distribution, drawn per word per cloud, opaque.
  **Port:** colors come from a palette (uniform pick from its list, same
  coordination rules); the `classic` palette keeps the HSB distribution above.
  `idfColor` fading is off by default.
- **Port: marking shared words** (`markShared`):
  - `none` (the default): no marking, as in Java.
  - `weight`: words that only one cloud has are measured and drawn in the
    font's light weight.
  - `warmth`: the color comes from the palette's warm list for shared words
    and its cool list for the others. `classic` uses HSB hue ranges instead.

## 4. Placement primitive (spiral search)

Given a desired top-left location `d` for a word with box `w × h` on a field
`W × H`:

```
for attempt in 0 ..< 5000:
  t    = attempt / 600
  r    = lerp(1, 100, t^0.6)
  step = lerp(0.5, 0.3, t)
  θ    = step · attempt
  p    = d + (r cos θ, r sin θ)
  if p is outside [0, W−w) × [0, H−h): continue
  if word at p collides with an already-placed word in this cloud: continue
  return p
fail
```

Collision is tested on the glyph shape (a quadtree of boxes down to 1 px,
padded by 1 px), except in the Combined/Force algorithms, where shared words
collide as bounding boxes only. **Port:** glyph collision uses a 1-bit pixel
mask per word, tested against a per-cloud bitmap (the d3-cloud technique);
box collision stays boxes.

The default desired location (`centerClump`) is
`round(map(N(0,1) · 0.4, −2, 2, 0, W − w))` for x, and the same with `H − h`
for y: a Gaussian clump around the center.

## 5. Coordinated layout

### 5a. Iterative (Java `coorPlacer = 1`, and the first phase of Combined)

Per pass, for each cloud in order, for each shared word in descending weight:

- desired location = the average of this word's current locations in all
  clouds where it has one; if it has none yet, a tighter Gaussian clump
  (`σ = 0.2` instead of 0.4);
- place it with the spiral search;
- after the whole cloud is placed, write all its locations back to the index
  (so later clouds in the same pass see them).

If any word in any cloud fails to place, multiply every word's weight and size
in every cloud by 0.9 and restart the pass from cloud 0.

A word instance has **converged** when it is within `tol` px of its average.
Repeat passes while some instance hasn't converged, up to `maxIterations`
(5). With `tol = −1` only one pass is done.

**Java quirk:** Combined runs this phase on a half-size field (320×240 for
640×480) with the same font sizes, so the first layout is crowded and the
force phase has to spread it out. The port keeps this, since it shapes the
result.

### 5b. Force (Java `coorPlacer = 3`, and the second phase of Combined)

Each iteration, for each cloud, for each shared word in order, move the word by
`−step`, where `step` is the sum of three gradients:

- **Same word (stress)**, weight `sameEps`:
  for every other cloud `j` that contains the word,
  `step += sameEps · 1e-6 · S[j][i] · (cur − loc_j)`, where `S` is the
  per-cloud-pair stress term below. `S` is negative when the clouds' layouts
  are farther apart than their texts, which pulls the word toward its
  position in similar clouds.
- **Overlap**, weight `overEps`: for every word it currently overlaps (as
  boxes) in this cloud, add the minimal axis-aligned push that separates them
  (whichever of left, right, up, down needs the least distance), times
  `0.1 · overEps`.
- **Compactness**, weight `compEps`: the vector from the field center to the
  word, normalized if longer than 1, times `0.1 · compEps`.

`|step|` is clamped to 30 px. There is no collision search in this phase:
words just move. Overlaps are recorded after each move, against the words of
that cloud already moved in this iteration, symmetrically.

**Stress matrix:** for clouds `i, j`,
`docDis(i,j) = Σ_w (weight_i(w) − weight_j(w))²` over the union of their words
(missing = 0), computed once at the start. `cloudDis(i,j) = docDis(i,j)` (with
current weights) `+ Σ_{shared w} |loc_i(w) − loc_j(w)|²`.
`S[i][j] = (docDis − cloudDis) / docDis` (denominator 1 if 0).
**Java quirk:** `S` is only recomputed when the progress line is printed
(every 50 iterations). **Port:** recompute every iteration.

**Convergence:** `gradient` is the largest `|step|` in an iteration. Run the
stages of the schedule in order; a stage ends when `gradient < 0.2`, the
second-to-last when `gradient < 0.1001`, and the last when the largest single
overlap penalty `< 10` or `gradient < 0.01` for two iterations in a row
(overlap penalty = `(min overlap depth + 1)²`). **Java quirk:** the largest
overlap is reset every iteration but only recomputed when progress is printed,
so the last stage usually ends immediately. **Port:** recompute it every
iteration, so the last stage really pushes overlaps apart. Iterations are
capped at 20,000 (Java: 1,000,000).

Combined schedule (`overEps, sameEps, compEps`):

| stage | overlap | same word | compact |
|---|---|---|---|
| 0 | 0 | 1 | 0 |
| 1 | 0.1 | 1 | 0.5 |
| 2 | 0 | 1 | 0 |
| 3 | 1 | 1 | 0.5 |
| 4 | 1 | 0.1 | 0.5 |
| 5 | 1 | 0 | 0.9 |
| 6 | 10 | 0 | 0 |

Pure Force starts from random locations and uses an 8-stage schedule that
ramps overlap up and same-word down; the port implements Combined first.

## 6. Unique words

For each cloud, with the shared words fixed where they ended, place each
unique word (descending weight) with the spiral search from a `centerClump`
location, glyph collision, **no** field-bounds check. Unplaced ones are
dropped.

## 7. Fit to output

Take the union bounding box of every placed word in every cloud (2 px
padding), translate so it starts at (0, 0), and scale positions and sizes by
`min(W / boxW, H / boxH)`. Every cloud shares this transform, so the same
word stays at the same spot across clouds. **Port:** also center the result
in the frame (Java leaves it at the top-left).

**Port (independent mode):** every word is placed in weight order with glyph
collision and the field-bounds check; the Java version placed shared and
unique words in two rounds even though nothing is coordinated.

## Modes exposed by the port

| Port mode | Java settings | What you get |
|---|---|---|
| `independent` | `coorPlacer 0`, no coordination | Separate clouds, for comparison |
| `coordinated` | `coorPlacer 4` (Combined), coordinated color + angle, `idfColor`, `tol 50`, 5 iterations | The word storm |

## Randomness

All randomness comes from one seeded generator (**Port:** mulberry32 plus
Box–Muller for Gaussians), so a given seed gives the same storm. The port does
not reproduce Java's `java.util.Random` sequence, so layouts match the
reference in character and scores, not pixel for pixel.
