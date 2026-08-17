import type { ReactNode } from 'react';
/** One renderable image reference extracted from closing prose. */
export interface ChatImageRef {
    /** Markdown alt text; shown as the fallback when the image fails to load. */
    alt: string;
    /** Optional Markdown title; shown as the caption and hover hint. */
    title: string | undefined;
    /** Browser-ready image source. */
    url: string;
    /** Absolute local path opened on click; null for direct data: URLs. */
    open: string | null;
}
/**
 * Split a markdown image destination into path and optional title.
 * @param dest - the parenthesised destination without the surrounding parens.
 * @returns the path and title; a `<path with spaces>` form and quoted titles are honored.
 */
export declare function parseImageDest(dest: string): {
    path: string;
    title: string | undefined;
};
/**
 * Resolve a possibly-relative image path against the session cwd.
 * @param path - the markdown path; absolute forms pass through unchanged.
 * @param cwd - the session working directory; required for relative paths.
 * @returns the absolute path, or null when relative and no cwd is known.
 */
export declare function resolveImagePath(path: string, cwd: string | undefined): string | null;
/**
 * Extract renderable image references from markdown text.
 * @param text - the closing assistant prose.
 * @param cwd - the session working directory for relative paths.
 * @returns local and data: references; http(s) references are excluded.
 */
export declare function extractImageRefs(text: string, cwd: string | undefined): ChatImageRef[];
/** The turn-tail chain owner face the selector reads. */
export interface TurnTailOwnerLike {
    /** Closing assistant seq this tail renders under. */
    seq: number;
    /** Opens a filesystem path through the Host. */
    openFile: (path: string) => void;
    /** Engine-owned closing Turn boundary. */
    turn: {
        status: 'open' | 'closed' | 'unknown';
    };
}
/**
 * Chain routing: match every closed turn; the component decides by scanning
 * the snapshot and returns null when the turn carries no image references.
 * @param owner - the turn-tail owner currency.
 * @returns the closing seq when the turn is closed, else null.
 */
export declare function selectChatImageTail(owner: TurnTailOwnerLike): {
    seq: number;
} | null;
/**
 * Read the closing assistant's content blocks for a seq from the snapshot.
 * @param snapshot - the conversation snapshot whose chat nodes are scanned.
 * @param seq - the closing assistant's final-node seq.
 * @returns the assistant blocks, or null when no matching node is materialized.
 */
export declare function closingAssistantBlocks(snapshot: unknown, seq: number): unknown;
/** Minimal framework standard kit the turn-tail chain passes to components. */
export interface ChatImageTailProps {
    /** Closing assistant seq this tail renders under. */
    seq: number;
    /** Opens a filesystem path through the Host (tool-row semantics). */
    openFile: (path: string) => void;
    /** Session-scoped conversation snapshot selector (standard framework hook). */
    useSession: <T>(select: (snapshot: unknown) => T) => T;
    /** The resolved session id (standard framework prop). */
    sessionId: string;
    /** Global session-list selector (standard framework hook). */
    useSessions: <T>(select: (state: unknown) => T) => T;
}
/**
 * Render one closing assistant turn's image references as a gallery.
 * @param props - the closing seq, opener, and the framework standard kit.
 * @returns the gallery, or null when the turn carries no renderable references.
 */
export declare function ChatImageTail({ seq, openFile, useSession, sessionId, useSessions, }: ChatImageTailProps): ReactNode;
//# sourceMappingURL=ChatImageTail.d.ts.map