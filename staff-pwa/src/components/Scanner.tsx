import { Html5Qrcode } from 'html5-qrcode'
import { useEffect, useRef, useState } from 'react'
import { ApiError, scanQr } from '../api'
import type { ScanResponse } from '../types'
import { ResultBadge } from './ResultBadge'

const READER_ID = 'qr-reader'
const COOLDOWN_MS = 2800

interface ScannerProps {
  accessToken: string
  eventId: string
  onLogout: () => void
  onSessionExpired: () => void
}

export function Scanner({
  accessToken,
  eventId,
  onLogout,
  onSessionExpired,
}: ScannerProps) {
  const [result, setResult] = useState<ScanResponse | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const expiredRef = useRef(onSessionExpired)
  expiredRef.current = onSessionExpired

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
          void scanQr(accessToken, decodedText, eventId)
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
  }, [accessToken, eventId])

  return (
    <main className="screen scanner-screen">
      <header className="topbar">
        <div>
          <p className="eyebrow">Escaneando</p>
          <p className="event-id">{eventId}</p>
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
        />
      ) : (
        <section className="badge badge-idle" role="status">
          <p className="badge-title">{scanning ? 'Validando…' : 'Apunta al código QR'}</p>
        </section>
      )}
    </main>
  )
}
