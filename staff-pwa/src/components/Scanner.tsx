import { Html5Qrcode } from 'html5-qrcode'
import { useEffect, useRef, useState } from 'react'
import { ApiError, getStaffEvent, scanQr } from '../api'
import { eventLogo } from '../brand'
import type { ScanResponse, StaffEventSummary } from '../types'
import { ResultBadge } from './ResultBadge'

const READER_ID = 'qr-reader'
const COOLDOWN_MS = 2800

interface ScannerProps {
  eventId: string
  event?: StaffEventSummary | null
  onLogout: () => void
  onSessionExpired: () => void
}

export function Scanner({
  eventId,
  event: initialEvent,
  onLogout,
  onSessionExpired,
}: ScannerProps) {
  const [event, setEvent] = useState<StaffEventSummary | null>(initialEvent ?? null)
  const [result, setResult] = useState<ScanResponse | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const expiredRef = useRef(onSessionExpired)
  expiredRef.current = onSessionExpired

  useEffect(() => {
    let cancelled = false
    if (initialEvent?.id === eventId && initialEvent.name) {
      setEvent(initialEvent)
      return
    }
    void getStaffEvent(eventId)
      .then((summary) => {
        if (!cancelled) setEvent(summary)
      })
      .catch((caught: unknown) => {
        if (!cancelled && caught instanceof ApiError && caught.status === 401) {
          expiredRef.current()
        }
      })
    return () => {
      cancelled = true
    }
  }, [eventId, initialEvent])

  useEffect(() => {
    const reader = new Html5Qrcode(READER_ID)
    let active = true
    let busy = false

    reader
      .start(
        { facingMode: 'environment' },
        {
          fps: 8,
          qrbox: (width, height) => {
            const size = Math.floor(Math.min(width, height) * 0.72)
            return { width: size, height: size }
          },
        },
        (decodedText) => {
          if (!active || busy) return
          busy = true
          setScanning(true)
          void scanQr(decodedText, eventId)
            .then((scan) => {
              if (active) setResult(scan)
            })
            .catch((caught: unknown) => {
              if (!active) return
              if (caught instanceof ApiError && caught.status === 401) {
                expiredRef.current()
                return
              }
              setCameraError(
                caught instanceof Error ? caught.message : 'No se pudo validar el código',
              )
            })
            .finally(() => {
              window.setTimeout(() => {
                busy = false
                if (active) setScanning(false)
              }, COOLDOWN_MS)
            })
        },
        () => undefined,
      )
      .then(() => {
        if (!active) {
          return reader.stop()
        }
      })
      .catch(() => {
        if (active) {
          setCameraError('No se pudo abrir la cámara. Revisa el permiso.')
        }
      })

    return () => {
      active = false
      if (reader.isScanning) {
        void reader.stop().catch(() => undefined)
      }
    }
  }, [eventId])

  const logoSrc = eventLogo(event?.logo)
  const eventName = event?.name?.trim() || 'Evento'

  return (
    <main className="screen scanner-screen">
      <header className="topbar">
        <div className="scanner-event">
          <img className="scanner-event-logo" src={logoSrc} alt="" />
          <div>
            <p className="eyebrow">Escaneando</p>
            <p className="scanner-event-name">{eventName}</p>
          </div>
        </div>
        <button type="button" className="ghost" onClick={onLogout}>
          Salir
        </button>
      </header>

      <div className="camera-frame">
        <div id={READER_ID} />
      </div>

      {cameraError ? <p className="form-error">{cameraError}</p> : null}

      {result ? (
        <ResultBadge
          result={result.result}
          guestName={result.guestName}
          companions={result.companions}
          guestCount={result.guestCount}
          tableNumber={result.tableNumber}
        />
      ) : (
        <section className="badge badge-idle" role="status">
          <img className="badge-event-logo" src={logoSrc} alt="" />
          <p className="badge-event-name">{eventName}</p>
          <p className="badge-title">
            {scanning ? 'Validando…' : 'Apunta al código QR'}
          </p>
        </section>
      )}
    </main>
  )
}
