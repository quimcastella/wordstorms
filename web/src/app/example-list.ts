// Built-in example corpora: titles and cloud order. The texts live in
// ../examples/data/input/<folder>/ (built by scripts/build-corpora.ts).

export interface Example {
  id: string;
  title: string;
  blurb: string;
  folder: string;
  /** Cloud order (file names without .txt). */
  docs: string[];
}

export const EXAMPLES: Example[] = [
  {
    id: 'shakespeare',
    title: 'Shakespeare: tragedies and comedies',
    blurb: 'Three tragedies and three comedies, dialogue only.',
    folder: 'Shakespeare',
    docs: ['Hamlet', 'Macbeth', 'Othello', 'A Midsummer Night’s Dream', 'Twelfth Night', 'Much Ado About Nothing'],
  },
  {
    id: 'holmes',
    title: 'The four Sherlock Holmes novels',
    blurb: 'Arthur Conan Doyle, 1887–1915.',
    folder: 'SherlockHolmes',
    docs: ['A Study in Scarlet', 'The Sign of the Four', 'The Hound of the Baskervilles', 'The Valley of Fear'],
  },
  {
    id: 'fairytales',
    title: 'Fairy tales and fables',
    blurb: 'One cloud per classic collection.',
    folder: 'FairyTales',
    docs: ['Grimm', 'Andersen', 'Perrault', 'Aesop', 'Arabian Nights', 'Japanese Fairy Tales'],
  },
];
