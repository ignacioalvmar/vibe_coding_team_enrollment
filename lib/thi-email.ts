/** THI academic addresses only (domain exactly `thi.de`, not e.g. `@notthi.de`). */
export function normalizeThiEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0) return null;
  const domain = email.slice(at + 1);
  if (domain !== "thi.de") return null;
  return email;
}
