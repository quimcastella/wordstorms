// English stop words from cue.language by Jonathan Feinberg (Apache License 2.0),
// the list the original Java Word Storm used.
const ENGLISH = `i me my myself we us our ours ourselves you your yours yourself yourselves
he him his himself she her hers herself it its itself they them their theirs themselves
what which who whom whose this that these those am is are was were be been being have has
had having do does did doing will would should can could ought i'm you're he's she's it's
we're they're i've you've we've they've i'd you'd he'd she'd we'd they'd i'll you'll he'll
she'll we'll they'll isn't aren't wasn't weren't hasn't haven't hadn't doesn't don't didn't
won't wouldn't shan't shouldn't can't cannot couldn't mustn't let's that's who's what's
here's there's when's where's why's how's a an the and but if or because as until while of
at by for with about against between into through during before after above below to from
up upon down in out on off over under again further then once here there when where why how
all any both each few more most other some such no nor not only own same so than too very
say says said shall`;

// Port addition: high-frequency verbs, adverbs and determiners that crowd out
// content words in longer texts, early modern English function words (for
// Shakespeare and the like), and title abbreviations. Nouns and adjectives
// (man, time, good, little) are kept; the idf fade already mutes the ones
// every document shares.
const EXTENDED = `${ENGLISH}
one two also may might must shall will can need upon whilst though although however yet
still even ever never always often perhaps rather quite almost already just really indeed
now soon well much many every another either neither whether else enough instead
like unto within without towards toward across along around among amongst beside besides
come comes came coming go goes went gone going get gets got getting make makes made making
take takes took taken taking give gives gave given giving put puts let lets see sees saw
seen seeing look looks looked know knows knew known think thinks thought tell tells told
seem seems seemed find found keep kept leave left want wanted ask asked
thing things something nothing anything everything someone anyone everyone nobody somebody
way ways yes oh ah
thou thee thy thine thyself ye hath doth dost art hast shalt wilt wouldst couldst shouldst
tis twas th o ay nay ere ne'er e'er o'er e'en 'tis 'twas
mr mrs ms dr st`;

export const STOPWORDS = {
  /** The common English words most people expect a word cloud to skip. */
  extended: new Set(EXTENDED.split(/\s+/).filter(Boolean)),
  /** The original Java version's (cue.language) list. */
  english: new Set(ENGLISH.split(/\s+/)),
  none: new Set<string>(),
};

export type StopwordLanguage = keyof typeof STOPWORDS;
