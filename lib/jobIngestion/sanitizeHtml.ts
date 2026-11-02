/**
 * Job descriptions come from third-party employers via public ATS/aggregator
 * APIs — UNTRUSTED DATA, and some providers return it as raw HTML. This
 * strips it down to plain text using a real HTML parser (sanitize-html),
 * never a hand-rolled regex, so malformed markup, nested tags, or an
 * attempted <script>/onerror="..."/<style> injection can't survive as
 * anything but inert text. The result is never rendered as HTML and never
 * fed back into any template, shell command, or LLM prompt as instructions —
 * it is stored and displayed as plain text only.
 */
import sanitizeHtmlLib from 'sanitize-html'

const MAX_DESCRIPTION_LENGTH = 20000

export function sanitizeJobDescription(input: string | null | undefined): string {
  if (!input) return ''

  // allowedTags/allowedAttributes: [] strips every tag (including
  // <script>/<style> and their content) down to the text nodes only —
  // nothing is preserved that could be reinterpreted as markup or code.
  // sanitize-html also re-escapes any literal &, <, > left in the text
  // (while still decoding safe entities like &ndash; to real characters) —
  // that's intentional defense in depth: if this text is ever interpolated
  // into an HTML context later, it can't suddenly become a new tag.
  const stripped = sanitizeHtmlLib(input, {
    allowedTags: [],
    allowedAttributes: {},
    textFilter: (text) => text,
  })

  const normalized = stripped
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return normalized.length > MAX_DESCRIPTION_LENGTH
    ? normalized.slice(0, MAX_DESCRIPTION_LENGTH)
    : normalized
}
