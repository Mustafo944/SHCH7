'use client'

/**
 * Aurora Mesh Background — barcha sahifalarda ishlatiladigan umumiy orqa fon komponenti.
 * Bu komponent orqali dizayn izchilligini ta'minlaymiz.
 */
export function AuroraMeshBackground() {
  return (
    <div 
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
      style={{
        background: `
          radial-gradient(circle at 10% 10%, rgba(255, 126, 179, 0.25) 0%, transparent 50%),
          radial-gradient(circle at 90% 90%, rgba(142, 68, 173, 0.25) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(79, 172, 254, 0.15) 0%, transparent 40%),
          radial-gradient(circle at 20% 80%, rgba(0, 242, 254, 0.15) 0%, transparent 40%)
        `,
        backgroundColor: 'var(--bg-primary)'
      }}
    />
  )
}
