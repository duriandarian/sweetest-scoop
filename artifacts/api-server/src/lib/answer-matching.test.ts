import { test } from "node:test";
import assert from "node:assert/strict";
import { buildShortFormMatcher, completePhrase, findUniqueAnswer, indexOneMissingWord } from "./answer-matching";

const answers = new Map([["brunomars", "Bruno Mars"], ["mangosago", "Mango sago"]]);
const shortForms = (entries: string[]) => buildShortFormMatcher(entries,
  entry => entry.split("|").map(label => label.trim().toLowerCase().split(" ")),
  new Set(["music", "tacos", "house", "pot", "shabu", "game", "the", "noodle", "noodles"]));
test("distinctive full words can stand in for several optional descriptors", () => {
  const match = shortForms(["Vineyard Music", "Shabu Crescent Pot House", "The Golden Arcade Game"]);
  assert.equal(match(["vineyard"]), "Vineyard Music");
  assert.equal(match(["crescent"]), "Shabu Crescent Pot House");
  assert.equal(match(["crescent", "house"]), "Shabu Crescent Pot House");
  assert.equal(match(["golden", "arcade"]), "The Golden Arcade Game");
  for (const words of [["cres"], ["pot"], ["shabu", "pot"], ["house", "crescent"], ["crescent", "cafe"], ["arcade"]])
    assert.equal(match(words), undefined, words.join(" "));
  assert.equal(shortForms(["Ada Music", "Music Tacos"])(["ada"]), undefined);
  for (const alternate of ["The Vineyard Collective", "Another Name | Vineyard Sessions"])
    assert.equal(shortForms(["Vineyard Music", alternate])(["vineyard"]), undefined, alternate);
});
test("short clues can mix singular and plural descriptors, not fragments or renamed brands", () => {
  const match = shortForms(["Seasons Noodle House", "Moonlight Noodles"]);
  assert.equal(match(["seasons", "noodles"]), "Seasons Noodle House");
  assert.equal(match(["moonlight", "noodle"]), "Moonlight Noodles");
  assert.equal(match(["season", "noodles"]), undefined);
  assert.equal(match(["noodles"]), undefined);
  assert.equal(shortForms(["Seasons Noodle House", "Seasons Noodles Pot"])(["seasons", "noodles"]), undefined);
});
test("leading initials with a full suffix word are expanded only when unambiguous", () => {
  const canonical = "Moon Star River Tacos House";
  const match = shortForms([canonical]);
  assert.equal(match(["msr", "tacos", "house"]), canonical);
  assert.equal(match(["msr", "tacos"]), canonical);
  for (const words of [["msr"], ["ms", "tacos"], ["mrs", "tacos"], ["msr", "cafe"]])
    assert.equal(match(words), undefined, words.join(" "));
  assert.equal(shortForms([canonical, "Maple Sun Road Tacos Garden"])(["msr", "tacos"]), undefined);
  assert.equal(shortForms(["Moon Star River Golden Tacos House"])(["msr", "tacos"]), undefined);
});
test("forgives a single missing, extra, wrong or transposed letter", () => {
  for (const typo of ["brunomrs", "brunoomars", "brunomarz", "brunomras"]) {
    assert.equal(findUniqueAnswer(typo, answers), "Bruno Mars", typo);
  }
});
test("exact answers beat neighbors, even for very short words", () => {
  const neighbors = new Map([["mango", 20], ["mangoo", 100], ["amy", 60]]);
  assert.equal(findUniqueAnswer("mango", neighbors), 20);
  assert.equal(findUniqueAnswer("amy", neighbors), 60);
});
test("ambiguous typos never choose an answer or favor a rarer tier", () => {
  const ambiguous = new Map([["mango", 20], ["mange", 100]]);
  assert.equal(findUniqueAnswer("mangi", ambiguous), undefined);
  assert.equal(findUniqueAnswer("mangi", new Map([...ambiguous].reverse())), undefined);
});
test("short, partial, empty and substantially different answers are not guessed", () => {
  for (const typo of ["", "bru", "bruno", "brunomzzs", "thisisnotananswer"]) {
    assert.equal(findUniqueAnswer(typo, answers), undefined, typo);
  }
  assert.equal(findUniqueAnswer("amyy", new Map([["amy", "Amy"]])), undefined);
});
test("two edits are not forgiven on short answers", () => {
  assert.equal(findUniqueAnswer("brunomraz", answers), undefined);
});
const longer = new Map([["sovereigngracemusic", "Sovereign Grace Music"]]);
test("forgives two small edits in a unique longer answer", () => {
  for (const typo of ["sovereinggrasemusic", "sovreigngracmusic",
    "dsovereigngracemusicx", "sovereigngrasemusci"]) {
    assert.equal(findUniqueAnswer(typo, longer), "Sovereign Grace Music", typo);
  }
  assert.equal(findUniqueAnswer("éabcdegfai日", new Map([["éabcdefghi日", "Unicode"]])), "Unicode");
});
test("an existing unique one-edit match wins over a longer two-edit fallback", () => {
  const competing = new Map([["mangopuddinx", "one edit"], ["mangopuddins", "two edits"]]);
  assert.equal(findUniqueAnswer("mangopuddinxq", competing), "one edit");
  assert.equal(findUniqueAnswer("mangopuddinx", competing), "one edit");
});
test("ties at either distance are not resolved by bank order or rarity", () => {
  const competing = new Map([["mangopudding", 20], ["mangopuddins", 100]]);
  for (const typo of ["mangopuddinx", "mangopudsinx"]) {
    assert.equal(findUniqueAnswer(typo, competing), undefined);
    assert.equal(findUniqueAnswer(typo, new Map([...competing].reverse())), undefined);
  }
});
test("the two-edit fallback rejects fragments, substantially different answers and a short candidate", () => {
  for (const typo of ["sovereigngracemu", "vereigngracemusic", "sovreinggrasemusic", "a different artist"]) {
    assert.equal(findUniqueAnswer(typo, longer), undefined, typo);
  }
  assert.equal(findUniqueAnswer("brunomrazx", answers), undefined);
  const neighbors = new Map([["chocolatecake", "fragment"], ["chocolarec", "nearby"]]);
  assert.equal(findUniqueAnswer("chocolateca", neighbors), undefined, "A two-edit fragment counts toward ambiguity.");
});

