export { ChatImageTail, type ChatImageTailProps } from './ChatImageTail.tsx';
export { closingAssistantBlocks, extractImageRefs, parseImageDest, resolveImagePath, selectChatImageTail } from './ChatImageTail.tsx';
export type { ChatImageRef, TurnTailOwnerLike } from './ChatImageTail.tsx';
/** The slot registry face the browser half registers into. */
interface SlotsLike {
    inject(key: string, callback: () => unknown): unknown;
    register(options: unknown, component: unknown): unknown;
}
/** The client context face `apply` reads. */
export interface ClientCtx {
    slots: SlotsLike;
}
/** Required service: the slot registry the turn-tail entry registers into. */
export declare const inject: string[];
/**
 * Client plugin body: register the turn-tail chain entry rendering chat
 * Markdown image references under each closing assistant message.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientCtx): void;
//# sourceMappingURL=index.d.ts.map