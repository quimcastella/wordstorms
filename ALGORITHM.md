# How a word storm is made

This describes the algorithm in [web/src/core/](web/src/core/), from text to
placed words. The method is from Quim Castella and Charles Sutton,
[*Word Storms: Multiples of Word Clouds for Visual Comparison of Documents*](https://arxiv.org/abs/1301.0503),
WWW 2014. The last section lists where this implementation differs from the
one used for the paper.

## Inputs and outputs

- **Input:** a list of documents `{name, text}`. Each document becomes one cloud.
- **Output:** for every cloud, a list of placed words with their text, font
  size, angle (0 or ±90°), color, opacity, and the top-left corner of the
  word's tight bounding box. All clouds share one coordinate frame of
  `width × height` px, so a position means the same thing in every cloud.

Defaults: 35 words per cloud, 640×480 px clouds, font sizes 8–65 px, seed
123456. [`StormOptions`](web/src/core/storm.ts) lists every option;
`generateStorm` checks them all first (`resolveOptions`) and throws on a bad
one, such as a zero width or a fractional word count.

## 1. Choosing the words

For each document:

1. Lower-case the text.
2. Split it into tokens: runs of letters and digits, which may be joined by
   `- . : / ' ’` and a few other connecting characters (so `co-op`, `e-mail`
   and `don't` are single tokens).
3. Drop stop words: one-letter tokens and words in the stop list. The default
   list, `extended`, has common English function words plus common verbs,
   adverbs and determiners (one, now, come, went, must, much…), early modern
   English function words (thou, hath, 'tis…) and title abbreviations (mr,
   mrs, dr). `’` is treated as `'`.
4. Drop numbers, and strip a trailing `'s` so possessives count with their
   noun. The stop list is checked first, so `it's` stays a stop word.
5. Count each word.
6. Merge plurals: if both `x` and `xs` appear, add the count of `xs` to `x`.
7. **Optional tf-idf** (`weighting: "tfidf"`): multiply each count by
   `idf(w) = ln(D / df(w)) / ln(D)`, where `D` is the number of documents and
   `df(w)` the number whose text has the word. A word in every document drops
   to 0.
8. **Keyness** (`distinctiveness` = s, from 0 to 1; default 0.2): multiply each
   count by `(rate_doc(w) / rate_all(w))^s`, where a rate is the word's count
   over all counted words, in this document or in all of them. A word used at
   the same rate everywhere keeps its count; one this document uses twice as
   often as the whole collection is multiplied by `2^s`. Unlike tf-idf, a
   word every document uses is not zeroed, so the clouds keep shared words to
   line up.

   Both factors come from the counts of step 6, and with both on they
   multiply. Words left at 0 (with tf-idf, those in every document) are
   dropped rather than kept as filler, so a cloud can have fewer than
   `maxWords` words, or none if every word it has is in every document.
9. Sort by count (ties alphabetically) and keep the top `maxWords`.
10. **Size contrast** (`sizeExponent` = e, default 1): raise each count to the
    power e. Above 1 widens the gap between the top word and the rest, below
    1 narrows it.
11. Normalize: `weight_i = 0.6 · n · c_i / Σc` for the n kept words, so the
    mean weight is 0.6.

Words kept by two or more documents are **shared**; the rest are **unique** to
one cloud.

## 2. Size, angle and color

- **Size:** `size = lerp(8, 65, weight)` px.
- **Angle:** horizontal, or vertical with probability `verticalShare`
  (default 2/7), split evenly between +90° and −90°.
- **Color:** a uniform pick from the palette. The `classic` palette instead
  draws random HSB colors (0–255 scale: hue uniform, saturation 200,
  brightness 50–200).
- **Marking shared words** (`markShared`):
  - `none` (default): nothing beyond the above.
  - `weight`: unique words are measured and drawn in the font's light weight.
  - `warmth`: shared words take colors from the palette's warm list, unique
    words from its cool list. With `classic`, the random hue is drawn from
    magenta to orange for shared words and from green to indigo for the rest.
- **Fading** (`fadeCommonWords`, off by default): a word's opacity falls with
  how many clouds share it, `opacity = 0.4 + 0.6 / (1 + e^(−20 (idf − 0.2)))`,
  where `idf` is computed as in step 7 but over the clouds' kept words. A word
  in every cloud ends up at about 40%.

In a word storm, a shared word gets one angle and one color, used in every
cloud. In separate clouds, each cloud draws its own.

## 3. Placing one word: the spiral search

Given a desired top-left position `d` for a word with box `w × h` in a field
`W × H`, walk an outward spiral until the word fits:

```
for attempt in 0 ..< 5000:
  t    = attempt / 600
  r    = lerp(1, 100, t^0.6)
  step = lerp(0.5, 0.3, t)
  θ    = step · attempt
  p    = d + (r cos θ, r sin θ)
  if p is outside [0, W−w) × [0, H−h): continue
  if the word at p collides with a word already in this cloud: continue
  return p
fail
```

Collision is tested on the letters' shapes: each word is a 1-bit pixel mask,
grown by 1 px, checked against a bitmap of the cloud. In iterative placement
(4a), shared words collide as solid boxes grown by 1 px instead.

When there is no better guess, the desired position is a Gaussian clump around
the field's center: `x = round(map(N(0,1) · 0.4, −2, 2, 0, W − w))`, and the
same for y with `H − h`.

## 4. The word storm (coordinated layout)

Shared words are laid out first, in all clouds together; unique words fill in
around them at the end. This happens on a half-size field (320×240 for
640×480) with full-size fonts, so the first layout is crowded and the force
phase has to spread it out; step 6 scales everything back to fit.

### 4a. Iterative placement

In each pass, for each cloud in order, place its shared words in descending
weight with the spiral search, starting from the average of the word's current
positions in every cloud that has placed it, including this cloud's own
position from the previous pass (or, if no cloud has placed it yet, a tighter
Gaussian clump with σ = 0.2 instead of 0.4). After a cloud is done, its
positions become visible to the clouds after it.

If any word in any cloud fails to place, every size is multiplied by 0.9 and
the pass starts over. Sizes stop shrinking at 10% of the original: from there
on, a word that still doesn't fit is left out of that pass (and of the rest of
the layout) and reported as skipped, so the layout always ends.

