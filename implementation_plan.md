# 1. Muammo va Maqsadlar

Foydalanuvchi quyidagi ikkita asosiy muammoga duch keldi:
1. **Unumdorlik (Performance):** Sahifa juda og'ir va qotib ishlayapti (ayniqsa Oylik Ish Reja jadvallarida).
2. **DU-46 jurnali mantiqi (Logic):** DU-46 jurnalida 12-ustun (ishni tugatish) tasdiqlash jarayoni xato ishlamoqda. Foydalanuvchining talabiga ko'ra, 12-ustunda qatnashchilar (3-ustunda tanlanganlar) yozuv kiritgandan so'ng faqat boshqa qatnashchilar tasdiqlashi va eng oxirida DOIM Bekat Navbatchisi (DSP) tasdiqlashi kerak.

## User Review Required
> [!IMPORTANT]
> Iltimos, quyidagi mantiqiy qadamlarni o'qib chiqing va to'g'ri tushunganligimni tasdiqlang.

# 2. Rejalashtirilgan O'zgarishlar

### 2.1. DU-46 Jurnali 12-Ustun Mantiqini O'zgartirish
Hozirgi vaqtda tizim `getNextApproverRole` orqali 3-ustun va 12-ustun uchun bir xil zanjir (approvalChain) bo'yicha ketma-ketlikni so'rayapti. Biz quyidagilarni o'zgartiramiz:

- **12-ustunda tugallash yozuvi kiritilganda ("Tugadi" tugmasi bosilganda):** 
  - Yozuvni kiritgan xodimning lavozimi (role) yozib olinadi (`bartarafByRole`).
  - Tasdiqlashi kerak bo'lgan navbatdagi xodimlar ro'yxati 3-ustunda tanlangan zanjirdan (`approvalChain`) kelib chiqadi, ammo yozuvni kiritgan xodimdan boshqalar bo'lishi kerak.
  - Masalan: Agar 3-ustunda Yo'l ustasi(1) va Elektromexanik(2) tanlangan bo'lsa va 12-ustunga Elektromexanik yozib "Tugadi" qilsa, unda dastlab Yo'l ustasi tasdiqlaydi. 
  - **Asosiy qoida:** Qatnashchilar (agar mavjud bo'lsa) tasdiqlab bo'lgandan so'ng, eng oxirida **har doim Bekat Navbatchisi (DSP) tasdiqlashi kerak.**

### 2.2. Sahifa Qotishini To'g'irlash (Performance Optimization)
Sahifaning qotishiga asosiy sabab: "Oylik Ish Reja" (JournalForm) da 50 ta qator (row) va har bir qatorda bir nechta katta `textarea`lar mavjud. Foydalanuvchi bironta katakka harf yozganda, React butun 50 ta qatorni (200-300 ta inputni) qaytadan chizishga (re-render) urinadi. Bu esa yozish jarayonida qotishga olib keladi.

Buni to'g'irlash uchun:
- Jadvaldagi har bir qatorni alohida `React.memo` komponentiga (`MemoizedJournalRow`) ajratamiz.
- Foydalanuvchi biror qatorga yozganda faqat o'sha yozilayotgan qatorgina yangilanadi, qolgan 49 ta qator qaytadan chizilmaydi.
- Bu sahifaning ishlash tezligini (typing performance) yuz chandon oshiradi va qotishlarni yo'qotadi.

# 3. Kutilayotgan Natija
- Ishchilar harf yozganda sahifa umuman qotmaydigan, tez ishlaydigan bo'ladi.
- DU-46 jurnalida 12-ustun qoidasi to'g'ri ishlaydi: Kim yozuv kiritishidan qat'iy nazar, agar qatnashchilar bo'lsa oldin ular tasdiqlaydi, so'ngra majburiy ravishda Bekat navbatchisi tasdiqlab yopadi.
