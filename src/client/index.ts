/**
 * dsh-chat-image browser half, plugin entry: registers the turn-tail chain
 * entry rendering chat Markdown image references under each closing assistant
 * message. Local workspace paths load through the sibling node half's
 * `/dsh-chat-image` route. The entry registers at priority 1 — behind the
 * produced-files row (default priority) — and the component returns null when
 * a turn carries no renderable references.
 */
import { ChatImageTail, selectChatImageTail } from './ChatImageTail.tsx'

export { ChatImageTail, type ChatImageTailProps } from './ChatImageTail.tsx'
export { closingAssistantBlocks, extractImageRefs, parseImageDest, resolveImagePath, selectChatImageTail } from './ChatImageTail.tsx'
export type { ChatImageRef, TurnTailOwnerLike } from './ChatImageTail.tsx'

/** The slot registry face the browser half registers into. */
interface SlotsLike {
  inject(key: string, callback: () => unknown): unknown
  register(options: unknown, component: unknown): unknown
}

/** The client context face `apply` reads. */
export interface ClientCtx {
  slots: SlotsLike
}

/** Required service: the slot registry the turn-tail entry registers into. */
export const inject = ['slots']

/**
 * Client plugin body: register the turn-tail chain entry rendering chat
 * Markdown image references under each closing assistant message.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientCtx): void {
  ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register(
    { name: 'conversation.chat.turnTail', select: selectChatImageTail, priority: 1 },
    ChatImageTail,
  ))
}
