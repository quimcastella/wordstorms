// Built-in example corpora: titles, cloud order and look. The texts live in
// ../examples/<folder>/ (built by scripts/build-corpora.ts).
import type { StormOptions } from '../core/storm.ts';
import type { FontId } from './font-list.ts';

/**
 * How an example looks when picked: the panel's controls are set to these,
 * and you can change any of them from there. Values must be ones the
 * controls can show (see index.html): words in steps of 5, the others in
 * steps of 0.1, vertical share in fourteenths, and one of the cloud shapes.
 */
export interface ExampleLook {
  font: FontId;
  /**
   * Extra words to leave out, on top of the stop list. Applied while the
   * example is loaded but not shown in the panel's "Ignore these words" field.
   */
  ignore: string[];
  options: Pick<
    StormOptions,
    | 'palette'
    | 'markShared'
    | 'maxWords'
    | 'distinctiveness'
    | 'sizeExponent'
    | 'verticalShare'
    | 'width'
    | 'height'
    | 'seed'
  >;
}

export interface Example {
  id: string;
  title: string;
  blurb: string;
  /** A couple of sentences on what this storm shows, for its look. */
  findings?: string;
  folder: string;
  /** Cloud order (file names without .txt). */
  docs: string[];
  look: ExampleLook;
}

export const EXAMPLES: Example[] = [
  {
    id: 'shakespeare',
    title: 'Shakespeare: tragedies and comedies',
    blurb: 'Three tragedies and three comedies, dialogue only.',
    findings:
      'A word has the same color and spot in every play. ' +
      '“Heart” is a top word in all six plays, and “heaven” only in the tragedies. “Love” is a top word in every play but Macbeth, where fear, blood and sleep take its place.',
    folder: 'Shakespeare',
    docs: ['Hamlet', 'Macbeth', 'Othello', 'A Midsummer Night’s Dream', 'Twelfth Night', 'Much Ado About Nothing'],
    look: {
      font: 'anton',
      // Elizabethan filler ("I pray you", "what's the matter?") that every play shares, so the shared themes show.
      ignore: [
        'good', 'man', 'men', 'speak', 'hear', 'mine', 'thus', 'show', 'hold',
        'pray', 'call', 'follow', 'matter', 'word', 'part', 'away', 'till',
      ],
      options: {
        palette: 'storm',
        markShared: 'none',
        maxWords: 40,
        distinctiveness: 0.3,
        sizeExponent: 1,
        verticalShare: 2 / 7,
        width: 640,
        height: 480,
        seed: 907488,
      },
    },
  },
  {
    id: 'holmes',
    title: 'The four Sherlock Holmes novels',
    blurb: 'Arthur Conan Doyle, 1887–1915.',
    findings:
      'Words in several novels’ clouds are in warm colors, and words in only one novel’s cloud in cool ones. ' +
      'Holmes sits in the middle of all four. Watson’s name only makes the top words in The Hound, where he does most of the investigating on his own.',
    folder: 'SherlockHolmes',
    docs: ['A Study in Scarlet', 'The Sign of the Four', 'The Hound of the Baskervilles', 'The Valley of Fear'],
    look: {
      font: 'abril',
      // Narrative filler that every novel shares and that would crowd Holmes out of the middle.
      ignore: ['man', 'hand', 'time', 'face'],
      options: {
        palette: 'parchment',
        markShared: 'warmth',
        maxWords: 40,
        distinctiveness: 0.6,
        sizeExponent: 1,
        verticalShare: 1 / 7,
        width: 640,
        height: 480,
        seed: 869263,
      },
    },
  },
  {
    id: 'fairytales',
    title: 'Fairy tales and fables',
    blurb:
      'Six classic collections, one cloud each: Grimm (German), Andersen (Danish), Perrault (French), Aesop’s fables (Greek), ' +
      'the Arabian Nights and Japanese folk tales. The bigger the word, the more that collection uses it.',
    findings:
      'Bold words are in more than one collection’s cloud, thin ones in just one. ' +
      '“King” is in every cloud except Andersen’s and Aesop’s, and Aesop’s animals have almost nothing in common with the rest.',
    folder: 'FairyTales',
    docs: ['Grimm', 'Andersen', 'Perrault', 'Aesop', 'Arabian Nights', 'Japanese Fairy Tales'],
    look: {
      font: 'fredoka',
      ignore: [],
      options: {
        palette: 'crayon',
        markShared: 'weight',
        maxWords: 40,
        distinctiveness: 0.4,
        sizeExponent: 1,
        verticalShare: 2 / 7,
        width: 560,
        height: 560,
        seed: 311934,
      },
    },
  },
];

/**
 * The fairy tales as separate clouds, for comparing with the storm (on the site and in the README).
 * Per separate cloud: its own seed, share of vertical words and size scale. An ordinary cloud
 * always puts its biggest word near the middle, so with one setting for all, "little" sat in
 * the same spot in Grimm, Andersen and Perrault. These were searched so shared words land in
 * different places and turn differently than in the storm and in each other.
 */
export const SEPARATE_LOOKS: Pick<StormOptions, 'seed' | 'verticalShare' | 'sizeExponent'>[] = [
  { seed: 191056, verticalShare: 1 / 2, sizeExponent: 1.2 },
  { seed: 485841, verticalShare: 3 / 7, sizeExponent: 0.9 },
  { seed: 646003, verticalShare: 1 / 7, sizeExponent: 1.3 },
  { seed: 671542, verticalShare: 5 / 14, sizeExponent: 1 },
  { seed: 784190, verticalShare: 1 / 2, sizeExponent: 1.1 },
  { seed: 675106, verticalShare: 2 / 7, sizeExponent: 0.8 },
];
