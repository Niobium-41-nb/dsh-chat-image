window.__ModuleLoader__.load({
	id: "dsh-chat-image",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/ChatImageTail.tsx
		/**
		* dsh-chat-image browser half, component: renders chat Markdown image
		* references (`![alt](path title)`) as a gallery under each closing assistant
		* message, plus the pure extraction/scanning/routing logic. The chain entry
		* lives in `index.ts`; the snapshot and chain faces are consumed
		* structurally, so this bundle has no runtime dependency beyond `react`
		* (a platform module) and the slot service the framework injects.
		*/
		/**
		* Split a markdown image destination into path and optional title.
		* @param dest - the parenthesised destination without the surrounding parens.
		* @returns the path and title; a `<path with spaces>` form and quoted titles are honored.
		*/
		function parseImageDest(dest) {
			const angle = dest.match(/^<([^>]*)>\s*(?:"([^"]*)"|'([^']*)')?\s*$/);
			if (angle !== null) return {
				path: angle[1] ?? "",
				title: angle[2] ?? angle[3]
			};
			const plain = dest.match(/^(\S+)(?:\s+(?:"([^"]*)"|'([^']*)'|(\S+)))?\s*$/);
			if (plain !== null) return {
				path: plain[1] ?? "",
				title: plain[2] ?? plain[3] ?? plain[4]
			};
			return {
				path: dest,
				title: void 0
			};
		}
		/**
		* Resolve a possibly-relative image path against the session cwd.
		* @param path - the markdown path; absolute forms pass through unchanged.
		* @param cwd - the session working directory; required for relative paths.
		* @returns the absolute path, or null when relative and no cwd is known.
		*/
		function resolveImagePath(path, cwd) {
			if (path === "") return null;
			const isDrive = /^[a-zA-Z]:[\\/]/.test(path);
			if (path.startsWith("/") || path.startsWith("\\") || isDrive) return path;
			if (cwd === void 0) return null;
			return `${cwd.replace(/[\\/]+$/, "")}/${path.replace(/^[\\/]+/, "")}`;
		}
		const IMAGE_REF = /!\[([^\]]*)\]\(([^)]*)\)/g;
		/**
		* Extract renderable image references from markdown text.
		* @param text - the closing assistant prose.
		* @param cwd - the session working directory for relative paths.
		* @returns local and data: references; http(s) references are excluded.
		*/
		function extractImageRefs(text, cwd) {
			const refs = [];
			let match;
			IMAGE_REF.lastIndex = 0;
			while ((match = IMAGE_REF.exec(text)) !== null) {
				const alt = match[1] ?? "";
				const dest = (match[2] ?? "").trim();
				if (dest === "") continue;
				const { path, title } = parseImageDest(dest);
				if (/^https?:\/\//i.test(path)) continue;
				if (/^data:/i.test(path)) {
					refs.push({
						alt,
						title,
						url: path,
						open: null
					});
					continue;
				}
				const abs = resolveImagePath(path, cwd);
				if (abs === null) continue;
				refs.push({
					alt,
					title,
					url: `/dsh-chat-image?p=${encodeURIComponent(abs)}`,
					open: abs
				});
			}
			return refs;
		}
		/**
		* Chain routing: match every closed turn; the component decides by scanning
		* the snapshot and returns null when the turn carries no image references.
		* @param owner - the turn-tail owner currency.
		* @returns the closing seq when the turn is closed, else null.
		*/
		function selectChatImageTail(owner) {
			if (owner.turn.status !== "closed") return null;
			return { seq: owner.seq };
		}
		/**
		* Read the closing assistant's content blocks for a seq from the snapshot.
		* @param snapshot - the conversation snapshot whose chat nodes are scanned.
		* @param seq - the closing assistant's final-node seq.
		* @returns the assistant blocks, or null when no matching node is materialized.
		*/
		function closingAssistantBlocks(snapshot, seq) {
			const nodes = snapshot?.chat?.nodes;
			if (nodes === void 0) return null;
			const values = nodes.values();
			if (!Array.isArray(values)) return null;
			for (const node of values) {
				const kind = node?.kind;
				const data = node?.data;
				if (kind === "assistant-step" && data?.finalNode?.seq === seq) return data.blocks ?? null;
			}
			return null;
		}
		/** Theme-aware gallery styles (inline to keep the bundle build toolchain-free). */
		const STYLES = {
			gallery: {
				display: "flex",
				flexWrap: "wrap",
				gap: 10,
				margin: "10px 0 4px",
				alignItems: "flex-start"
			},
			item: {
				margin: 0,
				display: "flex",
				flexDirection: "column",
				gap: 4,
				maxWidth: "min(340px, 100%)"
			},
			img: {
				display: "block",
				maxWidth: "min(340px, 100%)",
				maxHeight: 280,
				objectFit: "contain",
				borderRadius: 8,
				border: "1px solid var(--dsw-alias-border-l1, rgba(148, 163, 184, .35))",
				background: "var(--dsw-alias-bg-layer-1, rgba(148, 163, 184, .12))",
				cursor: "pointer"
			},
			caption: {
				fontSize: 12,
				lineHeight: 1.5,
				color: "var(--dsw-alias-label-secondary, #8b949e)",
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap",
				maxWidth: 340
			},
			alt: {
				fontSize: 13,
				color: "var(--dsw-alias-label-secondary, #8b949e)",
				fontStyle: "italic"
			}
		};
		/**
		* Render one closing assistant turn's image references as a gallery.
		* @param props - the closing seq, opener, and the framework standard kit.
		* @returns the gallery, or null when the turn carries no renderable references.
		*/
		function ChatImageTail({ seq, openFile, useSession, sessionId, useSessions }) {
			const [broken, setBroken] = (0, react.useState)([]);
			(0, react.useEffect)(() => {
				setBroken([]);
			}, [seq]);
			const blocks = useSession((snapshot) => closingAssistantBlocks(snapshot, seq));
			const cwd = useSessions((state) => {
				return (state?.byId?.[sessionId])?.cwd;
			});
			let text = "";
			if (blocks !== null && Array.isArray(blocks)) {
				for (const block of blocks) if (block.kind === "text" && typeof block.text === "string") text += block.text;
			}
			const refs = extractImageRefs(text, cwd);
			if (refs.length === 0) return null;
			const items = [];
			for (let index = 0; index < refs.length; index++) {
				const ref = refs[index];
				if (ref === void 0) continue;
				if (broken.includes(index)) {
					if (ref.alt !== "") items.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: STYLES.alt,
						children: ref.alt
					}, index));
					continue;
				}
				const title = ref.title ?? ref.open ?? void 0;
				const open = ref.open;
				items.push(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("figure", {
					style: STYLES.item,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						style: STYLES.img,
						src: ref.url,
						alt: ref.alt,
						title,
						loading: "lazy",
						decoding: "async",
						onClick: open === null ? void 0 : () => openFile(open),
						onError: () => setBroken((prev) => prev.includes(index) ? prev : [...prev, index])
					}), ref.title !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("figcaption", {
						style: STYLES.caption,
						children: ref.title
					})]
				}, index));
			}
			if (items.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: STYLES.gallery,
				children: items
			});
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* dsh-chat-image browser half, plugin entry: registers the turn-tail chain
		* entry rendering chat Markdown image references under each closing assistant
		* message. Local workspace paths load through the sibling node half's
		* `/dsh-chat-image` route. The entry registers at priority 1 — behind the
		* produced-files row (default priority) — and the component returns null when
		* a turn carries no renderable references.
		*/
		/** Required service: the slot registry the turn-tail entry registers into. */
		const inject = ["slots"];
		/**
		* Client plugin body: register the turn-tail chain entry rendering chat
		* Markdown image references under each closing assistant message.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.slots.inject("conversation.chat.turnTail", () => ctx.slots.register({
				name: "conversation.chat.turnTail",
				select: selectChatImageTail,
				priority: 1
			}, ChatImageTail));
		}
		//#endregion
		exports.ChatImageTail = ChatImageTail;
		exports.apply = apply;
		exports.closingAssistantBlocks = closingAssistantBlocks;
		exports.extractImageRefs = extractImageRefs;
		exports.inject = inject;
		exports.parseImageDest = parseImageDest;
		exports.resolveImagePath = resolveImagePath;
		exports.selectChatImageTail = selectChatImageTail;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map