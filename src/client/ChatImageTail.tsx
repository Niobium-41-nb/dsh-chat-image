/**
 * dsh-chat-image browser half, component: renders chat Markdown image
 * references (`![alt](path title)`) as a gallery under each closing assistant
 * message, plus the pure extraction/scanning/routing logic. The chain entry
 * lives in `index.ts`; the snapshot and chain faces are consumed
 * structurally, so this bundle has no runtime dependency beyond `react`
 * (a platform module) and the slot service the framework injects.
 */
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

/** One renderable image reference extracted from closing prose. */
export interface ChatImageRef {
  /** Markdown alt text; shown as the fallback when the image fails to load. */
  alt: string
  /** Optional Markdown title; shown as the caption and hover hint. */
  title: string | undefined
  /** Browser-ready image source. */
  url: string
  /** Absolute local path opened on click; null for direct data: URLs. */
  open: string | null
}

/**
 * Split a markdown image destination into path and optional title.
 * @param dest - the parenthesised destination without the surrounding parens.
 * @returns the path and title; a `<path with spaces>` form and quoted titles are honored.
 */
export function parseImageDest(dest: string): { path: string; title: string | undefined } {
  const angle = dest.match(/^<([^>]*)>\s*(?:"([^"]*)"|'([^']*)')?\s*$/)
  if (angle !== null) return { path: angle[1] ?? '', title: angle[2] ?? angle[3] }
  const plain = dest.match(/^(\S+)(?:\s+(?:"([^"]*)"|'([^']*)'|(\S+)))?\s*$/)
  if (plain !== null) return { path: plain[1] ?? '', title: plain[2] ?? plain[3] ?? plain[4] }
  return { path: dest, title: undefined }
}

/**
 * Resolve a possibly-relative image path against the session cwd.
 * @param path - the markdown path; absolute forms pass through unchanged.
 * @param cwd - the session working directory; required for relative paths.
 * @returns the absolute path, or null when relative and no cwd is known.
 */
export function resolveImagePath(path: string, cwd: string | undefined): string | null {
  if (path === '') return null
  const isDrive = /^[a-zA-Z]:[\\/]/.test(path)
  if (path.startsWith('/') || path.startsWith('\\') || isDrive) return path
  if (cwd === undefined) return null
  const base = cwd.replace(/[\\/]+$/, '')
  return `${base}/${path.replace(/^[\\/]+/, '')}`
}

const IMAGE_REF = /!\[([^\]]*)\]\(([^)]*)\)/g

/**
 * Extract renderable image references from markdown text.
 * @param text - the closing assistant prose.
 * @param cwd - the session working directory for relative paths.
 * @returns local and data: references; http(s) references are excluded.
 */
