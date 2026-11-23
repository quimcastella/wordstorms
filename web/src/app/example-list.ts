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
      '“Heart” shows up in all six and “heaven” only in the tragedies. “Love” is in every play except Macbeth, which has fear, blood and sleep instead.',
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
      'Words that several novels share are in warm colors, and words from a single novel in cool ones. ' +
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
      'Bold words appear in more than one collection, thin ones in just one. ' +
      'There’s a “king” in every collection except Andersen and Aesop, and Aesop’s animals have almost nothing in common with the rest.',
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
