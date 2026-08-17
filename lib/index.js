//#region src/index.ts
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
const name = "dsh-chat-image";
/** Route the browser half addresses with `?p=<encodeURIComponent(absPath)>`. */
const CHAT_IMAGE_PATH = "/dsh-chat-image";
/** Inclusive byte cap for one served image; larger files answer 413. */
const MAX_IMAGE_BYTES = 33554432;
/** Content types by image extension; anything else falls back to octet-stream. */
const IMAGE_MIME = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	svg: "image/svg+xml",
	bmp: "image/bmp",
	ico: "image/x-icon",
	avif: "image/avif",
	apng: "image/apng",
	tif: "image/tiff",
	tiff: "image/tiff"
};
/**
* Content type for an image path by its extension.
* @param path - the resolved absolute path whose suffix selects the MIME type.
* @returns the image content type, or `application/octet-stream` for unknown suffixes.
*/
function imageMimeOf(path) {
	const dot = path.lastIndexOf(".");
	const ext = dot === -1 ? "" : path.slice(dot + 1).toLowerCase();
	return IMAGE_MIME[ext] ?? "application/octet-stream";
}
/**
* Build the route handler. Response statuses: 200 served image; 400 missing or
* undecodable path; 403 outside every workspace; 404 unknown path or
* non-file; 413 over the byte cap; 500 unexpected failure.
* @param deps - filesystem, workspace roots, and the failure reporter.
* @returns the web route handler owning the full response lifecycle.
*/
function createChatImageHandler(deps) {
	return async (req, res) => {
		try {
			const url = req.url ?? "";
			const at = url.indexOf("?p=");
			if (at === -1) {
				res.writeHead(400);
				res.end();
				return;
			}
			let raw = "";
			try {
				raw = decodeURIComponent(url.slice(at + 3));
			} catch {
				res.writeHead(400);
				res.end();
				return;
			}
			if (raw === "") {
				res.writeHead(400);
				res.end();
				return;
			}
			let target;
			try {
				target = await deps.fs.resolve(raw);
			} catch {
				res.writeHead(404);
				res.end();
				return;
			}
			let allowed = false;
			for (const workspace of deps.workspaces.list()) {
				const parent = await deps.fs.resolve(workspace.path);
				if (deps.fs.contains(parent, target)) {
					allowed = true;
					break;
				}
			}
			if (!allowed) {
				res.writeHead(403);
				res.end();
				return;
			}
			const info = await deps.fs.stat(target);
			if (info === void 0 || info.type !== "file") {
				res.writeHead(404);
				res.end();
				return;
			}
			let bytes;
			try {
				bytes = await deps.fs.readBytes(target, void 0, MAX_IMAGE_BYTES);
			} catch (err) {
				if (err.code === "FS_TOO_LARGE") {
					res.writeHead(413);
					res.end();
					return;
				}
				throw err;
			}
			res.writeHead(200, {
				"Content-Type": imageMimeOf(raw),
				"Content-Length": String(bytes.length),
				"Cache-Control": "private, max-age=300"
			});
			res.end(bytes);
		} catch (err) {
			deps.onError(err);
			if (res.headersSent) {
				res.destroy();
				return;
			}
			res.writeHead(500);
			res.end();
		}
	};
}
/**
* Register the chat image route when the web surface is present.
* @param ctx - host context carrying the optional web/fs/workspace services.
*/
function apply(ctx) {
	const webServer = ctx.get("webServer");
	const fs = ctx.get("fs");
	const workspaces = ctx.get("workspaceRegistry");
	if (webServer === void 0 || fs === void 0 || workspaces === void 0) return;
	const handler = createChatImageHandler({
		fs,
		workspaces,
		onError: (err) => {
			ctx.logger?.error(err) ?? console.error(err);
		}
	});
	ctx.effect(() => webServer.register({
		kind: "exact",
		path: CHAT_IMAGE_PATH,
		handler
	}));
}
//#endregion
export { CHAT_IMAGE_PATH, MAX_IMAGE_BYTES, apply, createChatImageHandler, imageMimeOf, name };
