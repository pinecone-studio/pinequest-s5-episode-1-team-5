import { describe, it, expect } from "vitest";
import { crc32 as zlibCrc32 } from "node:zlib";
import { crc32, makeZip, dataUrlBytes } from "../extension/zip.js";

const enc = new TextEncoder();
const dec = new TextDecoder();

// ZIP-ийг central directory-гоос нь уншина (stored арга): [{ name, utf8, crc, data }]
function unzip(buf) {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = buf.length - 22;
  while (eocd >= 0 && v.getUint32(eocd, true) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("end of central directory олдсонгүй");
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const files = [];
  for (let i = 0; i < count; i++) {
    expect(v.getUint32(p, true)).toBe(0x02014b50);
    const flags = v.getUint16(p + 8, true);
    const method = v.getUint16(p + 10, true);
    const crc = v.getUint32(p + 16, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));
    expect(v.getUint32(local, true)).toBe(0x04034b50);
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    files.push({ name, utf8: !!(flags & 0x0800), method, crc, data: buf.subarray(start, start + size) });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const zipBytes = async files => new Uint8Array(await makeZip(files, new Date(2026, 9, 12, 10, 30)).arrayBuffer());

describe("crc32()", () => {
  it("стандарт шалгах утга", () => {
    expect(crc32(enc.encode("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it("Node-ийн zlib.crc32-тэй таарна", () => {
    const data = new Uint8Array(10_000).map((_, i) => (i * 31) & 0xff);
    expect(crc32(data)).toBe(zlibCrc32(data));
    expect(crc32(enc.encode("Иргэний үнэмлэх"))).toBe(zlibCrc32(enc.encode("Иргэний үнэмлэх")));
  });
});

describe("makeZip()", () => {
  it("application/zip Blob буцаана", () => {
    expect(makeZip([{ name: "a.txt", data: "a" }]).type).toBe("application/zip");
  });

  it("гаргасан ZIP задарч, агуулга нь ижил байна", async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0, 1, 2, 255]);
    const files = unzip(await zipBytes([
      { name: "01_a.pdf", data: pdf },
      { name: "Жагсаалт.txt", data: "Бэлдсэн: 2026-10-12\n[x] Иргэний үнэмлэх" },
    ]));
    expect(files.map(f => f.name)).toEqual(["01_a.pdf", "Жагсаалт.txt"]);
    expect([...files[0].data]).toEqual([...pdf]);
    expect(dec.decode(files[1].data)).toBe("Бэлдсэн: 2026-10-12\n[x] Иргэний үнэмлэх");
    for (const f of files) {
      expect(f.method).toBe(0); // stored
      expect(f.crc).toBe(crc32(f.data));
    }
  });

  it("кирилл файлын нэрийг UTF-8 гэж тэмдэглэж хадгална", async () => {
    const [f] = unzip(await zipBytes([{ name: "02_Нийгмийн_даатгалын_лавлагаа_өү.pdf", data: "x" }]));
    expect(f.name).toBe("02_Нийгмийн_даатгалын_лавлагаа_өү.pdf");
    expect(f.utf8).toBe(true);
  });

  it("хоосон багц", async () => {
    expect(unzip(await zipBytes([]))).toEqual([]);
  });
});

describe("dataUrlBytes()", () => {
  it("base64 data URL-ийг байт болгоно", () => {
    expect([...dataUrlBytes("data:application/pdf;base64,JVBERg==")]).toEqual([0x25, 0x50, 0x44, 0x46]);
  });
});
