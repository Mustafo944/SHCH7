// setItemDebounced uchun kalit-boshiga timerlar
const _debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const safeStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`[safeStorage] getItem(${key}) failed:`, e);
      return null;
    }
  },

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[safeStorage] setItem(${key}) failed:`, e);
    }
  },

  /**
   * Katta qiymatlarni (JSON.stringify qilingan massivlar) tez-tez yozish
   * main-thread'ni qotiradi. Bu variant yozishni kechiktiradi: ketma-ket
   * chaqiruvlarda faqat OXIRGI qiymat, `delay` ms tinchlikdan keyin yoziladi.
   * Kesh uchun bu yetarli — kesh baribir "oxirgi ma'lum holat"ni saqlaydi.
   */
  setItemDebounced(key: string, value: string, delay = 800): void {
    if (typeof window === 'undefined') return;
    const existing = _debounceTimers.get(key);
    if (existing) clearTimeout(existing);
    _debounceTimers.set(key, setTimeout(() => {
      _debounceTimers.delete(key);
      safeStorage.setItem(key, value);
    }, delay));
  },

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[safeStorage] removeItem(${key}) failed:`, e);
    }
  },

  clearMatching(prefix: string): void {
    if (typeof window === 'undefined') return;
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn(`[safeStorage] clearMatching(${prefix}) failed:`, e);
    }
  }
};
