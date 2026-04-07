const fs = require('fs');

const TORT_HAFTALIK_REJA = [
  {
    bolim: "MPTS QURILMALARI",
    ishlar: [
      {"ish": "Elektromexanik ish stolida hodisalar arxivini tekshirish(ARM SHN)", "davriylik": "Har kuni", "bajaruvchi": "SHN", "jurnal": "SHU-2", "nsh": ""},
      {"ish": "Monitor tashqi qismini maxsus vositalar bilan tozalash", "davriylik": "Bir oyda bir bor", "bajaruvchi": "SHN", "jurnal": "SHU-2", "nsh": "Tex-karta №4"},
      {"ish": "Klaviaturani tozalash,kompyuter manipulyatori sichqonchani tozalash", "davriylik": "Bir oyda bir bor", "bajaruvchi": "SHN", "jurnal": "SHU-2,DU-46", "nsh": "Tex-karta №8"},
      {"ish": "ARM ulanish shnurlari razyomlarini maxkamlanganligini tekshirish", "davriylik": "Bir oyda bir bor", "bajaruvchi": "SHNS,SHN", "jurnal": "SHU-2", "nsh": "Tex-karta №11"},
      {"ish": "Tizim soatlarining ko'rsatkichlarini tekshirish.", "davriylik": "Bir oyda bir bor", "bajaruvchi": "SHNS,SHN", "jurnal": "SHU-2", "nsh": "Tex-karta №13"},
      {"ish": "Uskunalarni joylashtirish uchun shkaflarni ko'rikdan o'tkazish.\na) Kabel ulagichlari razyomlarini mahkamligini tekshirish\nb) Shkaf ventilyatorlarining ishlashini tekshirish", "davriylik": "Bir oyda bir bor", "bajaruvchi": "SHNS,SHN", "jurnal": "SHU-2", "nsh": "Tex-karta №15"},
      {"ish": "ARM DSP tizimi jurnallaridagi ma'lumotlarni ko'rish va tahlil qilish hamda qurilmalar ishidagi nosozliklarni bartaraf etish.", "davriylik": "Haftada bir bor", "bajaruvchi": "SHNS,SHN,DS yoki DSZ", "jurnal": "SHU-2", "nsh": "Tex-karta №12"},
      {"ish": "ARM DSP va ARM SHN arxiv fayllarini to'g'ri yuritilishini tekshirish.", "davriylik": "Bir oyda bir bor", "bajaruvchi": "SHNS,SHN", "jurnal": "SHU-2", "nsh": "Tex-karta №14"},
      {"ish": "Obyekt kontrollerlari va konsentratorlarning ishlashini va holatini indikatsiya vositalari ko'rsatkichlari bo'yicha tekshirish.", "davriylik": "Bir oyda bir bor", "bajaruvchi": "SHN", "jurnal": "SHU-2", "nsh": "Tex-karta №17"},
      {"ish": "Markaziy protsessor, boshqaruv kompleksi, hisoblash kanallari va aloqa halqalari modemlarining ishlashini va holatini indikatsiya ko'rsatkichlari hamda ichki diagnostika yordamida tekshirish.", "davriylik": "Haftada bir bor", "bajaruvchi": "SHN", "jurnal": "SHU-2", "nsh": "Tex-karta №19"},
      {"ish": "Ventilyatsiya va konditsioner tizimlari (PVN, PAVR)ning samaradorligini tekshirish.", "davriylik": "Haftada bir bor", "bajaruvchi": "SHN", "jurnal": "SHU-2", "nsh": "Tex-karta №22"},
      {"ish": "Kirish qurilmasi (SHVPU) va taqsimlovchi shkaflar (RSH) hamda uzluksiz quvvat ta'minoti qurilmasi (UBP)ning nazorat-o'lchov asboblari va indikatsiya vositalari ko'rsatkichlari bo'yicha ishlashini tekshirish.", "davriylik": "Bir oyda bir bor", "bajaruvchi": "SHNS,SHN", "jurnal": "SHU-2", "nsh": "Tex-karta №26"},
    ],
  },
  {
    bolim: "KSSP uskunalari, drossel transformatorlar (DT), ALSN, izostiklar.",
    ishlar: [
      {"ish": "(NEM) elektron modullari bo'lgan kabel muftalarini tashqi tekshiruvi", "davriylik": "Haftada bir bor", "bajaruvchi": "SHN,SHNM", "jurnal": "SHU-2", "nsh": "Tex.karta KSSP№2.2"},
      {"ish": "RD, NEM, NEM  va qabul qilish punkti o'rtasidagi kabellar  holatini tekshirish.", "davriylik": "Haftada bir bor", "bajaruvchi": "SHN,SHNM", "jurnal": "SHU-2", "nsh": "Tex.karta KSSP№2.3"},
      {"ish": "KSSP post qurilmalari va yo'l rele stativi o'rtasidagi, KSSP va krossoviy o'rtasidagi, KSSP va DSP pulti o'rtasidagi kabellarning holatini vizual nazorat qilish va ularning montaji ishonchliligini tekshirish.", "davriylik": "Haftada bir bor", "bajaruvchi": "SHN", "jurnal": "SHU-64", "nsh": "Tex.karta KSSP №6.1"},
      {"ish": "URAL KSSP (PRU) qurilmalarining qayta yuklanishini tekshirish", "davriylik": "Haftada bir bor", "bajaruvchi": "SHNS,SHN", "jurnal": "DU-46,SHU-2", "nsh": "Tex.karta KSSP №6.2"},
      {"ish": "KSSP ishlashini nazorat qilish", "davriylik": "Har kuni", "bajaruvchi": "SHN,SHNM", "jurnal": "SHU-2", "nsh": "Tex.karta KSSP №6.3"},
      {"ish": "Rels datchiklari KSSPni tashqi ko'rikdan o'tkazish, tozalash va mahkamligini tekshirish.", "davriylik": "Haftada bir bor", "bajaruvchi": "SHN,SHNM", "jurnal": "DU-46,SHU-2", "nsh": "Tex.karta KSSP №2.1"},
      {"ish": "Drossel-transformatorlar va izostiklarni tashqi tekshiruvdan o'tkazish", "davriylik": "Bir oyda bir bor", "bajaruvchi": "SHN,SHNM", "jurnal": "SH-62", "nsh": "Tex-karta СЦБ №35"},
    ],
  },
  {
    bolim: "ESSO QURILMALARI",
    ishlar: [
      {"ish": "ESSO post qurilmalari va yo'l relelari stativi o'rtasida, ESSO va krossovaya o'rtasida, ESSO va DSP pulti o'rtasida, shuningdek DSP pulti va PSLZ o'rtasida kabellarning holatini vizual nazorat qilish hamda ularning montaji ishonchliligini tekshirish.", "davriylik": "Haftada bir bor", "bajaruvchi": "SHN", "jurnal": "SHU-64", "nsh": "ESSO №6.1"},
      {"ish": "ESSO ishlashini nazorat qilish", "davriylik": "Har kuni", "bajaruvchi": "SHN,SHNM", "jurnal": "SHU-2", "nsh": "ESSO №6.3"},
      {"ish": "ESSO rels datchiklari mustaxkam qotirilganligi tekshirish,tozalash va tashqi tekshiruvdan o'tkazish", "davriylik": "Haftada bir bor", "bajaruvchi": "SHN,SHNM", "jurnal": "DU-46,SHU-2", "nsh": "ESSO №2.1"},
    ],
  },
  {
    bolim: "7.BOG'LIQLIKNI TEKSHIRISH",
    ishlar: [
      {"ish": "Avtoblokirovaka yo'nalishini o'zgartirish sxemasining asosiy va yordamchi rejimlarda ishlashini tekshirish:\nAvariyali o'zgartirish simlarini nazorat qilmasdan.", "davriylik": "Bir oyda bir marta", "bajaruvchi": "SHNS,SHN,DSP", "jurnal": "DU-46,SHU-2", "nsh": "NSH-01 7.1.2"},
    ],
  },
  {
    bolim: "8.SVETOFORLAR",
    ishlar: [
      {"ish": "Taklif qiluvchi signal ko'rinishini tekshirish:\nLampa simining butligini nazorat qiluvchi sxemasi yo'q bo'lsa", "davriylik": "Bir oyda bir marta", "bajaruvchi": "SHN,SHNM", "jurnal": "DU-46", "nsh": "NSH-01 8.1"},
      {"ish": "Svetoforlarni signal ko'rsatkichlari stansiyaning bosh yo'lidan va peregonlarda lokomotivda tekshirish, shuningdek avtomatik lokomotiv signalizatsiyasining yo'l va lokomotiv svetoforlariga mosligini tekshirish", "davriylik": "Bir oyda bir marta", "bajaruvchi": "SHNS,Lokomotiv mashinisti", "jurnal": "AKT, SHU-60", "nsh": "NSH-01 8.2"},
    ],
  },
  {
    bolim: "9. STRELKALI O'TKAZGICHLAR",
    ishlar: [
      {"ish": "Elekryuritma va strelka garniturasini tashqi holatini tekshirish, krestovining harakatlanuvchi serdechnigining fiksatorlarining holatini, shuningdek ostryagni ramali relsga jipslashuvini va harakatlanuvchi krestovina serdechnigining usovikka nisbatan jipslashuvini, elektroprivodni garnituraga mahkamlangan qismlarini mustahkamligini, stopor plankalarining borligi va sozligini, shplint va o'ramlar holati, shpala yashigi ichida tortuvchi tyagalar harakatiga to'sqinlik qiluvchi jismlarning yo'qligi (bu ish ikki haftada bir marta 9.1.2 bandi bilan birgalikda bajariladi.)", "davriylik": "Haftada bir marta", "bajaruvchi": "SHN,SHNM", "jurnal": "SHU-2", "nsh": "NSH-01 9.1.1"},
      {"ish": "Yo'l brigadiri bilan birgalikda strelka o'tkazgichlarining holatini, normal ishlashiga halaqit beradigan nosozliklarni aniqlash, shuningdek yo'l brigadiri bilan birgalikda strelkani plyus va minus holatlarida ostryak va rom relslari o'rtasida 4 mm qalinlikdagi shup qo'yilganda yopilmasligini tekshirish.", "davriylik": "Haftada bir marta, sutkada o'tuvchi poyezdlar soni sakkiz juftdan oshmasa, ikki haftada bir marta", "bajaruvchi": "SHN va yo'l brigadiri", "jurnal": "DU-46", "nsh": "NSH-01 9.1.2"},
      {"ish": "Elektr o'tkazgichni ichki holatini strelkani aylantirish orqali tekshirish, tozalash va moylash; elektrodvigatelni ommetr yordamida tekshirish.", "davriylik": "Doimiy harakatda bo'ladigan strelkalarda bir oyda bir marta", "bajaruvchi": "SHN,SHNM", "jurnal": "SHU-2", "nsh": "NSH-01 9.1.3"},
    ],
  },
  {
    bolim: "10.ELEKTR RELS ZANJIRLARI",
    ishlar: [
      {"ish": "Stansiyada rels zanjirlari holatini tekshirish (ulagichlar, djemperlar, drossel ulagichlari, kabel stoykasi ulagichlari, yo'l transformator qutisi ulagichlarini o'lchovchi asboblar yordamida strelka fundamental burchaklarining izolyatsiyasini o'lchash; rels yoki drossel – transformatorini o'rta chiqishiga mahkamlangan SMB qurilmalarini yerga himoyalovchi yer o'tkazgichi ulanishi; ballast va suv o'tkazish joylarning holati; relsning pastki qismi va ballast o'rtasida oraliq masofa mavjudligi.", "davriylik": "To'rt haftada bir marta", "bajaruvchi": "SHN,SHNM", "jurnal": "DU-46", "nsh": "NSH-01 10.1"},
      {"ish": "Stansiyadagi rels zanjirlarini shuntga sezgirligini 0,06 OM qarshilikni shuntni qo'yish orqali tekshirish;\nBir iplik, ikki iplik, yo'l relesi bo'lmagan parallel ulangan rels zanjirlarini", "davriylik": "Bir haftada bir marta", "bajaruvchi": "SHN,SHNM", "jurnal": "DU-46", "nsh": "NSH-01 10.2"},
      {"ish": "Rels zanjirlari yo'l relelarida kuchlanishni o'lchash:\nstansiyada", "davriylik": "Bir oyda bir marta", "bajaruvchi": "SHN", "jurnal": "SHU-64", "nsh": "NSH-01 10.3"},
      {"ish": "Drossel-transformatorni ichki holatini tekshirish (moy me'yori, suvning yo'qligi va asosiy o'ramni korpusga nisbati, transformatsiya koeffitsientini rels zanjirlarining turiga qarab ulangan qo'shimcha o'ramlar).", "davriylik": "Bir oyda bir marta", "bajaruvchi": "SHN,SHNM", "jurnal": "SHU-2,SHU-79", "nsh": "NSH-01 10.6"},
    ],
  },
  {
    bolim: "10.1. G'ILDIRAK O'QLARINI SANASH USULI BILAN YO'L UCHASTKALARINI NAZORAT QILISH QURILMALARI",
    ishlar: [
      {"ish": "Arxiv fayllarini ko'rish va tahlil qilish, hamda qurilmalar ishidagi og'ishlar (xatolarni) bartaraf etish.", "davriylik": "Bir haftada bir marta", "bajaruvchi": "SHNS,SHN", "jurnal": "SHU-2", "nsh": "NSH-01 10.1.4"},
      {"ish": "G'ildrak immitatoridan foydalangan holda, yo'l datchiklarining ishlashini tekshirish.", "davriylik": "Bir oyda bir marta", "bajaruvchi": "SHN,SHNM", "jurnal": "DU-46", "nsh": "NSH-01 10.1.5"},
    ],
  },
  {
    bolim: "11.6. AVTOMATLASHTIRILGAN ISH O'RINLARI UCHUN USKUNALAR (ARM) MPTS",
    ishlar: [
      {"ish": "Monitor ekranlarini changdan va dog'lardan tozalash", "davriylik": "Bir oyda bir marta", "bajaruvchi": "SHN", "jurnal": "SHU-2", "nsh": "NSH-01 11.6.1"},
    ],
  },
  {
    bolim: "11.7. APPARAT - DASTURIY VOSITALAR ASOSIDA SMB QURILMALARINI BOSHQARISH VA NAZORAT QILISHNING TEXNIK VOSITALARI (MPTS)",
    ishlar: [
      {"ish": "Boshqarish kompleksini, aloqa kanallarini ichki diagnostika vositalari bilan tekshirish.", "davriylik": "To'rt haftada bir marta", "bajaruvchi": "SHN", "jurnal": "SHU-2", "nsh": "NSH-01 11.7.1"},
      {"ish": "Shamollatish va konditsioner tizimlarining ishlashini tekshirish.", "davriylik": "Bir haftada bir marta", "bajaruvchi": "SHN", "jurnal": "SHU-2", "nsh": "NSH-01 11.7.4"},
      {"ish": "O'rnatilgan diagnostika vositalarini boshqarish va nazorat qilish obyektlari bilan juftlashtirish qurilmalarining ishlashi va holatini tekshirish.", "davriylik": "Bir oyda bir marta", "bajaruvchi": "SHN", "jurnal": "SHU-2", "nsh": "NSH-01 11.7.7"},
    ],
  },
  {
    bolim: "11.8. APPARAT - DASTURIY VOSITALAR (MPTS) ASOSIDA SMB QURILMALARINING DASTURIY TA'MINOTI (PO)",
    ishlar: [
      {"ish": "DSP (DNC) ARM tizimi jurnallarining ma'lumotlarini ko'rish va tahlil qilish hamda tahlil natijalari bo'yicha SMB qurilmalarining belgilangan parametrlaridan og'ishlarini bartaraf etish.", "davriylik": "haftada,oyda bir marta", "bajaruvchi": "SHNS, SHN, DS (DNS), DSP", "jurnal": "DU-46,SHU-2", "nsh": "NSH-01 11.8.1"},
      {"ish": "ARM DSP va ARM SHN arxiv fayllarini saqlash va to'g'ri yuritilishini tekshirish.", "davriylik": "Bir oyda bir marta", "bajaruvchi": "SHNS(SHN)", "jurnal": "SHU-2", "nsh": "NSH-01 11.8.3"},
    ],
  },
  {
    bolim: "13.KESISHMANING AVTOMATIK SIGNALIZATSIYASI,AVTOMATIK SHLAGBAUMLAR,TO'SIQ QURILMALARI VA PIYODALAR O'TISH JOYI SIGNALIZATSIYASI.",
    ishlar: [
      {"ish": "Qurilmalarga kompleks xizmat ko'rsatish va tekshirish: navbatchilar tomonidan xizmat ko'rsatilmaydigan, soz holatda ishlayotganligini bekat navbatchilari tomonidan nazorat qilinmaydigan kesishmalarda.", "davriylik": "Bir haftada bir marta", "bajaruvchi": "SHN,SHNM", "jurnal": "SHU-2", "nsh": "NSH-01 13.1"},
      {"ish": "To'suvchi svetoforlarni sozligini, ishlashini va ko'rinishini tekshirish, svetofor lampalarini simini butligi nazorati bo'lmaganda.", "davriylik": "To'rt haftada bir marta", "bajaruvchi": "SHN", "jurnal": "PU-67", "nsh": "NSH-01 13.2"},
      {"ish": "UZP elektroprividini ichki va tashqi holatini tekshirish, transport vositalarini aniqlovchi datchik lokatorlarini tozalash, datchiklarni (KZK) qopqoqning ish joyini nazorat qilish hududiga to'g'ri o'rnatilganini tekshirish.", "davriylik": "To'rt haftada bir marta", "bajaruvchi": "SHN,SHNM", "jurnal": "SHU-2", "nsh": "NSH-01 13.6"},
      {"ish": "Piyodalar o'tish joylaridagi avtomatika holatini va ishlashini tekshirish. Piyodalar uchun svetofor chiroqlarining ko'rinishi, ovozli signallarning to'g'ri ishlashini va akkumulyator batareyalarining holatini tekshirish.", "davriylik": "To'rt haftada bir marta", "bajaruvchi": "SHN", "jurnal": "SHU-2,SHU-63", "nsh": "NSH-01 13.10"},
    ],
  },
  {
    bolim: "17.KABEL TIZIMI, ICHKI MONTAJ VA SIGNAL HAVO LINIYASI",
    ishlar: [
      {"ish": "Signalizator yerlatgich bilan jihozlangan stantsiyalarda montaj izolyatsiya qarshiligini o'lchash:\nElektromexaniklar navbatchilik qilmaydigan joylarda.", "davriylik": "Haftada bir marta", "bajaruvchi": "SHN", "jurnal": "SHU-2", "nsh": "NSH-01 17.1.8"},
    ],
  },
  {
    bolim: "18.ELEKTR TA'MINOTI QURILMALAR",
    ishlar: [
      {"ish": "Elektr kuchlanishi bilan quvvatlanadigan barcha oziqlantiruvchi zanjirlarda kuchlanishni o'lchash, akkumullyator batareyalarini kuchlanishini avtomatik tarzda sozlab turuvchi qurilmaning to'g'ri ishlayotganligini tekshirish:", "davriylik": "To'rt haftada bir marta", "bajaruvchi": "SHNS,SHN", "jurnal": "SHU-2", "nsh": "NSH-01 18.1.1"},
    ],
  },
  {
    bolim: "18.AKKUMULYATORLAR",
    ishlar: [
      {"ish": "Akkumulyatorlar holatini, har bir akkumulyatorda kuchlanishni va elektrolit zichligini 12A yuklama probining yordamida o'zgaruvchan tok o'chirilgan holatda o'lchash; plastinalarning sulfatlanib qolish holati, sinish, plastinalar boshqa moddalar bilan qoplanmasligini tekshirish; stelyajlarni, bankalarni tozalash, ulagichlarni vazelin bilan Moylash, batareya shkafini tozalash:\n\nKuchlanishni avtomatik sozlash qurilmasi bor joylarda:", "davriylik": "To'rt haftada bir marta", "bajaruvchi": "SHN", "jurnal": "SHU-63", "nsh": "NSH-01 18.2.1"},
    ],
  },
  {
    bolim: "18.UZLUKSIZ QUVVAT QURILMALARI (UBP)",
    ishlar: [
      {"ish": "UBP ishini o'lchash asboblari va o'rnatilgan diagnostika vositalari bilan tekshirish.", "davriylik": "Bir oyda bir marta", "bajaruvchi": "SHNS,SHN", "jurnal": "SHU-2", "nsh": "NSH-01 18.2.3"},
    ],
  },
  {
    bolim: "18.3.DIZEL GENERATOR AGREGAT(DGA)",
    ishlar: [
      {"ish": "DGA qurilmalarini tashqi qismlarini tozalash va tekshirish; yoqilg'i miqdorini o'lchash, moy va suv miqdorini o'lchash; DGAni yoqilishini yuklamasiz tekshirish; chiqayotgan kuchlanishlarni o'lchash, signalizatsiya tizimi ishlashini va nazoratini tekshirish.", "davriylik": "Bir oyda bir marta", "bajaruvchi": "SHN", "jurnal": "SHU-2", "nsh": "NSH-01 18.3.1"},
    ],
  },
  {
    bolim: "ALOQA",
    ishlar: [
      {"ish": "“Gradient-12SN” suhbatlarni ro'yxatga olish qurilmalarida vaqt, sana va yilning mahalliy vaqtga mosligini tekshirish, shuningdek elektr ta'minoti o'chirilganda  tekshirish.", "davriylik": "Har kuni", "bajaruvchi": "SHN", "jurnal": "SHU-2", "nsh": "NSH-17"},
      {"ish": "Trassa kabelini ko'zdan kechirish", "davriylik": "Haftada bir marta", "bajaruvchi": "SHN", "jurnal": "SHU-2", "nsh": "NSH-17"},
    ],
  },
];
fs.writeFileSync('tort.json', JSON.stringify(TORT_HAFTALIK_REJA, null, 2), 'utf8');
