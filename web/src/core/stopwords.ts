// English stop words from cue.language by Jonathan Feinberg (Apache License 2.0),
// the list the original Word Storm used.
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

// Added to the original list: high-frequency verbs, adverbs and determiners that crowd out
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

// Spanish and Catalan function words: articles, pronouns, prepositions,
// conjunctions, common adverbs, and the forms of ser/estar/haber/tener (ésser,
// estar, haver, tenir) and a few other high-frequency verbs. Participles that are
// also common nouns (estado, estat: state; hecho: fact) are kept.
const SPANISH = `el la los las lo un una unos unas al del de a ante bajo con contra desde durante en entre
hacia hasta mediante para por según sin sobre tras y e ni o u pero sino que porque pues aunque
si como cuando donde mientras yo me mi mis mí conmigo tú te ti tu tus contigo él ella ello ellos
ellas le les se sí consigo su sus nosotros nosotras nos nuestro nuestra nuestros nuestras
vosotros vosotras os vuestro vuestra vuestros vuestras usted ustedes mío mía míos mías tuyo
tuya tuyos tuyas suyo suya suyos suyas este esta esto estos estas ese esa eso esos esas aquel
aquella aquello aquellos aquellas qué quién quiénes cuál cuáles cuánto cuánta cuántos cuántas
cómo dónde cuándo quien quienes cual cuales cuanto cuanta cuantos cuantas cuyo cuya cuyos cuyas
mismo misma mismos mismas otro otra otros otras todo toda todos todas algo alguien alguno
alguna algunos algunas algún nada nadie ninguno ninguna ningún cada mucho mucha muchos muchas
poco poca pocos pocas tanto tanta tantos tantas tan tal tales más menos muy bastante demasiado
ya aún todavía también tampoco siempre nunca jamás ahora entonces luego después antes aquí
allí ahí allá acá así bien mal solo sólo casi además sí no vez veces
ser soy eres es somos sois son era eras éramos erais eran fui fuiste fue fuimos fuisteis fueron
sea seas seamos seáis sean sería serían será serán sido siendo
estar estoy estás está estamos estáis están estaba estaban estuve estuvo estuvieron esté estén
estando
haber he has ha hemos habéis han había habías habíamos habían hubo hubiera hubieran haya
hayan habrá habría hay habido habiendo
tener tengo tienes tiene tenemos tenéis tienen tenía tenían tuve tuvo tuvieron tenga tengan
tenido teniendo
hacer hago hace hacen hacía hizo poder puedo puede pueden podía pudo decir dijo dice
dicen ir voy va van iba fue ver vio`;

const CATALAN = `el la els les lo l' un una uns unes al als del dels pel pels en na a amb de per
per a cap fins sense sobre sota entre contra des durant segons cap i o ni però sinó que perquè
doncs si com quan on mentre jo em me m' mi meu meva meus meves tu et te t' teu teva teus teves
ell ella ells elles li els les ho hi en ne se es s' seu seva seus seves nosaltres ens nostre
nostra nostres vosaltres us vostre vostra vostres vostè vostès aquest aquesta aquests aquestes
això aquell aquella aquells aquelles allò aqueix aqueixa què qui quin quina quins quines
quant quanta quants quantes mateix mateixa mateixos mateixes altre altra altres tot tota tots
totes algun alguna alguns algunes algú res ningú cap cada molt molta molts moltes poc poca
pocs poques tant tanta tants tantes tan més menys força massa gaire ja encara també tampoc
sempre mai ara llavors aleshores després abans aquí allà allí així bé només sols gairebé no pas
vegada vegades
ser ésser sóc ets és som sou són era eres érem éreu eren fui fou fórem foren sigui siguin seria
serien serà seran essent
estar estic estàs està estem esteu estan estava estaven estigui estiguin
haver he has ha hem heu han havia havies havíem havien hagi hagin haurà hauria hagut havent
tenir tinc tens té tenim teniu tenen tenia tenien tingui tingut tenint
fer faig fas fa fem feu fan feia feien fet poder puc pot poden podia va vaig vas vam vau van
dir diu diuen deia dit anar vaig anava veure`;

export const STOPWORDS = {
  /** The common English words most people expect a word cloud to skip. */
  extended: new Set(EXTENDED.split(/\s+/).filter(Boolean)),
  /** The original version's list, from cue.language. */
  english: new Set(ENGLISH.split(/\s+/)),
  spanish: new Set(SPANISH.split(/\s+/).filter(Boolean)),
  catalan: new Set(CATALAN.split(/\s+/).filter(Boolean)),
  none: new Set<string>(),
};

export type StopwordLanguage = keyof typeof STOPWORDS;
