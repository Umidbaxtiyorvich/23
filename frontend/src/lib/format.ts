// Brauzerdan qat'i nazar bir xil o'zbekcha sana formati
const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const DAYS = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"];

export function fmtDate(v: string | Date, style: "long" | "short" | "weekday" = "long") {
  const d = typeof v === "string" ? new Date(v.length === 10 ? v + "T00:00:00" : v) : v;
  if (isNaN(d.getTime())) return "";
  if (style === "short") return `${d.getDate()}-${MONTHS[d.getMonth()].slice(0, 3)}`;
  if (style === "weekday") return `${DAYS[d.getDay()]}, ${d.getDate()}-${MONTHS[d.getMonth()]}`;
  return `${d.getDate()}-${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}