A word has **converged** when it is within `tolerance` px (default 50) of its
average position. Passes repeat until every word has converged, up to
`maxIterations` (default 5). A tolerance of −1 means a single pass.

### 4b. Force refinement

Each iteration moves every shared word, in every cloud, by `−step`, where
`step` is the sum of three gradients:

- **Same word**, weight `sameEps`: for every other cloud `j` that has the word,
  `step += sameEps · 1e-6 · S[j][i] · (cur − loc_j)`. `S` (below) is negative
  when two clouds' layouts are farther apart than their texts, which pulls the
  word toward its position in similar clouds.
- **Overlap**, weight `overEps`: for every word it overlaps (as boxes) in this
  cloud, add the shortest left, right, up or down push that separates them,
  times `0.1 · overEps`.
- **Compactness**, weight `compEps`: the vector from the field's center to the
  word, normalized if longer than 1, times `0.1 · compEps`.

`|step|` is capped at 30 px. Words simply move; there is no collision search in
this phase. Clouds move one after another, so the same-word pull sees this
iteration's positions for the clouds already moved and the previous ones for
the rest. After a cloud moves, its overlaps are found again; the overlap push
uses the ones found when that cloud last moved.

**Similarity of clouds:** for clouds `i` and `j`,
`docDis(i,j) = Σ_w (weight_i(w) − weight_j(w))²` over the union of their words
(a missing word weighs 0), and `sizeDis(i,j)`, the same sum over only the two
clouds' shared words, with weights multiplied by the shrink factor from 4a.
Both are computed once at the start. Then, with the current positions,
`cloudDis(i,j) = sizeDis(i,j) + Σ_{w in both} |loc_i(w) − loc_j(w)|²` and
`S[i][j] = (docDis − cloudDis) / docDis` (1 in the denominator if it is 0),
recomputed every iteration.

**Schedule:** one iteration with every weight at 1 finds the first overlaps.
Then the force phase runs through these stages in order:

| stage | overlap | same word | compactness | ends when `gradient` < |
|---|---|---|---|---|
| 0 | 0 | 1 | 0 | 0.2 |
| 1 | 0.1 | 1 | 0.5 | 0.2 |
| 2 | 0 | 1 | 0 | 0.2 |
| 3 | 1 | 1 | 0.5 | 0.2 |
| 4 | 1 | 0.1 | 0.5 | 0.2 |
| 5 | 1 | 0 | 0.9 | 0.1001 |
| 6 | 10 | 0 | 0 | 0.01, two iterations in a row |

`gradient` is the largest `|step|` in an iteration. Every stage but the last
runs at least once. The last also ends when the largest single overlap
penalty, `(smallest overlap depth + 1)²`, is below 10, which is checked before
its first iteration too. The whole phase stops after `maxForceIterations`
(default 20,000) iterations at most.

### 4c. Unique words

With the shared words fixed, each cloud places its unique words in descending
weight with the spiral search from a Gaussian clump, using shape collision
but no field-bounds check. Words that can't be placed are dropped and reported
as skipped.

## 5. Separate clouds (independent layout)

Each cloud is laid out on its own: every word, in descending weight, goes
through the spiral search from a Gaussian clump, with shape collision and the
field-bounds check, on the full-size field. Shrinking and skipping work as in 4a. Nothing is shared between clouds,
including colors and angles.

## 6. Fitting the result

Take the bounding box of every placed word in every cloud (plus 2 px), scale
positions and sizes by `min(W / boxW, H / boxH)`, and center the result in the
frame. Every cloud gets the same transform, so a shared word stays at the same
spot across clouds.

## Randomness

All randomness comes from one seeded generator (mulberry32, with Box–Muller
for Gaussians), so the same seed and settings always give the same storm.

## Differences from the paper's implementation

The paper's figures were made with an earlier Java implementation, built on
WordCram and Processing. It is no longer in this repository but is kept at the
`java-original` tag. `PAPER_OPTIONS` sets this implementation to the paper's
settings: 25 words, plain counts, the shorter English stop list, random HSB
colors and fading of common words. Layouts match the original in character, not
pixel for pixel, because the random number generators differ. Beyond that:

- **Word choice:** the original stop list is the shorter `english` one; it
  didn't strip possessives; its plural merging skipped some pairs because of a
  bug; and its order for tied counts was unspecified. Keyness
  (`distinctiveness`) and size contrast (`sizeExponent`) are new.
- **Look:** the original used random HSB colors only (the `classic` palette)
  and always made 2 in 7 words vertical. Palettes, the vertical share and
  marking shared words are new.
- **Collision:** the original tested shapes with a quadtree of boxes down to
  1 px. Here each word is a pixel mask (the technique d3-cloud uses), which has
  the same 1 px precision and is faster.
- **Force phase:** the original recomputed the cloud similarity `S` and the
  largest overlap only every 50 iterations, when it printed progress, so its
  last stage usually ended at once. Here both are recomputed every iteration,
  so the last stage really pushes overlaps apart. The original's iteration cap
  was 1,000,000.
- **Separate clouds:** the original placed shared and unique words in two
  rounds even when nothing was coordinated; here every word is placed in one
  round by weight.
- **Fitting:** the original left the result at the top-left of the frame
  instead of centering it.
