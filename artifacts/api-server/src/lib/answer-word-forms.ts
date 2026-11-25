/** Host-approved equivalents, not corrections; keyed by the normalized listed answer. */
export const exactAnswerAliases: ReadonlyMap<string, readonly string[]> = new Map([
  ["vietnamese", ["viet"]],
  ["walkscharlie", ["walking"]],
  ["sgdtofuhouse", ["So Gong Dong Tofu House"]],
]);

/** Explicit suggestions for the question about what Daniel loves about Amy. */
export const amyWordForms: ReadonlyMap<string, string> = new Map([
  ["patience", "patient"],
  ["kindness", "kind"],
  ["humility", "humble"],
  ["strength", "strong"],
  ["dedication", "dedicated"],
  ["commitment", "committed"],
  ["forgiveness", "forgiving"],
  ["thoughtfulness", "thoughtful"],
  ["graciousness", "gracious"],
]);

export const optionalNameDescriptors: ReadonlySet<string> = new Set([
  "a", "an", "the", "of", "and",
  "music", "cafe", "restaurant", "house", "taco", "tacos", "malatang",
  "pot", "shabu", "tofu", "bbq", "burger", "burgers", "noodle", "noodles", "dumpling", "dumplings",
  "kalbijjim", "kalbijim",
  "seafood", "sushi", "udon", "kitchen", "cuisine", "garden", "tea", "boba",
  "watch", "build", "clips", "sculptures",
  "pasta", "rice", "steak", "soup", "cook",
]);

/** Recognizable shortcuts for the restaurant question only. */
export const restaurantShortForms: ReadonlyMap<string, string> = new Map([
  ["waymo", "waymocafe"],
  ["google", "googlecafe"],
  ["malatang", "zhangliangmalatang"], // The requested default, not the rarer Cuanyue entry.
  ["sgdtofu", "sgdtofuhouse"],
]);

/** A distinctive clue can identify an activity without its action or filler words. */
export const activityShortForms: ReadonlyMap<string, string> = new Map([
  ["kardashians", "watchthekardashians"],
  ["volleyball", "watchvolleyballclips"],
  ["lego", "buildlegosculptures"],
]);

/** Keep the former combined label readable in saved results and retain Jewelry as an exact alternative. */
export const carriedItemAliases: ReadonlyMap<string, readonly string[]> = new Map([
  ["ring", ["Jewelry", "Rings | Jewelry"]],
]);

/** Only suggest singulars for prepared items, not brands or items listed in the plural. */
export const carriedItemPlurals: ReadonlyMap<string, string> = new Map([
  ["backpacks", "backpack"],
  ["bags", "bag"],
  ["bibles", "bible"],
  ["books", "book"],
  ["bracelets", "bracelet"],
  ["chapsticks", "chapstick"],
  ["driverslicenses", "driverslicense"],
  ["engagementrings", "engagementring"],
  ["handcreams", "handcream"],
  ["ids", "id"],
  ["laptops", "laptop"],
  ["lipbalms", "lipbalm"],
  ["necklaces", "necklace"],
  ["ourarings", "ouraring"],
  ["phones", "phone"],
  ["purses", "purse"],
  ["rings", "ring"],
  ["scrunchies", "scrunchie"],
  ["totebags", "totebag"],
]);