export function extractImageRefs(text: string, cwd: string | undefined): ChatImageRef[] {
  const refs: ChatImageRef[] = []
  let match: RegExpExecArray | null
  IMAGE_REF.lastIndex = 0
  while ((match = IMAGE_REF.exec(text)) !== null) {
    const alt = match[1] ?? ''
    const dest = (match[2] ?? '').trim()
    if (dest === '') continue
    const { path, title } = parseImageDest(dest)
    if (/^https?:\/\//i.test(path)) continue
    if (/^data:/i.test(path)) {
      refs.push({ alt, title, url: path, open: null })
      continue
    }
    const abs = resolveImagePath(path, cwd)
    if (abs === null) continue
    refs.push({ alt, title, url: `/dsh-chat-image?p=${encodeURIComponent(abs)}`, open: abs })
  }
  return refs
}

/** The turn-tail chain owner face the selector reads. */
export interface TurnTailOwnerLike {
  /** Closing assistant seq this tail renders under. */
  seq: number
  /** Opens a filesystem path through the Host. */
  openFile: (path: string) => void
  /** Engine-owned closing Turn boundary. */
  turn: { status: 'open' | 'closed' | 'unknown' }
}

/**
 * Chain routing: match every closed turn; the component decides by scanning
 * the snapshot and returns null when the turn carries no image references.
 * @param owner - the turn-tail owner currency.
 * @returns the closing seq when the turn is closed, else null.
 */
export function selectChatImageTail(owner: TurnTailOwnerLike): { seq: number } | null {
  if (owner.turn.status !== 'closed') return null
  return { seq: owner.seq }
}

/** The conversation snapshot's chat-node store face the component walks. */
interface ChatNodesLike {
  values(): unknown[]
}

/**
 * Read the closing assistant's content blocks for a seq from the snapshot.
 * @param snapshot - the conversation snapshot whose chat nodes are scanned.
 * @param seq - the closing assistant's final-node seq.
 * @returns the assistant blocks, or null when no matching node is materialized.
 */
export function closingAssistantBlocks(snapshot: unknown, seq: number): unknown {
  const nodes = (snapshot as { chat?: { nodes?: ChatNodesLike } })?.chat?.nodes
  if (nodes === undefined) return null
  const values = nodes.values()
  if (!Array.isArray(values)) return null
  for (const node of values) {
    const kind = (node as { kind?: unknown })?.kind
    const data = (node as { data?: { finalNode?: { seq?: unknown }; blocks?: unknown } })?.data
    if (kind === 'assistant-step' && data?.finalNode?.seq === seq) {
      return data.blocks ?? null
    }
  }
  return null
}

/** Minimal framework standard kit the turn-tail chain passes to components. */
export interface ChatImageTailProps {
  /** Closing assistant seq this tail renders under. */
  seq: number
  /** Opens a filesystem path through the Host (tool-row semantics). */
  openFile: (path: string) => void
  /** Session-scoped conversation snapshot selector (standard framework hook). */
  useSession: <T>(select: (snapshot: unknown) => T) => T
  /** The resolved session id (standard framework prop). */
  sessionId: string
  /** Global session-list selector (standard framework hook). */
  useSessions: <T>(select: (state: unknown) => T) => T
}

/** Theme-aware gallery styles (inline to keep the bundle build toolchain-free). */
const STYLES = {
  gallery: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    margin: '10px 0 4px',
    alignItems: 'flex-start',
  },
  item: {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    maxWidth: 'min(340px, 100%)',
  },
  img: {
    display: 'block',
    maxWidth: 'min(340px, 100%)',
    maxHeight: 280,
    objectFit: 'contain',
    borderRadius: 8,
    border: '1px solid var(--dsw-alias-border-l1, rgba(148, 163, 184, .35))',
    background: 'var(--dsw-alias-bg-layer-1, rgba(148, 163, 184, .12))',
    cursor: 'pointer',
  },
  caption: {
    fontSize: 12,
    lineHeight: 1.5,
    color: 'var(--dsw-alias-label-secondary, #8b949e)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 340,
  },
  alt: {
    fontSize: 13,
    color: 'var(--dsw-alias-label-secondary, #8b949e)',
    fontStyle: 'italic',
  },
} as const

/**
 * Render one closing assistant turn's image references as a gallery.
 * @param props - the closing seq, opener, and the framework standard kit.
 * @returns the gallery, or null when the turn carries no renderable references.
 */
export function ChatImageTail({
  seq, openFile, useSession, sessionId, useSessions,
}: ChatImageTailProps): ReactNode {
  const [broken, setBroken] = useState<readonly number[]>([])
  // A fresh turn remounts its own tail node, but guard anyway: stale error
  // indices must never hide a later turn's first images.
  useEffect(() => { setBroken([]) }, [seq])
  const blocks = useSession(snapshot => closingAssistantBlocks(snapshot, seq))
  const cwd = useSessions(state => {
    const row = (state as { byId?: Record<string, { cwd?: string }> })?.byId?.[sessionId]
    return row?.cwd
  })
  let text = ''
  if (blocks !== null && Array.isArray(blocks)) {
    for (const block of blocks as readonly { kind?: string; text?: string }[]) {
      if (block.kind === 'text' && typeof block.text === 'string') text += block.text
    }
  }
  const refs = extractImageRefs(text, cwd)
  if (refs.length === 0) return null
  const items: ReactNode[] = []
  for (let index = 0; index < refs.length; index++) {
    const ref = refs[index]
    if (ref === undefined) continue
    if (broken.includes(index)) {
      if (ref.alt !== '') {
        items.push(<span key={index} style={STYLES.alt}>{ref.alt}</span>)
      }
      continue
    }
    const title: string | undefined = ref.title ?? (ref.open ?? undefined)
    const open = ref.open
    items.push(
      <figure key={index} style={STYLES.item}>
        <img
          style={STYLES.img}
          src={ref.url}
          alt={ref.alt}
          title={title}
          loading="lazy"
          decoding="async"
          onClick={open === null ? undefined : () => openFile(open)}
          onError={() => setBroken(prev => prev.includes(index) ? prev : [...prev, index])}
        />
        {ref.title !== undefined && <figcaption style={STYLES.caption}>{ref.title}</figcaption>}
      </figure>,
    )
  }
  if (items.length === 0) return null
  return <div style={STYLES.gallery}>{items}</div>
}
