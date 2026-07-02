// Shared search-query state. FeedList writes the trimmed query as the user types; DetailPane
// reads it to highlight matches in the open post's body. A plain module-level rune (not a prop)
// because the two components don't otherwise share a parent-child data path for this value.
let query = $state('');

export function getActiveSearchQuery() {
  return query;
}

/** @param {string} value */
export function setActiveSearchQuery(value) {
  query = value;
}
