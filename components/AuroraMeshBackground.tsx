'use client'

/**
 * Aurora Mesh Background — barcha sahifalarda ishlatiladigan umumiy orqa fon komponenti.
 * Bu komponent orqali dizayn izchilligini ta'minlaymiz.
 */
export function AuroraMeshBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#ff7eb3] blur-[120px] opacity-30 mix-blend-multiply animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#8e44ad] blur-[120px] opacity-30 mix-blend-multiply"></div>
      <div className="absolute top-[20%] right-[20%] w-[40%] h-[40%] rounded-full bg-[#4facfe] blur-[100px] opacity-20 mix-blend-multiply"></div>
      <div className="absolute bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-[#00f2fe] blur-[100px] opacity-20 mix-blend-multiply"></div>
    </div>
  )
}
