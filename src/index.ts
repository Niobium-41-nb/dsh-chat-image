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
export const name = 'dsh-chat-image'

/** Route the browser half addresses with `?p=<encodeURIComponent(absPath)>`. */
export const CHAT_IMAGE_PATH = '/dsh-chat-image'

/** Inclusive byte cap for one served image; larger files answer 413. */
export const MAX_IMAGE_BYTES = 32 * 1024 * 1024

/** Content types by image extension; anything else falls back to octet-stream. */
const IMAGE_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
  apng: 'image/apng',
  tif: 'image/tiff',
  tiff: 'image/tiff',
}

/**
 * Content type for an image path by its extension.
 * @param path - the resolved absolute path whose suffix selects the MIME type.
 * @returns the image content type, or `application/octet-stream` for unknown suffixes.
 */
export function imageMimeOf(path: string): string {
  const dot = path.lastIndexOf('.')
  const ext = dot === -1 ? '' : path.slice(dot + 1).toLowerCase()
  return IMAGE_MIME[ext] ?? 'application/octet-stream'
}

/** A resolved filesystem target (the dsh `fs` service's opaque identity). */
interface FsTarget {
  readonly targetKey: string
}

/** Metadata about a target; `undefined` means the target is absent. */
interface FsInfo {
  type: 'file' | 'directory' | 'other'
  size?: number
}

/** The `fs` service surface the route reads. */
interface FileSystemLike {
  resolve(path: string): Promise<FsTarget>
  contains(parent: FsTarget, child: FsTarget): boolean
  stat(target: FsTarget): Promise<FsInfo | undefined>
  readBytes(target: FsTarget, signal: unknown, maxBytes: number): Promise<Uint8Array>
}

/** A durable workspace record; only the canonical path is read. */
interface WorkspaceLike {
  readonly path: string
}

/** The `webServer` service surface the route registers into. */
interface WebServerLike {
  register(route: { kind: 'exact' | 'prefix'; path: string; handler: unknown }): () => void
}

/** Node `http.IncomingMessage` face the route reads. */
interface NodeRequestLike {
  url?: string
}

/** Node `http.ServerResponse` face the route writes. */
interface NodeResponseLike {
  readonly headersSent: boolean
  writeHead(status: number, headers?: Record<string, string>): unknown
  end(body?: unknown): void
  destroy(): void
}

/** Services the route handler needs, narrowed to what it reads. */
export interface ChatImageRouteDeps {
  /** Filesystem provider for containment checks, stats, and reads. */
  fs: FileSystemLike
  /** Durable workspace registry supplying the allowed roots. */
  workspaces: { list(): readonly WorkspaceLike[] }
  /** Reports handler failures that escape the known 4xx/5xx arms. */
  onError: (err: unknown) => void
}

/**
 * Build the route handler. Response statuses: 200 served image; 400 missing or
 * undecodable path; 403 outside every workspace; 404 unknown path or
 * non-file; 413 over the byte cap; 500 unexpected failure.
 * @param deps - filesystem, workspace roots, and the failure reporter.
 * @returns the web route handler owning the full response lifecycle.
 */
export function createChatImageHandler(deps: ChatImageRouteDeps): (req: NodeRequestLike, res: NodeResponseLike) => Promise<void> {
  return async (req, res) => {
    try {
      const url = req.url ?? ''
      const at = url.indexOf('?p=')
      if (at === -1) {
        res.writeHead(400)
        res.end()
        return
      }
      let raw = ''
      try {
        raw = decodeURIComponent(url.slice(at + 3))
      } catch {
        res.writeHead(400)
        res.end()
        return
      }
      if (raw === '') {
        res.writeHead(400)
        res.end()
        return
      }
      let target: FsTarget
      try {
        target = await deps.fs.resolve(raw)
      } catch {
        res.writeHead(404)
        res.end()
        return
      }
      let allowed = false
      for (const workspace of deps.workspaces.list()) {
        const parent = await deps.fs.resolve(workspace.path)
        if (deps.fs.contains(parent, target)) {
          allowed = true
          break
        }
      }
      if (!allowed) {
        res.writeHead(403)
        res.end()
        return
      }
      const info = await deps.fs.stat(target)
      if (info === undefined || info.type !== 'file') {
        res.writeHead(404)
        res.end()
        return
      }
      let bytes: Uint8Array
      try {
        bytes = await deps.fs.readBytes(target, undefined, MAX_IMAGE_BYTES)
      } catch (err) {
        if ((err as { code?: string }).code === 'FS_TOO_LARGE') {
          res.writeHead(413)
          res.end()
          return
        }
        throw err
      }
      res.writeHead(200, {
        'Content-Type': imageMimeOf(raw),
        'Content-Length': String(bytes.length),
        'Cache-Control': 'private, max-age=300',
      })
      res.end(bytes)
    } catch (err) {
      deps.onError(err)
      if (res.headersSent) {
        res.destroy()
        return
      }
      res.writeHead(500)
      res.end()
    }
  }
}

/** The plugin context surface `apply` reads. */
export interface PluginCtx {
  get(name: string): unknown
  effect(callback: () => unknown, label?: string): () => void
  logger?: { error(...values: unknown[]): void }
}

/**
 * Register the chat image route when the web surface is present.
 * @param ctx - host context carrying the optional web/fs/workspace services.
 */
export function apply(ctx: PluginCtx): void {
  const webServer = ctx.get('webServer') as WebServerLike | undefined
  const fs = ctx.get('fs') as FileSystemLike | undefined
  const workspaces = ctx.get('workspaceRegistry') as { list(): readonly WorkspaceLike[] } | undefined
  if (webServer === undefined || fs === undefined || workspaces === undefined) return
  const handler = createChatImageHandler({
    fs,
    workspaces,
    onError: err => { ctx.logger?.error(err) ?? console.error(err) },
  })
  // The route disposer is fiber-owned so an update/stop retracts the route.
  ctx.effect(() => webServer.register({ kind: 'exact', path: CHAT_IMAGE_PATH, handler }))
}
