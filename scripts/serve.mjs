import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "_site");
const port = Number(process.env.PORT) || 4173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".woff2": "font/woff2",
};

createServer(async (request, response) => {
  const url = decodeURIComponent(request.url.split("?")[0]);
  let file = path.join(root, url.endsWith("/") ? `${url}index.html` : url);
  if (path.relative(root, file).startsWith("..")) {
    response.writeHead(403).end();
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    response.writeHead(200, { "content-type": types[path.extname(file).toLowerCase()] || "application/octet-stream" });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("404");
  }
}).listen(port, () => console.log(`Preview: http://localhost:${port}/`));
