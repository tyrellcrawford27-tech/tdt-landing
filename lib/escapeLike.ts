/**
 * Escapes the wildcards PostgREST's `ilike` treats as pattern syntax.
 *
 * Every email lookup in this app passes a caller-supplied address straight into
 * `.ilike('email', value)`. Unescaped, `%` and `_` are wildcards and `*` is
 * translated to `%` by PostgREST — so an address like `a%@b.com` matches (and
 * can therefore overwrite, or leak the existence of) somebody else's row.
 * Emails legitimately contain none of these, so escaping is loss-free.
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_*]/g, m => `\\${m}`);
}
