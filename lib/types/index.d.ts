/**
 * dsh-chat-image node half: registers one exact web route (`/dsh-chat-image`)
 * that serves workspace image files referenced by chat Markdown
 * (`![alt](path)`). The browser half of the same feature renders the gallery
 * in the chat turn tail; this half owns byte serving and the containment rule:
 * a path is served only when it resolves inside a registered workspace, so the
 * browser never reaches arbitrary host files through it.
 *
 * The services it reads (webServer / fs / workspaceRegistry) are consumed
 * structurally via `ctx.get` with the narrow local faces below, so the plugin
 * carries no runtime or type dependency on the harness packages and stays
 * portable across compatible dsh versions.
 */
/** Cordis plugin name (function-plugin form). */
export declare const name = "dsh-chat-image";
/** Route the browser half addresses with `?p=<encodeURIComponent(absPath)>`. */
export declare const CHAT_IMAGE_PATH = "/dsh-chat-image";
/** Inclusive byte cap for one served image; larger files answer 413. */
export declare const MAX_IMAGE_BYTES: number;
/**
 * Content type for an image path by its extension.
 * @param path - the resolved absolute path whose suffix selects the MIME type.
 * @returns the image content type, or `application/octet-stream` for unknown suffixes.
 */
export declare function imageMimeOf(path: string): string;
/** A resolved filesystem target (the dsh `fs` service's opaque identity). */
interface FsTarget {
    readonly targetKey: string;
}
/** Metadata about a target; `undefined` means the target is absent. */
interface FsInfo {
    type: 'file' | 'directory' | 'other';
    size?: number;
}
/** The `fs` service surface the route reads. */
interface FileSystemLike {
    resolve(path: string): Promise<FsTarget>;
    contains(parent: FsTarget, child: FsTarget): boolean;
    stat(target: FsTarget): Promise<FsInfo | undefined>;
    readBytes(target: FsTarget, signal: unknown, maxBytes: number): Promise<Uint8Array>;
}
/** A durable workspace record; only the canonical path is read. */
interface WorkspaceLike {
    readonly path: string;
}
/** Node `http.IncomingMessage` face the route reads. */
interface NodeRequestLike {
    url?: string;
}
/** Node `http.ServerResponse` face the route writes. */
interface NodeResponseLike {
    readonly headersSent: boolean;
    writeHead(status: number, headers?: Record<string, string>): unknown;
    end(body?: unknown): void;
    destroy(): void;
}
/** Services the route handler needs, narrowed to what it reads. */
export interface ChatImageRouteDeps {
    /** Filesystem provider for containment checks, stats, and reads. */
    fs: FileSystemLike;
    /** Durable workspace registry supplying the allowed roots. */
    workspaces: {
        list(): readonly WorkspaceLike[];
    };
    /** Reports handler failures that escape the known 4xx/5xx arms. */
    onError: (err: unknown) => void;
}
/**
 * Build the route handler. Response statuses: 200 served image; 400 missing or
 * undecodable path; 403 outside every workspace; 404 unknown path or
 * non-file; 413 over the byte cap; 500 unexpected failure.
 * @param deps - filesystem, workspace roots, and the failure reporter.
 * @returns the web route handler owning the full response lifecycle.
 */
export declare function createChatImageHandler(deps: ChatImageRouteDeps): (req: NodeRequestLike, res: NodeResponseLike) => Promise<void>;
/** The plugin context surface `apply` reads. */
export interface PluginCtx {
    get(name: string): unknown;
    effect(callback: () => unknown, label?: string): () => void;
    logger?: {
        error(...values: unknown[]): void;
    };
}
/**
 * Register the chat image route when the web surface is present.
 * @param ctx - host context carrying the optional web/fs/workspace services.
 */
export declare function apply(ctx: PluginCtx): void;
export {};
//# sourceMappingURL=index.d.ts.map