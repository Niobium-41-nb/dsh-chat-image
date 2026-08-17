// @vitest-environment node
/**
 * dsh-chat-image browser half: the markdown-reference extraction contract, the
 * snapshot scan, and the chain routing (pure logic, no React render).
 */
import { describe, expect, it } from 'vitest'
import {
  closingAssistantBlocks, extractImageRefs, parseImageDest,
  resolveImagePath, selectChatImageTail, type TurnTailOwnerLike,
} from '../src/client/index.ts'

const closedTurn = (seq: number): TurnTailOwnerLike => ({
  seq,
  openFile: () => {},
  turn: { status: 'closed' },
})

function blocksSnapshot(blocks: unknown[], seq: number): unknown {
  return {
    chat: {
      nodes: {
        values: () => [
          { kind: 'assistant-step', data: { status: 'settled', blocks, finalNode: { seq } } },
        ],
      },
    },
  }
}

describe('markdown reference extraction', () => {
  it('parses angle-bracket and quoted destinations with optional titles', () => {
    expect(parseImageDest('<my image.png> "a title"')).toEqual({ path: 'my image.png', title: 'a title' })
    expect(parseImageDest("<my image.png> 't'")).toEqual({ path: 'my image.png', title: 't' })
    expect(parseImageDest('docs/a.png "总览"')).toEqual({ path: 'docs/a.png', title: '总览' })
    expect(parseImageDest('docs/a.png')).toEqual({ path: 'docs/a.png', title: undefined })
    expect(parseImageDest('docs/a.png bare-title')).toEqual({ path: 'docs/a.png', title: 'bare-title' })
  })

  it('resolves absolute and relative paths against the session cwd', () => {
    expect(resolveImagePath('/abs/a.png', 'C:\\ws')).toBe('/abs/a.png')
    expect(resolveImagePath('C:\\abs\\a.png', 'C:\\ws')).toBe('C:\\abs\\a.png')
    expect(resolveImagePath('docs/a.png', 'C:\\ws')).toBe('C:\\ws/docs/a.png')
    expect(resolveImagePath('docs/a.png', 'C:\\ws\\')).toBe('C:\\ws/docs/a.png')
    expect(resolveImagePath('docs/a.png', undefined)).toBeNull()
    expect(resolveImagePath('', 'C:\\ws')).toBeNull()
  })

  it('keeps http(s) out and loads local and data references', () => {
    const refs = extractImageRefs(
      [
        '![remote](https://example.com/a.png)',
        '![local](docs/a.png "总览")',
        '![data](data:image/png;base64,AAAA)',
      ].join('\n'),
      'C:\\ws',
    )
    expect(refs).toEqual([
      { alt: 'local', title: '总览', url: '/dsh-chat-image?p=C%3A%5Cws%2Fdocs%2Fa.png', open: 'C:\\ws/docs/a.png' },
      { alt: 'data', title: undefined, url: 'data:image/png;base64,AAAA', open: null },
    ])
  })

  it('skips empty destinations and relative paths without a cwd', () => {
    expect(extractImageRefs('![]( )', 'C:\\ws')).toEqual([])
    expect(extractImageRefs('![x](rel.png)', undefined)).toEqual([])
  })
})

describe('closing assistant scan', () => {
  it('returns the closing blocks by final-node seq and skips other kinds', () => {
    const blocks = [{ kind: 'text', text: '![a](a.png)' }]
    expect(closingAssistantBlocks(blocksSnapshot(blocks, 7), 7)).toBe(blocks)
    expect(closingAssistantBlocks(blocksSnapshot(blocks, 7), 99)).toBeNull()
    expect(closingAssistantBlocks({}, 7)).toBeNull()
    expect(closingAssistantBlocks({ chat: { nodes: { values: () => 'not-an-array' } } }, 7)).toBeNull()
  })
})

describe('chain routing', () => {
  it('matches closed turns with their seq and declines open turns', () => {
    expect(selectChatImageTail(closedTurn(5))).toEqual({ seq: 5 })
    expect(selectChatImageTail({ seq: 3, openFile: () => {}, turn: { status: 'open' } })).toBeNull()
  })
})
