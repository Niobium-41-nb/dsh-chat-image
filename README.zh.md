# dsh-chat-image

[![npm 版本](https://img.shields.io/npm/v/dsh-chat-image.svg)](https://www.npmjs.com/package/dsh-chat-image)
[![GitHub](https://img.shields.io/badge/GitHub-Niobium--41--nb%2Fdsh--chat--image-blue.svg)](https://github.com/Niobium-41-nb/dsh-chat-image)

[English](README.md) | 中文

在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 Web GUI 中，把聊天消息里的 Markdown 图片引用（`![alt](路径 title)`）渲染成助手回复下方的图片画廊。

- **本地工作区路径** 通过经过校验的宿主路由（`/dsh-chat-image`）加载：路径必须解析到已注册工作区内、且为不超过 32 MiB 的普通文件；按扩展名返回对应的内容类型。
- **http(s) 引用自动跳过**——内置 Markdown 渲染器本来就会内联显示它们。
- **`data:` URL** 直接渲染。
- 可选的 **title** 显示为图片下方的说明文字与悬浮提示；没有 title 的本地文件以绝对路径作为悬浮提示。
- 加载失败的引用（文件缺失、工作区之外、超出字节上限）回退为替代文字；替代文字为空则该条不渲染。
- 点击本地图片会通过工具行同款宿主打开器打开文件。

## 安装

作为独立 bundle，在 dsh 安装环境中：

```sh
# 从 npm（发布后可用）
dsh plugin --profile web add dsh-chat-image

# 从 git 仓库
dsh plugin --profile web add github:Niobium-41-nb/dsh-chat-image

# 从 tarball
dsh plugin --profile web add ./dsh-chat-image-0.1.0.tgz
```

git 安装会拉取源码并运行包的 `prepare` 构建；pnpm ≥ 10 需要为该脚本显式放行构建权限（`add` 的输出会打印需要加进 `pnpm-workspace.yaml` 的确切条目）。`web` profile 的浏览器花名册（`clientModules`）会通过 `dsh.client` 清单自动发现浏览器半边；Loader 通过 bundle patch 挂载宿主半边。

## 用法

模型在回复中写出普通的 Markdown 图片引用即可：

```markdown
![架构图](docs/architecture.png "架构总览")
![](my image.png)      <!-- 含空格的路径需要用尖括号 -->
![inline](data:image/png;base64,AAAA)
```

相对路径按会话工作目录解析；绝对路径（盘符、`/` 或 `\\`）直接通过。仅作用于助手回复的关闭回合：用户消息下没有尾部插槽，且同一回合存在产物文件时保留产物行（画廊仅在它放弃时显示）。

## 开发

```sh
pnpm install
pnpm test      # vitest：路由状态矩阵 + 引用提取契约
pnpm build     # tsc 类型（lib/types）+ tsdown 打包（lib/index.js、lib/client.js）
```

浏览器 bundle 是面向 dsh 加载器的 CJS 包装（`window.__ModuleLoader__.load`），仅冻结的平台模块表保持 external；node half 无任何运行时导入。两个半边都以结构性类型消费宿主服务，因此本包除平台模块外不携带任何 `@deepseek-ai/*` 的运行时或类型依赖。

## 已知限制

- **仅助手关闭回合。** 尾部插槽只存在于关闭的助手消息下。
- **与产物文件行互斥。** 同一回合既有产物文件又有图片引用时，只显示产物文件行（优先级更高）。
- **CommonMark 目标语法。** 含空格的路径必须用尖括号（`<my image.png>`）包裹；不带引号的多词目标会被解析为「路径 + 标题」。
- **工作区包含规则。** 只服务工作区内的文件；其余一律返回 `403`，因此该路由无法读取任意宿主文件。
