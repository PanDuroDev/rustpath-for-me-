import { readFile } from "node:fs/promises";

const u24le = (buffer, at) => buffer[at] | (buffer[at + 1] << 8) | (buffer[at + 2] << 16);

// Reads only the header, so large images never load into memory.
export async function imageSize(file) {
  let buffer;
  try {
    buffer = await readFile(file);
  } catch (_) {
    return null;
  }

  if (buffer.length > 24 && buffer.readUInt32BE(0) === 0x89504e47) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (buffer.length > 10 && buffer.toString("ascii", 0, 4) === "GIF8") {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }

  if (buffer.length > 30 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    const kind = buffer.toString("ascii", 12, 16);
    if (kind === "VP8X") return { width: u24le(buffer, 24) + 1, height: u24le(buffer, 27) + 1 };
    if (kind === "VP8 ") {
      return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    }
    if (kind === "VP8L") {
      const bits = buffer.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }

  if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let at = 2;
    while (at + 9 < buffer.length) {
      if (buffer[at] !== 0xff) {
        at += 1;
        continue;
      }
      const marker = buffer[at + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: buffer.readUInt16BE(at + 5), width: buffer.readUInt16BE(at + 7) };
      }
      at += 2 + buffer.readUInt16BE(at + 2);
    }
    return null;
  }

  if (file.toLowerCase().endsWith(".svg")) {
    const text = buffer.toString("utf8");
    const width = text.match(/\bwidth="([\d.]+)/);
    const height = text.match(/\bheight="([\d.]+)/);
    if (width && height) return { width: Math.round(+width[1]), height: Math.round(+height[1]) };
    const box = text.match(/viewBox="([\d.\- ]+)"/);
    const parts = box ? box[1].trim().split(/[\s,]+/).map(Number) : [];
    if (parts.length === 4 && parts[2] && parts[3]) {
      return { width: Math.round(parts[2]), height: Math.round(parts[3]) };
    }
  }

  return null;
}
