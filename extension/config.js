// Төслийн AI сервисийн хаяг (worker/-ийг deploy хийсний дараа гарсан URL).
// Үүнийг тохируулсан бол хэрэглэгчид ямар ч key үүсгэх шаардлагагүй.
export const SERVICE_URL = "https://minii-medeelel-ai.medeelel.workers.dev";

// Нэвтэрсэн e-Mongolia табыг хайх хэв маяг (chrome.tabs.query). side panel («Шинжлэх») болон background («Цуглуулах») хоёулаа ашиглана.
export const EM_TAB_URL = "https://e-mongolia.mn/*";

// «Шинжлэх»: ХУР-ын нэг эх сурвалжийн (content.js xyp()) хариуг хүлээх хугацаа. Хэтэрвэл тэр эх сурвалжийг алгасаад үргэлжилнэ.
export const XYP_TIMEOUT_MS = 20_000;
