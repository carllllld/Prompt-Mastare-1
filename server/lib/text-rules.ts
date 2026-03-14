export type WritingStyle = "factual" | "balanced" | "selling";

export const FORBIDDEN_PHRASES = [
  // Generiska AI-öppningar - KRITISKT
  "välkommen till",
  "välkommen hem",
  "här möts du",
  "här erbjuds",
  "nu finns chansen",
  "missa inte",
  "unik möjlighet",
  "unik chans",
  "sällsynt tillfälle",
  "finner du",
  "utmärkt möjlighet",
  "stor potential",
  "kontakta oss",
  "för mer information",
  "och visning",
  "i hjärtat av",
  "hjärtat av",
  "vilket gör det enkelt",
  "vilket gör det smidigt",
  "vilket gör det lätt",
  "vilket ger en",
  "ger en rymlig",
  "ger en härlig",
  "ger en luftig",
  "rymlig känsla",
  "härlig plats för",
  "plats för avkoppling",
  "njutning av",
  "möjlighet att påverka",
  "forma framtiden",
  "för den som",
  "vilket säkerställer",

  // "erbjuder" i alla former
  " erbjuder ",
  " erbjuds ",

  // NYA AI-KLYSCHOR FRÅN OUTPUT-ANALYS
  "erbjuder en bra plats",
  "erbjuder en perfekt",
  "erbjuder en fantastisk",
  "skapar en",
  "skapar en miljö",
  "skapar en avkopplande",
  "är ett bra val",
  "är ett bra val för",
  "är en perfekt plats",
  "är en bra plats",
  "är en bra plats för",
  "vilket ger ytterligare",
  "vilket ger ytterligare utrymme",
  "den södervända placeringen",
  "den södervända placeringen ger",

  // Atmosfär/luftig-fraser
  "trivsam atmosfär",
  "härlig atmosfär",
  "mysig atmosfär",
  "inbjudande atmosfär",
  "luftig atmosfär",
  "luftig och",

  // Rofylld/lugn klyschor
  "rofyllt",
  "rofylld",

  // Trygg-fraser
  "trygg boendemiljö",
  "trygg boendeekonomi",
  "tryggt boende",

  // Sociala klyschor
  "sociala sammanhang",
  "sociala tillställningar",
  "socialt umgänge",

  // Komfort-fraser
  "extra komfort",
  "maximal komfort",

  // Överdrivna adjektiv
  "fantastisk",
  "underbar",
  "magisk",
  "otrolig",
  "drömboende",
  "drömlägenhet",
  "drömhem",
  "en sann pärla",

  // Vardags-klyschor
  "underlättar vardagen",
  "bekvämlighet i vardagen",
  "den matlagningsintresserade",
  "god natts sömn",

  // Läges-klyschor
  "eftertraktat boendealternativ",
  "attraktivt läge",
  "attraktivt med närhet",
  "inom räckhåll",
  "stadens puls",

  // Hjärta-klyschor
  "hjärtat i hemmet",
  "husets hjärta",
  "hemmets hjärta",

  // Andra
  "inte bara ett hem",
  "stark efterfrågan",
  "goda arbetsytor",

  // Överanvända AI-fraser i interna kvalitetstester
  "generösa ytor",
  "generös takhöjd",
  "generöst tilltaget",
  "generöst med",
  "bjuder på",
  "präglas av",
  "genomsyras av",
  "andas lugn",
  "andas charm",
  "andas historia",
  "präglad av",
  "stor charm",
  "med sin charm",
  "med mycket charm",
  "trivsamt boende",
  "trivsam bostad",
  "en bostad som",
  "en lägenhet som",
  "ett hem som",
  "strategiskt placerad",
  "strategiskt läge",

  // NYA FRASER FRÅN OUTPUT-TEST 2026-02
  "skapa minnen",
  "utmärkt val",
  "gott om utrymme",
  "lek och avkoppling",
  "natur och stadsliv",
  "bekvämt boende",
  "rymligt intryck",
  "gör det enkelt att",
  "gör det möjligt att",
  "ett område för familjer",
  "i mycket gott skick",
  "ligger centralt i",

  // NYA FRASER FRÅN OUTPUT-TEST 2026-02 v2 (Ekorrvägen-analys)
  "faciliteter",
  "nyrenoverade faciliteter",
  "njut av",
  "förvaringsmöjligheter inkluderar",
  "förvaringsmöjligheter",
  "odlingsmöjligheter",
  "boendmöjligheter",
  "parkeringsmöjligheter",
  "det finns även",
  "det finns också",

  // === MEGA-EXPANSION: Alla AI-klyschor som aldrig förekommer i riktiga mäklartexter ===

  // Emotionella verb/frasmönster
  "inbjuder till",
  "bjuder in till",
  "lockar till",
  "inspirerar till",
  "andas modernitet",
  "andas stil",
  "utstrålar",
  "ger en känsla av",
  "skapar en känsla av",
  "ger ett intryck av",
  "skapar en harmonisk",
  "skapar en inbjudande",
  "ger ett lyxigt intryck",
  "bidrar till en",
  "förstärker känslan",
  "adderar en touch",
  "ger en touch",

  // Sammanfattnings-/värderings-fraser
  "sammanfattningsvis",
  "med andra ord",
  "kort sagt",
  "allt sammantaget",
  "detta gör bostaden till",
  "detta gör lägenheten till",
  "detta gör villan till",
  "allt detta gör",
  "det bästa av",
  "inte bara ett hem",
  "mer än bara ett hem",
  "mer än bara en bostad",
  "ett hem för alla",
  "ett hem att trivas i",

  // "Inte bara... utan också" (AI-signatur)
  "inte bara",
  "utan också",

  // Compound adjektiv-par (AI-markör)
  "ljus och luftig",
  "ljust och luftigt",
  "stilrent och modernt",
  "stilren och modern",
  "modernt och stilrent",
  "elegant och tidlös",
  "tidlös och elegant",
  "mysigt och ombonat",
  "charmigt och välplanerat",
  "praktiskt och snyggt",
  "fräscht och modernt",

  // Abstrakt livsstil/känsla
  "livsstil",
  "livsföring",
  "livskvalitet",
  "hög standard",
  "hög kvalitet",
  "stor potential",
  "stor möjlighet",
  "drömmar",
  "vision",
  "med en vision",
  "ett smart val",
  "klok investering",

  // Överdrivna adverb
  "noggrant utvalt",
  "noggrant utvalda",
  "omsorgsfullt",
  "genomtänkt",
  "smakfullt",
  "stilfullt",
  "elegant",
  "exklusivt",
  "lyxigt",
  "imponerande",
  "magnifikt",
  "praktfullt",

  // "-möjligheter" suffix (alla varianter)
  "utemöjligheter",
  "lagringsmöjligheter",
  "rekreationsmöjligheter",
  "fritidsmöjligheter",
  "aktivitetsmöjligheter",
  "umgängesmöjligheter",
  "utvecklingsmöjligheter",
  "utbyggnadsmöjligheter",

  // Passiva/byråkratiska konstruktioner
  "det kan konstateras",
  "det bör nämnas",
  "det ska tilläggas",
  "värt att nämna",
  "värt att notera",
  "som en bonus",
  "en extra fördel",
  "en stor fördel",
  "en klar fördel",

  // Överdrivna plats-beskrivningar
  "eftertraktat område",
  "populärt område",
  "omtyckt område",
  "familjevänligt område",
  "barnvänligt område",
  "naturskönt läge",
  "natursköna omgivningar",
  "grön oas",
  "en oas",
  "en fristad",
  "en pärla",
  "ett stenkast från",
];

