// Answer normalisation and comparison for typed answers.

export function normalise(s) {
  return s
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/[.!?¿¡,;:]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe');
}

const ARTICLE = /^(le|la|les|un|une|des|l')\s*/;

/**
 * Compare a typed answer with one or more accepted answers.
 * Returns 'exact' | 'accent' | 'wrong'.
 * opts.ignoreArticle: accept answers with or without a leading article.
 */
export function check(input, accepted, opts = {}) {
  const list = (Array.isArray(accepted) ? accepted : [accepted]).flatMap((a) => a.split(' / '));
  const prep = (s) => {
    let n = normalise(s);
    if (opts.ignoreArticle) n = n.replace(ARTICLE, '');
    return n;
  };
  const got = prep(input);
  if (!got) return 'wrong';
  for (const a of list) if (prep(a) === got) return 'exact';
  for (const a of list) if (stripAccents(prep(a)) === stripAccents(got)) return 'accent';
  return 'wrong';
}

/** Levenshtein distance, used for picking lookalike decoys. */
export function distance(a, b) {
  a = stripAccents(a);
  b = stripAccents(b);
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n];
}
