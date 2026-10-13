import { describe, it, expect } from "vitest";
import { redact } from "../extension/lib.js";

describe("redact()", () => {
  it("регистрийн дугаарыг [РД] болгоно", () => {
    expect(redact("РД: УБ12345678 баталгаажсан")).toBe("РД: [РД] баталгаажсан");
    expect(redact({ note: "АА00112233, ӨҮ99887766" })).toEqual({ note: "[РД], [РД]" });
  });

  it("улсын дугаарын тоог нууж, үсгийг үлдээнэ", () => {
    expect(redact("1234 УБА машин")).toBe("****УБА машин");
    expect(redact("дугаар 5678УНА")).toBe("дугаар ****УНА");
  });

  it("улсын дугаартай төстэй боловч өөр тоог өөрчлөхгүй", () => {
    expect(redact("2026 он")).toBe("2026 он");
    expect(redact("12345 УБА")).toBe("12345 УБА");
  });

  it("name, address зэрэг хувийн түлхүүрийг хасна", () => {
    const out = redact({
      name: "Бат",
      lastName: "Дорж",
      address: "СБД, 1-р хороо",
      regnum: "УБ12345678",
      phone: "99112233",
      amount: 120000,
      year: 2026,
    });
    expect(out).toEqual({ amount: 120000, year: 2026 });
  });

  it("үүрлэсэн объект, жагсаалт дотор ч хасна", () => {
    const out = redact({ list: [{ customerName: "Бат", paid: true, items: [{ address: "x", month: 3 }] }] });
    expect(out).toEqual({ list: [{ paid: true, items: [{ month: 3 }] }] });
  });

  it("урт текстийг 300 тэмдэгтээр тасална", () => {
    expect(redact("а".repeat(500))).toHaveLength(300);
  });

  it("тоо, boolean, null-ийг өөрчлөхгүй", () => {
    expect(redact(42)).toBe(42);
    expect(redact(false)).toBe(false);
    expect(redact(null)).toBe(null);
  });
});
