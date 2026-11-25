import { test } from "node:test";
import assert from "node:assert/strict";
import { amyWordForms } from "./answer-word-forms";
import activeSource from "../data/party-questions.json";
import archivedSource from "../data/party-questions-v2.json";
import { answerCorrection, bankForVersion, matchKey, normalizeAnswer, questionBank, scoreAnswer, TIERS, ROUND_COUNT, ROUND_DURATION_SECONDS } from "./party-scoring";

const cooking = 6;
const final = ROUND_COUNT - 1;
test("eight prepared questions in spreadsheet order with all five dessert tiers", () => {
  assert.equal(questionBank.length, 8);
  assert.deepEqual(questionBank.slice(4).map(q => q.prompt), [
    "Name an item Amy carries on her", "Name a boba place Daniel has tried",
    "Name something we've cooked together", "Name something Daniel loves about Amy (one word description)",
  ]);
  assert.ok(questionBank[2].catalog.length > 1200);
  assert.deepEqual(new Set(questionBank.flatMap(q => q.catalog.map(a => a.tier))), new Set(TIERS));
});
test("new answers use their sheet tiers and pipe-separated options share one catalog entry", () => {
  for (const [position, low, high, points] of [
    [4, "LABUBU", "lafufu", 60],
    [5, "Chicha", "Chicha San Chen", 40],
    [cooking, "soup dumplings", "XLB", 80],
  ] as const) {
    assert.equal(answerCorrection(position, low), undefined);
    const reward = scoreAnswer(position, low, 25000, 25000);
    assert.equal(reward.basePoints, points, low);
    assert.deepEqual(scoreAnswer(position, high, 25000, 25000), reward);
    assert.equal(questionBank[position].catalog.filter(a => a.answer === reward.canonicalAnswer).length, 1);
  }
  assert.equal(scoreAnswer(final, "Devoted", 25000, 25000).basePoints, 100);
  assert.equal(scoreAnswer(cooking, "spicy cucumber salad", 25000, 25000).matched, true);
});
test("minigolf and golfland are exact alternatives for one date activity", () => {
  const canonical = "Minigolf/Golfland";
  const reward = scoreAnswer(3, canonical, 7500, 25000);
  assert.equal(reward.canonicalAnswer, canonical);
  assert.equal(reward.basePoints, 60);
  for (const answer of ["Minigolf", "MINI   GOLF", "golfLand"]) {
    assert.equal(answerCorrection(3, answer), undefined);
    assert.deepEqual(scoreAnswer(3, answer, 7500, 25000), reward);
    assert.equal(scoreAnswer(1, answer, 7500, 25000).matched, false);
  }
  assert.equal(scoreAnswer(3, "golf", 7500, 25000).matched, false);
  assert.equal(questionBank[3].catalog.filter(a => a.answer === canonical).length, 1);
});
test("Charlie, walks and walking all count as the same date activity", () => {
  const canonical = "Walks/Charlie";
  const reward = scoreAnswer(3, canonical, 7500, 25000);
  assert.equal(reward.canonicalAnswer, canonical);
  assert.equal(reward.basePoints, 20);
  for (const typed of ["charlie", " WALKS ", "walking"]) {
    assert.equal(answerCorrection(3, typed), undefined);
    assert.deepEqual(scoreAnswer(3, typed, 7500, 25000), reward);
    assert.equal(scoreAnswer(1, typed, 7500, 25000).matched, false);
  }
  assert.equal(questionBank[3].catalog.filter(a => a.answer === canonical).length, 1);
});
test("Viet immediately scores as Vietnamese on the final question", () => {
  const reward = scoreAnswer(final, "Vietnamese", 7500, 25000);
  assert.equal(reward.canonicalAnswer, "Vietnamese");
  assert.equal(reward.basePoints, 40);
  for (const typed of ["viet", " ViEt "]) {
    assert.equal(answerCorrection(final, typed), undefined);
    assert.deepEqual(scoreAnswer(final, typed, 7500, 25000), reward);
    assert.equal(scoreAnswer(1, typed, 7500, 25000).matched, false);
  }
});
test("plural item names suggest the prepared singular in Amy's item question", () => {
  const position = questionBank.findIndex(q => q.prompt === "Name an item Amy carries on her");
  for (const [typed, singular, points] of [
    ["Books", "Book", 40], [" RINGS ", "Ring", 40], ["engagement rings", "Engagement Ring", 100],
    ["oura rings", "Oura Ring", 60], ["tote bags", "Tote Bag", 40], ["scrunchies", "Scrunchie", 40],
    ["purses", "Purse", 20], ["IDs", "ID", 20],
  ] as const) {
    assert.deepEqual(answerCorrection(position, typed), { originalAnswer: typed.trim(), correctedAnswer: singular });
    assert.equal(answerCorrection(position, singular), undefined);
    assert.equal(scoreAnswer(position, singular, 25_000, 25_000).basePoints, points);
    assert.equal(answerCorrection(0, typed), undefined);
  }
  for (const [typed, label] of [
    ["jewelry", "Ring"], ["Rings | Jewelry", "Ring"], ["keys", "Keys"],
    ["sunglasses", "Sunglasses"], ["gentle monsters", "Gentle Monsters"],
  ] as const) {
    assert.equal(answerCorrection(position, typed), undefined);
    assert.equal(scoreAnswer(position, typed, 25_000, 25_000).canonicalAnswer, label);
  }
});
test("the archived seven-round bank retains the old order, scoring, and corrections", () => {
  const old = bankForVersion(2)!;
  assert.equal(old.length, 7);
  assert.match(old[4].prompt, /city of residence/);
  assert.equal(scoreAnswer(4, "labubu", 25000, 25000, old).matched, false);
  assert.equal(scoreAnswer(5, "FRIED RICE", 25000, 25000, old).basePoints, 20);
  assert.equal(scoreAnswer(6, "devoted", 25000, 25000, old).matched, false);
  assert.equal(answerCorrection(6, "patience", old)?.correctedAnswer, "Patient");
});
test("normalization accepts case, whitespace, punctuation and accents", () => {
  assert.equal(normalizeAnswer("  Bruno   MARS "), "bruno mars");
  assert.equal(matchKey(" ROSÉ "), matchKey("rose"));
  assert.equal(scoreAnswer(0, "Bruno   MARS", 0, 60000).basePoints, 20);
  assert.equal(scoreAnswer(0, "a made up artist", 0, 60000).points, 0);
});
test("capitalization alone never asks for a correction or changes a reward", () => {
  const canonical = "Sovereign Grace Music";
  const reward = scoreAnswer(0, canonical, 7500, 25000);
  for (const answer of [canonical.toUpperCase(), canonical.toLowerCase(), "sOvErEiGn GrAcE mUsIc"]) {
    assert.equal(answerCorrection(0, answer), undefined);
    assert.deepEqual(scoreAnswer(0, answer, 7500, 25000), reward);
  }
});
test("a clear minor typo earns the same rarity and server-timed speed points", () => {
  assert.deepEqual(scoreAnswer(0, "Bruno Mras", 7500, 25000), scoreAnswer(0, "Bruno Mars", 7500, 25000));
  assert.equal(scoreAnswer(0, "Bruno", 7500, 25000).matched, false);
});
test("unique typos suggest the canonical spelling without suggesting partial or unknown answers", () => {
  assert.deepEqual(answerCorrection(0, "Bruno Mras"), {
    originalAnswer: "Bruno Mras", correctedAnswer: "Bruno Mars",
  });
  for (const answer of ["Bruno Mars", "bruno   mars", "Bruno", "unlisted smoke answer"]) {
    assert.equal(answerCorrection(0, answer), undefined);
  }
  assert.equal(scoreAnswer(0, "bruno mars", 1000, 25000).canonicalAnswer, "Bruno Mars");
});
test("a clear two-edit typo suggests the long answer from the current question only", () => {
  const typo = "Sovereing Grase Music";
  assert.deepEqual(answerCorrection(0, typo), {
    originalAnswer: typo, correctedAnswer: "Sovereign Grace Music",
  });
  for (const answer of ["Sovreing Grase Musix", "Sovereign Grace Mu", "Bruno Mraz"]) {
    assert.equal(answerCorrection(0, answer), undefined);
  }
  assert.equal(answerCorrection(2, typo), undefined);
});
test("restaurant shortcuts require confirmation and don't change matches on other questions", () => {
  for (const [typed, canonical] of [["WaYmO", "Waymo Cafe"], ["GoOgLe", "Google Cafe"]]) {
    assert.deepEqual(answerCorrection(1, typed), { originalAnswer: typed, correctedAnswer: canonical });
    assert.equal(answerCorrection(1, canonical), undefined);
    assert.equal(scoreAnswer(1, typed, 7500, 25000).points, 0);
    assert.equal(scoreAnswer(1, canonical, 7500, 25000).basePoints, 20);
    assert.equal(answerCorrection(5, typed), undefined);
    assert.equal(scoreAnswer(5, typed, 7500, 25000).basePoints, 20);
  }
  assert.equal(answerCorrection(1, "cafe"), undefined);
  assert.equal(answerCorrection(1, "burger"), undefined);
});
test("restaurant shortcuts suggest the current listed names", () => {
  for (const [canonical, basePoints, variants] of [
    ["SGD Tofu House", 60, ["SGD Tofu", "s.g.d. tofu"]],
    ["Taichi Pot Shabu Shabu", 80, ["Taichi", "Taichi Pot"]],
  ] as const) {
    for (const typed of variants) {
      assert.deepEqual(answerCorrection(1, typed), { originalAnswer: typed, correctedAnswer: canonical });
      assert.equal(answerCorrection(0, typed), undefined);
      assert.equal(scoreAnswer(1, typed, 7500, 25000).points, 0);
    }
    assert.equal(answerCorrection(1, canonical), undefined);
    assert.equal(scoreAnswer(1, canonical, 7500, 25000).basePoints, basePoints);
  }
  for (const typed of [
    "SGD", "SGD Cafe", "Tofu", "Tofu House", "So Gong Dong", "So Gong Dong Tofu",
    "So Gond Doo", "So Gong Doo", "So Gond Dong", "Shabu", "Tai", "Taichi Cafe",
  ]) {
    assert.equal(answerCorrection(1, typed), undefined, typed);
    assert.equal(scoreAnswer(1, typed, 7500, 25000).matched, false, typed);
  }
});
test("the old full restaurant name and case variations still score as one catalog entry", () => {
  const reward = scoreAnswer(1, "SGD Tofu House", 7500, 25000);
  assert.equal(reward.basePoints, 60);
  assert.equal(reward.canonicalAnswer, "SGD Tofu House");
  for (const typed of ["sgd tofu house", "S.G.D. TOFU HOUSE", "So Gong Dong Tofu House"]) {
    assert.equal(answerCorrection(1, typed), undefined);
    assert.deepEqual(scoreAnswer(1, typed, 7500, 25000), reward);
  }
  assert.equal(questionBank[1].catalog.filter(entry => /sgd tofu|so gong dong/i.test(entry.answer)).length, 1);
  assert.equal(answerCorrection(1, "SGD Tofu", bankForVersion(2)!)?.correctedAnswer, "So Gong Dong Tofu House");
});
test("distinctive names can fill in descriptors, with the requested default for Malatang", () => {
  for (const [position, typed, canonical, base] of [
    [0, "VINEYARD", "Vineyard Music", 60],
    [1, "zhangliang", "Zhangliang Malatang", 20],
    [1, "malatang", "Zhangliang Malatang", 20],
    [1, "zhanglian malatang", "Zhangliang Malatang", 20],
    [1, "Cuanyue", "Cuanyue Malatang", 60],
    [1, "cali spartan", "Cali Spartan Tacos", 60],
  ] as const) {
    assert.deepEqual(answerCorrection(position, typed), { originalAnswer: typed, correctedAnswer: canonical });
    assert.equal(answerCorrection(position, canonical), undefined);
    assert.equal(scoreAnswer(position, canonical, 7500, 25000).basePoints, base);
  }
  for (const [position, typed] of [[0, "music"], [0, "vine"], [1, "tacos"], [1, "vineyard"], [0, "malatang"]] as const)
    assert.equal(answerCorrection(position, typed), undefined);
});
test("distinctive restaurant clues expand to the listed names and keep their tiers", () => {
  for (const [canonical, basePoints, variants] of [
    ["Daeho Kalbijjim", 60, ["Daeho", " DAEHO "]],
    ["Yummy Tofu & BBQ", 80, ["yummy tofu"]],
    ["Taichi Pot Shabu Shabu", 80, ["taichi"]],
    ["Seasons Noodle & Dumpling Garden", 80, ["Seasons noodles", "seasons noodle"]],
  ] as const) {
    for (const typed of variants) {
      assert.deepEqual(answerCorrection(1, typed), { originalAnswer: typed.trim(), correctedAnswer: canonical });
      assert.equal(answerCorrection(0, typed), undefined);
      assert.equal(scoreAnswer(1, typed, 7500, 25000).points, 0);
    }
    assert.equal(answerCorrection(1, canonical), undefined);
    assert.equal(scoreAnswer(1, canonical, 7500, 25000).basePoints, basePoints);
  }
  for (const typed of ["kalbijjim", "tofu", "bbq", "shabu", "noodles", "dumplings", "Seasons soup"])
    assert.equal(answerCorrection(1, typed), undefined, typed);
});
test("a long, distinctive phrase can be completed and corrected together without scoring the suggestion", () => {
  assert.deepEqual(answerCorrection(0, "sovreign grace"), {
    originalAnswer: "sovreign grace", correctedAnswer: "Sovereign Grace Music",
  });
  assert.equal(answerCorrection(0, "grace"), undefined);
  assert.equal(answerCorrection(1, "sovreign grace"), undefined);
  assert.equal(scoreAnswer(0, "sovreign grace", 7500, 25000).points, 0);
  assert.equal(scoreAnswer(0, "Sovereign Grace Music", 7500, 25000).basePoints, 100);
});
test("distinctive activity clues work with or without the action words", () => {
  for (const [canonical, points, variants] of [
    ["Watch the Kardashians", 60, ["Kardashians", "watch kardashians"]],
    ["Watch Volleyball Clips", 60, ["volleyball", "volleyball clips", "watch volleyball"]],
    ["Build LEGO Sculptures", 80, ["LEGO", "build lego", "lego sculptures"]],
    ["Watch Movies", 20, ["movies", "MOVIES"]],
  ] as const) {
    assert.equal(answerCorrection(3, canonical), undefined);
    assert.equal(scoreAnswer(3, canonical, 25000, 25000).basePoints, points);
    for (const typed of variants) {
      assert.deepEqual(answerCorrection(3, typed), { originalAnswer: typed, correctedAnswer: canonical });
      assert.equal(answerCorrection(1, typed), undefined);
    }
  }
  for (const typed of ["watch", "clips", "build", "sculptures", "play volleyball", "buy lego"]) {
    assert.equal(answerCorrection(3, typed), undefined, typed);
  }
});
test("the cooking round suggests a canonical phrase after three edits", () => {
  const typo = "Garilc parmasan steak patsa";
  const canonical = "Garlic Parmesan Steak Pasta";
  assert.deepEqual(answerCorrection(cooking, typo), { originalAnswer: typo, correctedAnswer: canonical });
  assert.equal(answerCorrection(0, typo), undefined);
  assert.equal(answerCorrection(cooking, canonical.toUpperCase()), undefined);
  assert.deepEqual(scoreAnswer(cooking, canonical, 10000, 25000), {
    points: 72, basePoints: 60, speedBonus: 12, tier: "Pomelo Gem", ingredient: "Pomelo Gem",
    depth: 2, matched: true, elapsedMs: 10000, canonicalAnswer: canonical,
  });
});
test("extra forgiveness for long entries remains a suggestion until confirmed", () => {
  for (const [position, typo, canonical, base] of [
    [2, "Cxrpenxersvixle", "Carpentersville", 80],
    [cooking, "Garilc parmasan stek patsa", "Garlic Parmesan Steak Pasta", 60],
  ] as const) {
    assert.deepEqual(answerCorrection(position, typo), { originalAnswer: typo, correctedAnswer: canonical });
    assert.equal(scoreAnswer(position, typo, 10000, 25000).points, 0);
    assert.equal(answerCorrection(position, canonical), undefined);
    assert.equal(scoreAnswer(position, canonical, 10000, 25000).basePoints, base);
  }
});
test("a specific phrase may add one missing word without upgrading an exact answer", () => {
  for (const [typed, canonical] of [
    ["Parmesan   steak pasta", "Garlic Parmesan Steak Pasta"],
    ["beef soup", "Beef Noodle Soup"],
    ["kimchi fried", "Kimchi Fried Rice"],
  ]) assert.deepEqual(answerCorrection(cooking, typed), { originalAnswer: typed, correctedAnswer: canonical });
  for (const typed of ["fried rice", "pasta", "kimchi", "steak pasta", "soup beef", "beef noodles",
    "red braised pork hong shao", "someone else's dinner"]) assert.equal(answerCorrection(cooking, typed), undefined, typed);
  assert.equal(scoreAnswer(cooking, "FRIED RICE", 10000, 25000).canonicalAnswer, "Fried Rice");
  assert.equal(scoreAnswer(cooking, "FRIED RICE", 10000, 25000).basePoints, 20);
  assert.equal(scoreAnswer(cooking, "kimchi fried rice", 10000, 25000).basePoints, 60);
  assert.equal(answerCorrection(0, "beef soup"), undefined);
});
test("alternate word forms suggest existing answers only in their own round", () => {
  assert.deepEqual(answerCorrection(final, " PaTiEnCe "), { originalAnswer: "PaTiEnCe", correctedAnswer: "Patient" });
  assert.equal(answerCorrection(final, "PATIENT"), undefined);
  assert.equal(scoreAnswer(final, "PATIENT", 7500, 25000).basePoints, 80);
  assert.equal(scoreAnswer(final, "patience", 7500, 25000).points, 0);
  for (let position = 0; position < final; position++) assert.equal(answerCorrection(position, "patience"), undefined);
  for (const unrelated of ["impatience", "tolerance", "beautiful", "strategy"]) {
    assert.equal(answerCorrection(final, unrelated), undefined, unrelated);
    assert.equal(scoreAnswer(final, unrelated, 7500, 25000).matched, false, unrelated);
  }
  for (const [from, to] of amyWordForms) {
    const question = questionBank[final];
    assert.ok(question.keyed.has(to), `The final round no longer lists ${to}`);
    const exact = question.keyed.has(from);
    const expected = exact ? undefined : { originalAnswer: from, correctedAnswer: question.keyed.get(to)?.answer };
    assert.deepEqual(answerCorrection(final, from), expected);
  }
});
test("rarity comes from sheet, independent of other submissions and speed", () => {
  const reward = scoreAnswer(0, "Sovereign Grace Music", 30000, 60000);
  assert.equal(reward.basePoints, 100);
  assert.equal(reward.speedBonus, 10);
  assert.equal(reward.points, 110);
  assert.equal(reward.depth, 4);
  assert.equal(reward.ingredient, "Golden Mango");
  assert.equal(scoreAnswer(0, "Sovereign Grace Music", 59000, 60000).depth, 4);
});
test("Too Clever earns lowest tier base points", () => {
  assert.equal(scoreAnswer(1, "Google cafe", 30000, 60000).basePoints, 20);
  assert.equal(scoreAnswer(cooking, "mango sago", 30000, 60000).tier, "Sago Pearl");
});
test("speed bonus respects endpoints and server duration; unknown answers get no bonus", () => {
  assert.equal(scoreAnswer(0, "Bruno Mars", 0, 60000).points, 40);
  assert.equal(scoreAnswer(0, "Bruno Mars", 60000, 60000).points, 20);
  assert.equal(scoreAnswer(0, "Bruno Mars", 15000, 30000).speedBonus, 10);
  assert.equal(scoreAnswer(0, "unlisted artist", 0, 60000).speedBonus, 0);
  assert.equal(scoreAnswer(0, "Bruno Mars", -100, 60000).speedBonus, 20);
});
test("25-second rounds retain a variable 20-point speed maximum independent of rarity", () => {
  assert.equal(ROUND_DURATION_SECONDS, 25);
  const duration = ROUND_DURATION_SECONDS * 1000;
  for (const answer of ["Bruno Mars", "Sovereign Grace Music"]) {
    assert.equal(scoreAnswer(0, answer, 0, duration).speedBonus, 20);
    assert.equal(scoreAnswer(0, answer, 12_500, duration).speedBonus, 10);
    assert.equal(scoreAnswer(0, answer, 24_000, duration).speedBonus, 1);
    assert.equal(scoreAnswer(0, answer, 25_000, duration).speedBonus, 0);
  }
  assert.equal(scoreAnswer(0, "unlisted artist", 0, duration).points, 0);
});
test("every catalog answer scores its listed base and depth consistently", () => {
  for (const [position, question] of questionBank.entries()) for (const entry of question.catalog) {
    const result = scoreAnswer(position, entry.answer, 60000, 60000);
    assert.equal(result.basePoints, entry.basePoints);
    assert.equal(result.depth, entry.depth);
    assert.equal(result.tier, entry.tier);
  }
});
test("every prepared answer keeps its original lookup key regardless of display casing", () => {
  for (const [source, bank] of [[activeSource, questionBank], [archivedSource, bankForVersion(2)!]] as const) {
    for (const [position, question] of source.entries()) {
      for (const { answer } of question.answers) {
        const entry = bank[position].keyed.get(matchKey(answer));
        assert.equal(matchKey(entry!.answer), matchKey(answer), answer);
        for (const typed of [answer, answer.toLowerCase(), answer.toUpperCase()]) {
          assert.equal(answerCorrection(position, typed, bank), undefined, typed);
          assert.equal(scoreAnswer(position, typed, 25_000, 25_000, bank).canonicalAnswer, entry!.answer, typed);
        }
      }
    }
  }
});
test("display labels use title case without flattening brand names, accents or acronyms", () => {
  for (const [round, typed, expected] of [
    [0, "newjeans", "NewJeans"],
    [0, "rose", "Rosé"],
    [1, "yummy tofu & bbq", "Yummy Tofu & BBQ"],
    [2, "lake in the hills", "Lake in the Hills"],
    [2, "mchenry", "McHenry"],
    [3, "watch the kardashians", "Watch the Kardashians"],
    [4, "h&m earrings", "H&M Earrings"],
    [4, "Id", "ID"],
    [cooking, "xlb", "Soup Dumplings | XLB"],
  ] as const) assert.equal(scoreAnswer(round, typed, 25_000, 25_000).canonicalAnswer, expected, typed);
});
