# 提交到 awesome-dsh-plugin / dsh-market

让本插件出现在 [dsh-market](https://github.com/dsh-market/dsh-market) 的搜索与一键安装列表：向 **awesome-dsh-plugin** 的 curated 清单提交一个条目（dsh-market 本身不是目录，列表数据来自 awesome-dsh-plugin）。

## 门槛（自动检查）

1. 仓库 `package.json` 声明 `dsh.bundle` manifest —— 本仓库已声明（`dsh.bundle.patch → ./cordis.patch.yml`，patch 插入 `chat-image` 一行，同时是 host 行与浏览器行）。
2. 仓库创建满 **1 天**、提交数 **≥ 10**。
3. 仓库打了 `dsh-plugin` topic（已完成）。
4. `awesome-lint` 与站点构建通过（双语描述、格式、截图校验）。

## 条目文件

在 awesome-dsh-plugin 的 `data/plugins/` 新增 `Niobium-41-nb__dsh-chat-image.yml`：

```yaml
url: https://github.com/Niobium-41-nb/dsh-chat-image
name: Niobium-41-nb/dsh-chat-image
category: ui
description:
  en: 'Renders chat Markdown image references (![alt](path title)) as a clickable gallery under each closing assistant message, loading local workspace files through a validated host route.'
  zh: '把聊天中的 Markdown 图片引用（![alt](路径 标题)）渲染为可点击的画廊，本地工作区文件经校验的宿主路由加载。'
```

提交步骤：

```sh
git clone git@github.com:<you>/awesome-dsh-plugin.git   # 先 fork 到自己的账号
cd awesome-dsh-plugin
git checkout -b add-dsh-chat-image
# 写入上面的 YAML 文件
npm ci
node scripts/generate-readme.mjs     # 重新生成两个 README
git add -A && git commit -m "add: Niobium-41-nb/dsh-chat-image"
git push -u origin add-dsh-chat-image
# 对 awesome-dsh-plugin/awesome-dsh-plugin 开 PR
```

## npm 关联

`dsh-chat-image` 已发布到 npm（0.1.1+），`package.json` 的 `repository` 字段指向本仓库 —— market 的防抢注校验（registry-verified against the repo）依赖这个关联，重新发布时务必保留。

## 截图（可选，推荐）

在 awesome 仓库的 `data/screenshots.json` 里以条目 URL 为 key 加入 1–8 张 GitHub 托管的图片；不提交也没关系，市场会从本仓库 README 自动抽取图片。

## 评审注意

- 描述会被维护者与代码核对，保持如实、无营销词。
- 分类选最贴合的即可（本插件为 `ui`）；维护者会微调。
- 只改自己的条目文件，不要手改生成的 README。
