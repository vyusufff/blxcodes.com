/**
 * Everyday English words that appear in codes-article prose.
 *
 * Beebom-style pages put redeem instructions, FAQ and author blurbs right after
 * the expired list, so token scanning used to turn words like "bookmark" or
 * "Launch" into fake expired codes. Anything listed here is never accepted as a
 * bare code, and the cleanup script uses the same list to purge old mistakes.
 */
export const PROSE_WORDS = new Set(
  `
  base best both but does done down each else even ever face fast find from
  full game gets give goes gone good half hand hard have head help here hold
  home hour idea into item join just keep kind know last late left less life
  line list live long look lots made make many meta mode more most move much
  must name need next nice none note only open over pack page part pass past
  play plus poor pull push read real rest room said same save seen sent ship
  shot show side size slot slow some soon spot stay step stop such take team
  tell than that them then they this thus tier till time tips tool top turn
  upon used user very view wait walk want ways well went were what when will
  wins with work year your zone
  about above across after again against already also although always among
  another answer anyone around because become before begin behind below beside
  besides better between beyond bookmark bottom build built button check choose
  claim click collect community complete confirm continue copied correct create
  current daily definitely different discord double during either enough enter
  entering every everyone example exactly explore favorite follow forget
  freebies further future gather general getting given giving greater happen
  having however inside instead itself joining keeping known latest launch
  leave level like listed little longer looking love making manage market
  master matter maybe menu method might military mini moment moving myself
  navy never newest normal nothing notice number offer often once online
  option other others outside pentagon perfect period person picked place
  playing please point popular possible price probably problem process
  progress proper provide public quickly raising rarely reach ready really
  reason receive recent redeeming regular related remain remember require
  resource resources return reward rewards right saying screen scroll search
  second section select server servers shop should simple simply since single
  small something sometimes special specific spend start still strategy stuff
  submit suggestions support suppose surely system table taken taking
  themselves therefore thing things think though thousand through throughout
  title today together token toward tycoon type unable under until updated
  using usually value various version visit waiting want watch weekly welcome
  whatever whenever where whether which while whole within without word
  working world worth would write wrong yourself
  `
    .trim()
    .split(/\s+/),
);

/** Leftovers of undecoded numeric HTML entities (smart quotes, ellipsis, dashes). */
const ENTITY_DIGITS = new Set(['039', '160', '8211', '8212', '8216', '8217', '8220', '8221', '8230']);

/**
 * True for tokens that are prose rather than codes, including hyphenated
 * phrases such as "war-related" and stray HTML entity digits.
 */
export function isProseToken(token) {
  const value = String(token);
  if (ENTITY_DIGITS.has(value)) return true;
  const parts = value.toLowerCase().split('-').filter(Boolean);
  if (!parts.length) return false;
  return parts.every((part) => PROSE_WORDS.has(part));
}
