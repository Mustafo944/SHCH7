/**
 * JWT'ning `user_role` claim'ini o'qiydi (Custom Access Token Hook qo'shadi).
 *   - `string`    → rol topildi (DB so'roviga hojat yo'q)
 *   - `null`      → claim bor, lekin rol yo'q (role'siz akkaunt)
 *   - `undefined` → claim yo'q / dekod muvaffaqiyatsiz → DB fallback ishlaydi
 *
 * Imzo bu yerda QAYTA tekshirilmaydi — faqat lokal dekod. Chaqiruvchi
 * token'ning haqiqiyligiga allaqachon ishonch hosil qilgan bo'lishi kerak:
 *   - middleware'da `getUser()` token'ni Auth serverida tekshirgan;
 *   - login oqimida token to'g'ridan-to'g'ri Auth serveridan yangi kelgan.
 *
 * Bu modul SOF (brauzer API'larisiz, `atob`dan tashqari — u ham Edge'da,
 * ham brauzerda mavjud) — Edge middleware ham, klient ham import qiladi.
 */
export function getRoleFromToken(accessToken?: string): string | null | undefined {
  if (!accessToken) return undefined
  const parts = accessToken.split('.')
  if (parts.length !== 3) return undefined
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64)) as Record<string, unknown>
    if (!('user_role' in payload)) return undefined
    const role = payload.user_role
    return typeof role === 'string' ? role : null
  } catch {
    return undefined
  }
}
