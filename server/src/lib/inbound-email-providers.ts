import type { InboundEmailInput } from '@ticket/core'

// Shape of CloudMailin's "Normalized JSON" format (only the fields we use).
// https://docs.cloudmailin.com/http_post_formats/json_normalized/
interface CloudMailinPayload {
  envelope?: { from?: string }
  headers?: { from?: string; subject?: string; message_id?: string }
  plain?: string
  html?: string
}

// Parses an RFC 5322-style "Name <email>" header into its parts, falling back to a bare
// address (no display name) and finally to the envelope sender if the header is missing.
function parseFromHeader(headerValue: string | undefined, envelopeFrom: string | undefined): { email: string; name: string } {
  const value = (headerValue ?? '').trim()
  const match = value.match(/^"?([^"<]*)"?\s*<([^>]+)>$/)
  if (match) {
    const name = match[1].trim()
    const email = match[2].trim()
    return { email, name: name || email }
  }
  const email = value || (envelopeFrom ?? '').trim()
  return { email, name: email }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// Cuts off the quoted original message that mail clients append below a reply, so only the
// new text the sender typed is kept. 
function stripQuotedReply(text: string): string {
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const isSeparator = /^_{10,}$/.test(line)
    const isGmailStyle = /^On .{0,200}wrote:$/.test(line)
    const isOutlookHeader =
      /^From:\s*\S/.test(line) && lines.slice(i + 1, i + 3).some((l) => /^(Sent|Date):\s*\S/.test(l.trim()))
    if (isSeparator || isGmailStyle || isOutlookHeader) {
      const before = lines.slice(0, i).join('\n').trim()
      return before || text.trim()
    }
  }
  return text.trim()
}

export function mapCloudMailinPayload(payload: unknown): InboundEmailInput | null {
  const p = (payload ?? {}) as CloudMailinPayload
  const { email, name } = parseFromHeader(p.headers?.from, p.envelope?.from)

  const plain = p.plain?.trim()
  const html = p.html?.trim()
  const rawBody = plain || (html ? stripHtml(html) : '')
  const body = rawBody ? stripQuotedReply(rawBody) : ''
  if (!email || !body) return null

  return {
    from: email,
    fromName: name,
    subject: p.headers?.subject?.trim() || '(no subject)',
    body: body.slice(0, 1_000),
    bodyHtml: html ? html.slice(0, 2_000) : undefined,
    messageId: p.headers?.message_id?.trim() || undefined,
  }
}
