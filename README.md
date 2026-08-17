# dsh-chat-image

[![npm version](https://img.shields.io/npm/v/dsh-chat-image.svg)](https://www.npmjs.com/package/dsh-chat-image)
[![GitHub](https://img.shields.io/badge/GitHub-Niobium--41--nb%2Fdsh--chat--image-blue.svg)](https://github.com/Niobium-41-nb/dsh-chat-image)

English | [中文](README.zh.md)

Renders chat Markdown image references (`![alt](path title)`) as a gallery under each closing assistant message in the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web GUI.

- **Local workspace paths** load through a validated host route (`/dsh-chat-image`): the path must resolve inside a registered workspace and be a regular file of at most 32 MiB; the file is served with an extension-derived content type.
- **http(s) references are skipped** — the built-in markdown renderer already shows them inline.
- **`data:` URLs** render directly.
- The optional **title** renders as the caption below the image and as the hover hint; a local file without a title shows its absolute path as the hover hint.
- A reference whose image fails to load (missing file, out of workspace, over the byte cap) falls back to its alt text; an empty alt renders nothing for that item.
- Clicking a local image opens the file through the same host opener the tool rows use.

## Install

As a standalone bundle, from a dsh installation:

```sh
# from npm
dsh plugin --profile web add dsh-chat-image

# from the git repository
dsh plugin --profile web add github:Niobium-41-nb/dsh-chat-image

# from a tarball
dsh plugin --profile web add ./dsh-chat-image-0.1.0.tgz
```

A git install fetches sources and runs the package's `prepare` build; pnpm ≥ 10 requires an explicit build allowance for that script (the `add` output prints the exact `pnpm-workspace.yaml` entry to add). The `web` profile's browser roster (`clientModules`) picks the browser half up automatically through the `dsh.client` manifest; the Loader mounts the host half through the bundle patch.

## Usage

The model writes ordinary Markdown image references in its reply:

```markdown
![架构图](docs/architecture.png "架构总览")
![](my image.png)      <!-- paths with spaces need angle brackets -->
![inline](data:image/png;base64,AAAA)
```

Relative paths resolve against the session working directory; absolute paths (drive-letter, `/`, or `\\`) pass through. Assistant closing turns only: the tail hole does not exist under user messages, and a turn with produced files keeps that row (the gallery shows only when it declines).

## Develop

```sh
pnpm install
pnpm test      # vitest: route status matrix + reference extraction
pnpm build     # tsc types (lib/types) + tsdown bundles (lib/index.js, lib/client.js)
```

The browser bundle is CJS wrapped for the dsh loader (`window.__ModuleLoader__.load`) with only the frozen platform-module table external; the node half has no runtime imports. Both halves consume harness services structurally, so the package carries no runtime or type dependency on `@deepseek-ai/*` beyond the platform modules.

## Known Limitations

- **Assistant closing turns only.** The turn-tail hole exists only under closing assistant messages.
- **Chain exclusivity with the produced-files row.** A turn that has both produced files and image references shows only the produced-files row (higher priority).
- **CommonMark destination rules.** A path containing spaces must be written in angle brackets (`<my image.png>`); an unquoted multi-word destination is parsed as path + title.
- **Workspace containment.** Only files inside a registered workspace are served; the route answers `403` for anything else, so it cannot read arbitrary host files.