const phrase = (answer: string) => answer.includes(" ");
test("a missing word is only indexed for a uniquely matching phrase with two or more words kept", () => {
  const completions = indexOneMissingWord(["wild berry jam", "wild berry tea", "mango mango pudding", "oat milk"], v => v.split(" "));
  assert.equal(completions.get("wild jam"), "wild berry jam");
  assert.equal(completions.get("wild berry"), null);
  assert.equal(completions.get("mango pudding"), "mango mango pudding");
  assert.equal(completions.has("milk"), false);
  assert.equal(completions.has("jam wild"), false);
});
test("a typo and one missing word can combine only for a clear ordered phrase", () => {
  const phrases = (source: string[]) => indexOneMissingWord(source, value => value.split(" "));
  const single = phrases(["sovereign grace music", "extraordinary ice cream"]);
  assert.equal(completePhrase(["sovreign", "grace"], single, true), "sovereign grace music");
  assert.equal(completePhrase(["sovreign", "grace"], single), undefined);
  assert.equal(completePhrase(["extraordnary", "ice"], single, true), undefined, "A short unchanged word isn't a strong anchor.");
  for (const words of [["grace"], ["grace", "sovreign"], ["sovreign", "grasce"]]) {
    assert.equal(completePhrase(words, single, true), undefined);
  }
  const blocked = phrases(["sovereign grace music", "sovereign grace band", "sovereing grace party"]);
  assert.equal(completePhrase(["sovreign", "grace"], blocked, true), undefined);
  assert.equal(completePhrase(["sovereign", "grace"], blocked, true), undefined);
  const close = phrases(["sovereign grace music", "sovereigne grace club"]);
  assert.equal(completePhrase(["sovereignx", "grace"], close, true), undefined);
  assert.equal(completePhrase(["sovereign", "grace"], close, true), "sovereign grace music");
});
test("completion never overrides an exact match or resolves an ambiguous spelling", () => {
  const complete = () => "some mango pudding";
  assert.equal(findUniqueAnswer("mangopudding", new Map([["mangopudding", "mango pudding"]]), phrase, complete), "mango pudding");
  assert.equal(findUniqueAnswer("mangopuddinx", new Map([["mangopudding", "mango pudding"]]), phrase, complete), "mango pudding");
  assert.equal(findUniqueAnswer("mangopuddinx", new Map([["mangopudding", "mango pudding"], ["mangopuddins", "mango puddins"]]),
    phrase, complete), undefined);
  assert.equal(findUniqueAnswer("manxopuddinx", new Map([["mangopudding", "mango pudding"], ["mangopuddins", "mango puddins"]]),
    phrase, complete), undefined);
});
test("three edits are forgiven only on a sufficiently long prepared phrase", () => {
  const entries = new Map([
    ["garlicparmesansteakpasta", "Garlic parmesan steak pasta"],
    ["buttershrimpgarlicpasta", "Butter shrimp garlic pasta"],
    ["sourdoughsandwich", "Sourdoughsandwich"],
    ["kimchifriedrice", "Kimchi fried rice"],
  ]);
  for (const typo of ["garilcparmasansteakpatsa", "garlcparmesnsteakpata", "xgarlicparmesanzsteakpastay"]) {
    assert.equal(findUniqueAnswer(typo, entries, phrase), "Garlic parmesan steak pasta");
  }
  for (const typo of ["garlcparmasansteekpatsa", "garlicparmesansteakpa", "sourxougsandwixh", "kimchifredrc"]) {
    assert.equal(findUniqueAnswer(typo, entries, phrase), undefined, typo);
  }
});
test("three edits cannot break a closer tie or win a same-distance tie", () => {
  const entries = new Map([
    ["mangococonutpudding", "Mango coconut pudding"],
    ["mangococonutpuddins", "Mango coconut puddins"],
  ]);
  for (const typo of ["manxococonutpuddinx", "manxococonatpuddinx"]) {
    assert.equal(findUniqueAnswer(typo, new Map([...entries, ["mangococonutpuddinx", "Mango coconut puddinx"]]), phrase),
      "Mango coconut puddinx", "The closer match wins.");
    assert.equal(findUniqueAnswer(typo, entries, phrase), undefined);
    assert.equal(findUniqueAnswer(typo, new Map([...entries].reverse()), phrase), undefined);
  }
  assert.equal(findUniqueAnswer("manxococonatpuddinx",
    new Map([...entries, ["manxococonutpuddinz", "Manxo coconut puddinz"], ["manxococonutpuddiny", "Manxo coconut puddiny"]]), phrase),
  undefined, "A tie at two edits cannot fall back to a three-edit phrase.");
});
test("only long words or extra-long phrases get an additional edit with a clear lead", () => {
  const city = new Map([["carpentersville", "Carpentersville"]]);
  const typedCity = "cxrpenxersvixle";
  assert.equal(findUniqueAnswer(typedCity, city, phrase, undefined, true), "Carpentersville");
  assert.equal(findUniqueAnswer(typedCity, city, phrase), undefined);
  assert.equal(findUniqueAnswer(typedCity, new Map([...city, ["carpgntersville", "A nearby spelling"]]), phrase, undefined, true),
    undefined, "A runner-up just one edit farther away blocks the looser suggestion.");

  const dish = new Map([["garlicparmesansteakpasta", "Garlic parmesan steak pasta"]]);
  const typedDish = "garilcparmasanstekpatsa";
  assert.equal(findUniqueAnswer(typedDish, dish, phrase, undefined, true), "Garlic parmesan steak pasta");
  assert.equal(findUniqueAnswer(typedDish, dish, phrase), undefined);
  assert.equal(findUniqueAnswer("gxrlicxarmesxnsteaxpxsta", dish, phrase, undefined, true), undefined);
  assert.equal(findUniqueAnswer("kimchifredrc", new Map([["kimchifriedrice", "Kimchi fried rice"]]), phrase, undefined, true), undefined);
  assert.equal(findUniqueAnswer("garlicparmesansteakpa", dish, phrase, undefined, true), undefined);
});
