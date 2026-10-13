import { describe, it, expect } from "vitest";
import { localPlan, confidentPick, rankCatalog, prepareCatalog } from "../extension/catalog.js";

const CATALOG = prepareCatalog([
  { title: "Иргэний үнэмлэхийн лавлагаа", path: "/service/a1", tags: ["үнэмлэх"], popularity: 90000 },
  { title: "Нийгмийн даатгалын шимтгэл төлөлтийн лавлагаа", path: "/service/a2", tags: ["ндш"], popularity: 80000 },
  { title: "Гэрлэсний бүртгэлийн лавлагаа", path: "/service/a3", tags: [], popularity: 40000 },
  { title: "Гэрлэсний бүртгэлгүй лавлагаа", path: "/service/a4", tags: [], popularity: 30000 },
  { title: "Иргэний үнэмлэх дахин авах хүсэлт", path: "/service/a5", tags: [], popularity: 50000 },
  { title: "Иргэний үнэмлэхийн лавлагаа (гадаад хэлээр)", path: "/service/a6", tags: [], popularity: 1000 },
]);

describe("localPlan()", () => {
  it("мөр бүрийг задалж, дугаар, тэмдгийг арилгана", () => {
    const items = localPlan("1. Иргэний үнэмлэхний хуулбар\n2) Нийгмийн даатгалын лавлагаа\n- Цээж зураг 3x4");
    expect(items.map(i => i.label)).toEqual(["Иргэний үнэмлэхний хуулбар", "Нийгмийн даатгалын лавлагаа", "Цээж зураг 3x4"]);
  });

  it("түгээмэл мөрийг e-Mongolia-ийн албан нэр рүү хөрвүүлнэ", () => {
    const [id, ndsh] = localPlan("үнэмлэхний хуулбар, НДШ");
    expect(id).toMatchObject({ source: "emongolia", service: "Иргэний үнэмлэхийн лавлагаа" });
    expect(ndsh).toMatchObject({ source: "emongolia", service: "Нийгмийн даатгалын шимтгэл төлөлтийн лавлагаа" });
  });

  it("e-Mongolia-д байхгүй зүйлийг «өөрөө бэлдэх» болгоно", () => {
    expect(localPlan("Цээж зураг")[0]).toMatchObject({ source: "self" });
    expect(localPlan("Анкет")[0]).toMatchObject({ source: "self" });
  });

  it("хоосон текстэд хоосон жагсаалт", () => {
    expect(localPlan("")).toEqual([]);
    expect(localPlan(" \n , ; ")).toEqual([]);
  });
});

describe("rankCatalog()", () => {
  it("хамгийн тохирохыг эхэнд гаргана", () => {
    const [top] = rankCatalog({ query: "Иргэний үнэмлэхний лавлагаа" }, CATALOG);
    expect(top.title).toBe("Иргэний үнэмлэхийн лавлагаа");
  });

  it("гадаад хэлний хувилбарыг асуугаагүй бол доор гаргана", () => {
    const titles = rankCatalog({ query: "иргэний үнэмлэх лавлагаа" }, CATALOG).map(r => r.title);
    expect(titles.indexOf("Иргэний үнэмлэхийн лавлагаа")).toBeLessThan(titles.indexOf("Иргэний үнэмлэхийн лавлагаа (гадаад хэлээр)"));
  });

  it("хүсэлтийн үйлчилгээг action гэж тэмдэглэнэ", () => {
    const r = rankCatalog({ query: "иргэний үнэмлэх" }, CATALOG).find(x => x.path === "/service/a5");
    expect(r.action).toBe(true);
  });

  it("n-ээс ихгүй үр дүн буцаана", () => {
    expect(rankCatalog({ query: "лавлагаа" }, CATALOG, 2).length).toBeLessThanOrEqual(2);
  });

  it("хоосон асуулт, хоосон каталогт эвдрэхгүй", () => {
    expect(rankCatalog({ query: "" }, CATALOG)).toEqual([]);
    expect(rankCatalog({}, CATALOG)).toEqual([]);
    expect(rankCatalog({ query: "?!" }, CATALOG)).toEqual([]);
    expect(rankCatalog({ query: "үнэмлэх" }, [])).toEqual([]);
  });

  it("таарах зүйлгүй бол хоосон", () => {
    expect(rankCatalog({ query: "сансрын хөлөг" }, CATALOG)).toEqual([]);
  });
});

describe("confidentPick()", () => {
  it("итгэлтэй таарсан бол шилдгийг буцаана", () => {
    expect(confidentPick([{ title: "A", path: "/a", score: 0.9 }, { title: "B", path: "/b", score: 0.5 }])).toEqual({ title: "A", path: "/a" });
  });

  it("оноо бага бол null", () => {
    expect(confidentPick([{ title: "A", path: "/a", score: 0.4 }])).toBe(null);
  });

  it("эхний хоёр ойролцоо бол null (хэрэглэгчээс асууна)", () => {
    expect(confidentPick([{ title: "A", path: "/a", score: 0.8 }, { title: "B", path: "/b", score: 0.75 }])).toBe(null);
  });

  it("хүсэлтийн үйлчилгээг автоматаар сонгохгүй", () => {
    expect(confidentPick([{ title: "A", path: "/a", score: 0.95, action: true }])).toBe(null);
  });

  it("хоосон жагсаалтад null", () => {
    expect(confidentPick([])).toBe(null);
  });

  it("rankCatalog()-той хамт: гэрлэсний бүртгэлийн хоёр лавлагааг ялгана", () => {
    expect(confidentPick(rankCatalog({ query: "Гэрлэсний бүртгэлгүй лавлагаа" }, CATALOG, 2))).toEqual({ title: "Гэрлэсний бүртгэлгүй лавлагаа", path: "/service/a4" });
  });
});
