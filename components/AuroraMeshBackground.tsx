'use client'

/**
 * Aurora Mesh Background — barcha sahifalarda ishlatiladigan umumiy orqa fon komponenti.
 * Bu komponent orqali dizayn izchilligini ta'minlaymiz.
 */
export function AuroraMeshBackground() {
  return (
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{
        background: `
          radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.25) 0%, transparent 50%),
          radial-gradient(circle at 100% 0%, rgba(99, 102, 241, 0.2) 0%, transparent 50%),
          radial-gradient(circle at 100% 100%, rgba(14, 165, 233, 0.2) 0%, transparent 50%),
          radial-gradient(circle at 0% 100%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 70%)
        `,
        backgroundColor: '#cbd5e1'
      }}
    />
  )
}