const BALANCED_EXEMPT = new Set([
  "genomtänkt", "smakfullt", "stilfullt", "elegant",
  "attraktivt läge", "naturskönt läge", "populärt område", "familjevänligt område",
  "hög standard",
  "ljus och luftig", "ljust och luftigt",
  "trivsamt boende", "trivsam bostad",
  "rofyllt", "rofylld",
  "genomtänkt planlösning", "smakfullt renoverat", "stilfullt renoverat",
]);

const SELLING_EXEMPT = new Set([
  ...Array.from(BALANCED_EXEMPT),
  "fantastisk", "fantastiskt", "underbar", "imponerande",
  "exklusivt", "lyxigt", "magnifikt", "praktfullt",
  "stilren", "noggrant utvalt", "noggrant utvalda", "omsorgsfullt",
  "en sann pärla",
  "stilrent och modernt", "stilren och modern",
  "modernt och stilrent", "elegant och tidlös", "tidlös och elegant",
  "mysigt och ombonat", "charmigt och välplanerat",
  "praktiskt och snyggt", "fräscht och modernt",
  "trivsam atmosfär", "härlig atmosfär", "mysig atmosfär",
  "inbjudande atmosfär", "luftig atmosfär", "luftig och",
  "stor charm", "med sin charm", "med mycket charm", "charm",
  "drömboende", "drömlägenhet", "drömhem",
  "eftertraktat område", "barnvänligt område",
  "natursköna omgivningar", "en pärla",
  "attraktivt med närhet",
  "hög kvalitet", "livsstil", "livskvalitet",
  "extra komfort", "maximal komfort",
  "trygg boendemiljö", "trygg boendeekonomi", "tryggt boende",
  "inbjuder till", "bjuder in till", "inspirerar till",
  "sociala sammanhang", "sociala tillställningar",
  "omsorgsfullt renoverat", "smakfullt inrett",
  "exklusivt utförande", "lyxigt badrum", "imponerande takhöjd",
]);

export function getExemptPhrases(style: WritingStyle): Set<string> {
  switch (style) {
    case "selling": return SELLING_EXEMPT;
    case "balanced": return BALANCED_EXEMPT;
    case "factual": return new Set();
  }
}
