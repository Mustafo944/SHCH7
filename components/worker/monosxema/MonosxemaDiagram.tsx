'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { normalizeSignalName } from '@/lib/monosxema/signalNames'
import type { SignalState, StationDef } from '@/lib/monosxema/types'
import styles from './Monosxema.module.css'

// qorlitog_server loyihasidagi Monosxema.jsx dan portlangan — faqat CHIZISH
// mantig'i, stansiyaga xos koordinata/nom bu yerda yozilmaydi (station
// ta'rifidan keladi, lib/monosxema/stations/*.ts).

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ')

// Ekran eniga moslashtirish uchun. MAX_SCALE — 4K monitorda cheksiz
// kattalashib ketmasligi uchun chegara.
const MAX_SCALE = 1.6

function useAutoScale(naturalWidth: number) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width
      if (w > 0) setScale(Math.min(MAX_SCALE, w / naturalWidth))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [naturalWidth])

  return { containerRef, scale }
}

export function MonosxemaDiagram({
  station,
  signalStates,
  isArchiveMode,
  maxScale,
  theme = 'dark',
}: {
  station: StationDef
  signalStates: Record<string, SignalState>
  isArchiveMode: boolean
  maxScale?: number
  theme?: 'dark' | 'light'
}) {
  const { containerRef, scale: autoScale } = useAutoScale(station.width)
  const scale = maxScale !== undefined ? Math.min(autoScale, maxScale) : autoScale

  const getState = (name: string): SignalState => {
    const norm = normalizeSignalName(name, station.id)
    return signalStates[norm] || 'red'
  }
  const isFree = (name: string) => getState(name) === 'green'

  const trackState = (t: StationDef['tracks'][number]) => {
    const color = isFree(t.name) ? 'free' : 'busy'
    if (!t.sw) return color
    const pk = getState(t.sw + 'ПК') === 'green'
    const mk = getState(t.sw + 'МК') === 'green'
    const active = t.pathType === 'straight' ? pk : t.pathType === 'side' ? mk : true
    return active ? color : `${color} dashed`
  }

  const trackClasses = (state: string) =>
    cx(styles.track, ...state.split(' ').map((tok) => (styles as Record<string, string>)[tok]))

  const signalTypeClass = (type?: string) =>
    type === 'signal-arrow' ? styles.signalArrow : type === 'signal-square' ? styles.signalSquare : undefined

  const marker = station.archiveMarker || { left: '50%', transform: 'translateX(-50%)' }

  return (
    <div className={styles.root} data-theme={theme}>
      <div ref={containerRef} style={{ width: '100%', height: station.height * scale, overflow: 'hidden' }}>
        <div
          className={cx(styles.stationMap, isArchiveMode && styles.stationMapArchive)}
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: station.width, height: station.height }}
        >
          <h3 className={styles.stationLabel} style={{ left: station.leftLabelX ?? 140 }}>
            {station.leftLabel}
          </h3>
          <h3 className={styles.stationLabel} style={{ right: station.rightLabelX ?? 240 }}>
            {station.rightLabel}
          </h3>

          {(station.izostik || []).map((z, i) => (
            <div
              key={`iz-${i}`}
              style={{ position: 'absolute', left: z.left, top: z.top, width: 2, height: z.h, background: 'var(--muted2)', zIndex: 4 }}
            />
          ))}

          {(station.crossings || []).map((p, i) => {
            const top = p.top ?? 222
            const h = p.h ?? 136
            const w = p.w ?? 43
            const edge: CSSProperties = { position: 'absolute', top, width: 3, height: h, background: 'var(--text-strong)', zIndex: 4 }
            return (
              <div key={`per-${i}`}>
                <div style={{ ...edge, left: p.left }} />
                <div style={{ ...edge, left: p.left + w }} />
                <div
                  style={{
                    position: 'absolute',
                    left: p.left + w / 2,
                    top: top - 14,
                    height: h + 28,
                    borderLeft: '2px dashed var(--muted2)',
                    zIndex: 4,
                  }}
                />
              </div>
            )
          })}

          {station.tracks.flatMap((t, i) => {
            if (t.switchPoints && t.switchPoints.length > 0) {
              const color = isFree(t.name) ? 'free' : 'busy'
              const bounds = [t.left, ...t.switchPoints.map((p) => p.at), t.left + t.w]
              const lastSeg = bounds.length - 2
              return bounds.slice(0, -1).map((segLeft, k) => {
                const segW = bounds[k + 1] - segLeft
                let cls = color
                const isShared = t.reverse ? k === lastSeg : k === 0
                if (!isShared) {
                  const governIdx = t.reverse ? k : k - 1
                  const pk = getState(t.switchPoints![governIdx].sw + 'ПК') === 'green'
                  if (!pk) cls += ' dashed'
                }
                const style: CSSProperties = { left: segLeft, top: t.top, width: segW }
                if (k > 0) {
                  style.borderTopLeftRadius = 0
                  style.borderBottomLeftRadius = 0
                }
                if (k < lastSeg) {
                  style.borderTopRightRadius = 0
                  style.borderBottomRightRadius = 0
                }
                return <div key={`track-${i}-${k}`} className={trackClasses(cls)} style={style} />
              })
            }
            return [
              <div
                key={`track-${i}`}
                className={trackClasses(trackState(t))}
                style={{
                  left: t.left,
                  top: t.top,
                  width: t.w,
                  transform: t.rot ? `rotate(${t.rot})` : undefined,
                }}
              />,
            ]
          })}

          {station.signals.map((s, i) => (
            <div key={`sig-${i}`}>
              <div
                className={cx(
                  styles.signal,
                  signalTypeClass(s.type),
                  s.type ? (getState(s.name) === 'red' ? styles.yellow : styles.red) : (styles as Record<string, string>)[getState(s.name)]
                )}
                data-state={getState(s.name)}
                style={{ left: s.sigLeft, top: s.sigTop }}
              />
              <span className={styles.name} style={{ left: s.labelLeft, top: s.labelTop }}>
                {s.display}
              </span>
            </div>
          ))}

          {station.switches.map((s, i) => (
            <div key={`sw-${i}`}>
              <div
                className={cx(styles.signal, styles.signalSwitch, getState(s.name) === 'green' ? (styles as Record<string, string>)[s.colorType] : undefined)}
                data-state={getState(s.name)}
                style={{ left: s.sigLeft, top: s.sigTop }}
              />
              <span className={styles.switchLabel} style={{ left: s.labelLeft, top: s.labelTop }}>
                {s.display}
              </span>
            </div>
          ))}

          {station.switchLabels.map((sl, i) => (
            <span key={`swl-${i}`} className={styles.section} style={{ left: sl.left, top: sl.top }}>
              {sl.text}
            </span>
          ))}

          <div
            className={cx(styles.archiveMarker, isArchiveMode && styles.isArchive)}
            style={typeof marker.left === 'number' ? { left: marker.left } : { left: marker.left, transform: marker.transform }}
          >
            {isArchiveMode ? 'Arxiv' : 'Live'}
          </div>

          {station.sections.map((sec, i) => (
            <span key={`sec-${i}`} className={styles.section} style={{ left: sec.left, top: sec.top }}>
              {sec.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
