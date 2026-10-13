import { describe, it, expect } from "vitest";
import { flatten, diff, putSnapshot, previousSnapshot, monthKey } from "../extension/lib.js";

const SOURCES = [{ id: "social", name: "НДШ" }, { id: "loan", name: "Зээл" }];
const snap = (takenAt, data) => ({ takenAt, data, status: {} });

describe("flatten()", () => {
  it("үүрлэсэн объектыг цэгээр холбосон замтай болгоно", () => {
    expect(flatten({ a: { b: 1, c: "x" } })).toEqual({ "a.b": 1, "a.c": "x" });
  });

  it("жагсаалтын мөрийг id-тай төстэй түлхүүрээр тэмдэглэнэ", () => {
    expect(flatten({ list: [{ loanNo: "L1", amount: 5 }] })).toEqual({ "list[loanNo=L1].loanNo": "L1", "list[loanNo=L1].amount": 5 });
  });

  it("id-гүй мөрийг агуулгын hash-аар тэмдэглэж, дарааллаас үл хамаарна", () => {
    const a = flatten({ list: [{ x: 1 }, { x: 2 }] });
    const b = flatten({ list: [{ x: 2 }, { x: 1 }] });
    expect(a).toEqual(b);
  });

  it("хоосон жагсаалт, объектыг хадгална", () => {
    expect(flatten({ a: [], b: {} })).toEqual({ a: "[]", b: "{}" });
  });
});

describe("diff()", () => {
  const prev = snap("2026-09-15T00:00:00Z", { social: { list: [{ month: "2026-08", paid: true }] }, loan: { list: [{ loanNo: "L1", balance: 100 }] } });

  it("нэмэгдсэн мөр", () => {
    const cur = snap("2026-10-15T00:00:00Z", { ...prev.data, social: { list: [{ month: "2026-08", paid: true }, { month: "2026-09", paid: true }] } });
    const ch = diff(prev, cur, SOURCES);
    expect(ch).toHaveLength(1);
    expect(ch[0]).toMatchObject({ source: "social", type: "added", item: { month: "2026-09", paid: true } });
  });

  it("хасагдсан мөр", () => {
    const cur = snap("2026-10-15T00:00:00Z", { ...prev.data, loan: { list: [] } });
    const ch = diff(prev, cur, SOURCES);
    expect(ch.some(c => c.type === "removed" && c.source === "loan" && c.item.loanNo === "L1")).toBe(true);
  });

  it("өөрчлөгдсөн утга", () => {
    const cur = snap("2026-10-15T00:00:00Z", { ...prev.data, loan: { list: [{ loanNo: "L1", balance: 60 }] } });
    expect(diff(prev, cur, SOURCES)).toEqual([{ source: "loan", name: "Зээл", type: "changed", field: "list[loanNo=L1].balance", from: 100, to: 60 }]);
  });

  it("аль нэг сард татагдаагүй эх сурвалжийг харьцуулахгүй", () => {
    const cur = snap("2026-10-15T00:00:00Z", { social: prev.data.social });
    expect(diff(prev, cur, SOURCES)).toEqual([]);
  });

  it("өөрчлөлтгүй бол хоосон", () => {
    expect(diff(prev, snap("2026-10-15T00:00:00Z", structuredClone(prev.data)), SOURCES)).toEqual([]);
  });
});

describe("putSnapshot()", () => {
  it("сар бүрт сүүлийн агшинг үлдээнэ", () => {
    let all = putSnapshot({}, snap("2026-10-01T05:00:00Z", { v: 1 }));
    all = putSnapshot(all, snap("2026-10-20T05:00:00Z", { v: 2 }));
    expect(Object.keys(all)).toEqual(["2026-10"]);
    expect(all["2026-10"].data.v).toBe(2);
  });

  it("хамгийн ихдээ сүүлийн 13 сарыг хадгална", () => {
    let all = {};
    for (let i = 0; i < 20; i++) {
      const d = new Date(Date.UTC(2025, i, 15));
      all = putSnapshot(all, snap(d.toISOString(), { i }));
    }
    const keys = Object.keys(all);
    expect(keys).toHaveLength(13);
    expect(keys[0]).toBe("2025-08");
    expect(keys.at(-1)).toBe("2026-08");
  });

  it("эрэмбэлэгдсэн байна", () => {
    let all = putSnapshot({}, snap("2026-10-15T00:00:00Z", {}));
    all = putSnapshot(all, snap("2026-08-15T00:00:00Z", {}));
    expect(Object.keys(all)).toEqual(["2026-08", "2026-10"]);
  });
});

describe("previousSnapshot()", () => {
  const all = {
    "2026-07": snap("2026-07-10T00:00:00Z", {}),
    "2026-09": snap("2026-09-10T00:00:00Z", {}),
    "2026-10": snap("2026-10-10T00:00:00Z", {}),
  };

  it("өмнөх хамгийн сүүлийн сарын агшин", () => {
    expect(previousSnapshot(all, snap("2026-10-12T00:00:00Z", {})).takenAt).toBe("2026-09-10T00:00:00Z");
  });

  it("өмнөх сар байхгүй бол null", () => {
    expect(previousSnapshot(all, snap("2026-07-20T00:00:00Z", {}))).toBe(null);
    expect(previousSnapshot({}, snap("2026-10-12T00:00:00Z", {}))).toBe(null);
  });

  it("monthKey() нь YYYY-MM", () => {
    expect(monthKey(new Date("2026-10-12T10:00:00Z"))).toBe("2026-10");
  });
});
