// @vitest-environment node
/**
 * dsh-chat-image node half: the route's status matrix (400/403/404/413/500/200),
 * the MIME map, and the fiber-owned registration.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  apply, CHAT_IMAGE_PATH, createChatImageHandler, imageMimeOf,
} from '../src/index.ts'
import type {
  ChatImageRouteDeps, NodeResponseLike, PluginCtx,
} from '../src/index.ts'

const WORKSPACE = 'C:\\ws'

function fakeFs() {
  const resolve = vi.fn(async (path: string) => ({ targetKey: path }))
  const contains = vi.fn(() => true)
  const stat = vi.fn(async () => ({ type: 'file', version: 0 }))
  const readBytes = vi.fn(async () => new Uint8Array([1, 2, 3]))
  return { resolve, contains, stat, readBytes }
}

function fakeResponse() {
  let status = 0
  let headers: Record<string, string> | undefined
  let body: unknown
  let sent = false
  let destroyed = false
  const res: NodeResponseLike = {
    get headersSent() { return sent },
    writeHead(code: number, head?: Record<string, string>) {
      status = code
      headers = head
      return res
    },
    end(value?: unknown) { body = value ?? null },
    destroy() { destroyed = true },
  }
  return {
    res,
    status: () => status,
    header: (name: string) => headers?.[name],
    body: () => body,
    sent: () => { sent = true },
    destroyed: () => destroyed,
  }
}

function handler(
  fs: ReturnType<typeof fakeFs>,
  list: () => readonly { path: string }[] = () => [{ path: WORKSPACE }],
): { handle: ReturnType<typeof createChatImageHandler>; onError: ReturnType<typeof vi.fn> } {
  const onError = vi.fn()
  const handle = createChatImageHandler({
    fs: fs as unknown as ChatImageRouteDeps['fs'],
    workspaces: { list },
    onError,
  })
  return { handle, onError }
}

async function run(
  handle: ReturnType<typeof createChatImageHandler>,
  url: string,
  res = fakeResponse(),
) {
  await handle({ url } as Parameters<ReturnType<typeof createChatImageHandler>>[0], res.res)
  return res
}

describe('chat image route status matrix', () => {
  it('answers 400 when the query parameter is missing, undecodable, or empty', async () => {
    const { handle } = handler(fakeFs())
    expect((await run(handle, '/dsh-chat-image')).status()).toBe(400)
    expect((await run(handle, '/dsh-chat-image?p=%E0%A4%A')).status()).toBe(400)
    expect((await run(handle, '/dsh-chat-image?p=')).status()).toBe(400)
  })

  it('answers 404 when the path cannot be resolved', async () => {
    const fs = fakeFs()
    fs.resolve.mockRejectedValue(new Error('ENOENT'))
    const { handle } = handler(fs)
    expect((await run(handle, `/dsh-chat-image?p=${encodeURIComponent(`${WORKSPACE}\\gone.png`)}`)).status()).toBe(404)
  })

  it('answers 403 for a path outside every workspace', async () => {
    const fs = fakeFs()
    fs.contains.mockReturnValue(false)
    const { handle, onError } = handler(fs)
    const res = await run(handle, `/dsh-chat-image?p=${encodeURIComponent('C:\\Windows\\win.ini')}`)
    expect(res.status()).toBe(403)
    expect(onError).not.toHaveBeenCalled()
  })

  it('answers 404 for an absent target or a non-file target', async () => {
    const fs = fakeFs()
    fs.stat.mockResolvedValue(undefined)
    const { handle } = handler(fs)
    expect((await run(handle, `/dsh-chat-image?p=${encodeURIComponent(`${WORKSPACE}\\none.png`)}`)).status()).toBe(404)
    fs.stat.mockResolvedValue({ type: 'directory', version: 0 })
    expect((await run(handle, `/dsh-chat-image?p=${encodeURIComponent(WORKSPACE)}`)).status()).toBe(404)
  })

  it('answers 413 over the byte cap and reports unexpected read failures', async () => {
    const fs = fakeFs()
    fs.readBytes.mockRejectedValue({ code: 'FS_TOO_LARGE' })
    const { handle } = handler(fs)
    expect((await run(handle, `/dsh-chat-image?p=${encodeURIComponent(`${WORKSPACE}\\big.png`)}`)).status()).toBe(413)
    fs.readBytes.mockRejectedValue(new Error('disk on fire'))
    const { handle: other, onError } = handler(fs)
    const failed = await run(other, `/dsh-chat-image?p=${encodeURIComponent(`${WORKSPACE}\\big.png`)}`)
    expect(failed.status()).toBe(500)
    expect(onError).toHaveBeenCalledOnce()
  })

  it('serves a workspace image with its content type and byte count', async () => {
    const { handle } = handler(fakeFs())
    const res = await run(handle, `/dsh-chat-image?p=${encodeURIComponent(`${WORKSPACE}\\shot.png`)}`)
    expect(res.status()).toBe(200)
    expect(res.header('Content-Type')).toBe('image/png')
    expect(res.header('Content-Length')).toBe('3')
    expect(res.header('Cache-Control')).toBe('private, max-age=300')
    expect(res.body()).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('destroys an already-sent response when a failure escapes', async () => {
    const fs = fakeFs()
    fs.readBytes.mockRejectedValue(new Error('boom'))
    const { handle } = handler(fs)
    const res = fakeResponse()
    res.sent()
    await run(handle, `/dsh-chat-image?p=${encodeURIComponent(`${WORKSPACE}\\x.png`)}`, res)
    expect(res.destroyed()).toBe(true)
  })

  it('honors an empty workspace roster', async () => {
    const { handle } = handler(fakeFs(), () => [])
    expect((await run(handle, `/dsh-chat-image?p=${encodeURIComponent(`${WORKSPACE}\\x.png`)}`)).status()).toBe(403)
  })
})

describe('imageMimeOf', () => {
  it('maps image extensions and falls back to octet-stream', () => {
    expect(imageMimeOf('a.png')).toBe('image/png')
    expect(imageMimeOf('a.JPEG')).toBe('image/jpeg')
    expect(imageMimeOf('a.svg')).toBe('image/svg+xml')
    expect(imageMimeOf('no-extension')).toBe('application/octet-stream')
    expect(imageMimeOf('a.unknownext')).toBe('application/octet-stream')
  })
})

describe('plugin apply', () => {
  it('registers the route with fiber-owned disposal', () => {
    const registered: Array<{ kind: string; path: string }> = []
    const dispose = vi.fn()
    const ctx: PluginCtx = {
      get: (name: string) => {
        if (name === 'webServer') return { register: (route: { kind: 'exact'; path: string }) => { registered.push(route); return dispose } }
        if (name === 'fs') return fakeFs()
        if (name === 'workspaceRegistry') return { list: () => [] }
        return undefined
      },
      effect: (callback: () => unknown) => { callback(); return () => {} },
      logger: undefined,
    }
    apply(ctx)
    expect(registered).toHaveLength(1)
    expect(registered[0]?.kind).toBe('exact')
    expect(registered[0]?.path).toBe(CHAT_IMAGE_PATH)
  })

  it('no-ops when the web surface services are absent', () => {
    const ctx: PluginCtx = {
      get: () => undefined,
      effect: () => () => {},
      logger: undefined,
    }
    expect(() => apply(ctx)).not.toThrow()
  })
})
