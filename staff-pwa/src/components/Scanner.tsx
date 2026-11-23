import { Html5Qrcode } from 'html5-qrcode'
import { useEffect, useRef, useState } from 'react'
import { ApiError, getStaffEvent, isSessionAborted, scanQr } from '../api'
import { DEFAULT_EVENT_LOGO, eventLogo } from '../brand'
import type { ScanResponse, StaffEventSummary } from '../types'
import { ResultBadge } from './ResultBadge'

const READER_ID = 'qr-reader'
/** Keep an OK result on screen; a second hit of the same QR would return ALREADY_USED. */
const SAME_CODE_COOLDOWN_MS = 10_000
/** Let the door read the badge before the next, different code is accepted. */
const READ_COOLDOWN_MS = 2_800
const RETRY_COOLDOWN_MS = 1_600

let cameraQueue: Promise<void> = Promise.resolve()

function enqueueCamera(task: () => Promise<void>) {
  cameraQueue = cameraQueue.catch(() => undefined).then(task)
}

async function releaseReader(reader: Html5Qrcode) {
  try {
    if (reader.isScanning) await reader.stop()
  } catch {
    // The camera may already be stopped.
  }
  try {
    reader.clear()
  } catch {
    // clear() throws if the element is gone or a scan is still marked active.
  }
}

function isMissingCamera(caught: unknown): boolean {
  const text = caught instanceof Error ? caught.message : String(caught)
  return /NotFound|Overconstrained|DevicesNotFound|no camera/i.test(text)
}

async function startReader(reader: Html5Qrcode, onCode: (text: string) => void) {
  const config = {
    fps: 8,
    qrbox: (width: number, height: number) => {
      const size = Math.max(1, Math.floor(Math.min(width, height) * 0.72))
      return { width: size, height: size }
    },
  }
  const onMiss = () => undefined
  try {
    await reader.start({ facingMode: 'environment' }, config, onCode, onMiss)
  } catch (caught) {
    if (!isMissingCamera(caught)) throw caught
    try {
      if (reader.isScanning) await reader.stop()
    } catch {
      // The rear camera never started.
    }
    try {
      reader.clear()
    } catch {
      // Nothing was attached.
    }
    await reader.start({ facingMode: 'user' }, config, onCode, onMiss)
  }
}

interface ScannerProps {
  eventId: string
  event?: StaffEventSummary | null
  onLogout: () => void
  onSessionExpired: () => void
  onEvent: (event: StaffEventSummary) => void
}

function EventLogo({ logo, className }: { logo: string | null | undefined; className: string }) {
  const [failed, setFailed] = useState(false)
  const src = failed ? DEFAULT_EVENT_LOGO : eventLogo(logo)

  useEffect(() => {
    setFailed(false)
  }, [logo])

  return (
    <img
      className={className}
      src={src}
      alt=""
      onError={() => {
        if (src !== DEFAULT_EVENT_LOGO) setFailed(true)
      }}
    />
  )
}

export function Scanner({
  eventId,
  event: initialEvent,
  onLogout,
  onSessionExpired,
  onEvent,
}: ScannerProps) {
  const [event, setEvent] = useState<StaffEventSummary | null>(initialEvent ?? null)
  const [result, setResult] = useState<ScanResponse | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [cameraAttempt, setCameraAttempt] = useState(0)
  const expiredRef = useRef(onSessionExpired)
  const onEventRef = useRef(onEvent)
  const initialEventRef = useRef(initialEvent)
  expiredRef.current = onSessionExpired
  onEventRef.current = onEvent
  initialEventRef.current = initialEvent

  useEffect(() => {
    if (initialEvent?.id === eventId && initialEvent.name?.trim()) {
      setEvent(initialEvent)
      setLoadError(null)
    }
  }, [eventId, initialEvent])

  useEffect(() => {
    let cancelled = false
    const cached = initialEventRef.current
    if (cached?.id === eventId && cached.name?.trim()) {
      setEvent(cached)
      setLoadError(null)
      return
    }

    void getStaffEvent(eventId)
      .then((summary) => {
        if (cancelled) return
        setEvent(summary)
        setLoadError(null)
        onEventRef.current(summary)
      })
      .catch((caught: unknown) => {
        if (cancelled || isSessionAborted(caught)) return
        if (caught instanceof ApiError && caught.status === 401) {
          expiredRef.current()
          return
        }
        setLoadError(
          caught instanceof Error ? caught.message : 'No se pudo cargar el evento',
        )
      })

    return () => {
      cancelled = true
    }
  }, [eventId])

  useEffect(() => {
    let active = true
    let reader: Html5Qrcode | null = null
    let inFlight = false
    let pending: string | null = null
    let lockedToken: string | null = null
    let lockedUntil = 0

    const submit = (token: string) => {
      if (!active) return
      if (inFlight) {
        if (token !== lockedToken) pending = token
        return
      }
      if (token === lockedToken && Date.now() < lockedUntil) return

      inFlight = true
      setScanning(true)
      setResult(null)
      setScanError(null)
      void scanQr(token, eventId)
        .then((scan) => {
          if (!active) return
          setScanning(false)
          setResult(scan)
          setScanError(null)
          lockedToken = token
          lockedUntil = Date.now() + SAME_CODE_COOLDOWN_MS
        })
        .catch((caught: unknown) => {
          if (!active || isSessionAborted(caught)) return
          if (caught instanceof ApiError && caught.status === 401) {
            expiredRef.current()
            return
          }
          lockedToken = token
          lockedUntil = Date.now() + RETRY_COOLDOWN_MS
          setScanning(false)
          setScanError(
            caught instanceof Error ? caught.message : 'No se pudo validar el código',
          )
        })
        .finally(() => {
          window.setTimeout(() => {
            inFlight = false
            if (active) setScanning(false)
            const next = pending
            pending = null
            if (active && next && next !== token) submit(next)
          }, READ_COOLDOWN_MS)
        })
    }

    enqueueCamera(async () => {
      if (!active) return
      try {
        reader = new Html5Qrcode(READER_ID, { verbose: false })
      } catch {
        if (active) setCameraError('No se pudo abrir la cámara. Revisa el permiso.')
        return
      }
      const scanner = reader
      try {
        await startReader(scanner, (decodedText) => {
          if (active) submit(decodedText)
        })
        if (!active) await releaseReader(scanner)
      } catch {
        await releaseReader(scanner)
        if (active) setCameraError('No se pudo abrir la cámara. Revisa el permiso.')
      }
    })

    return () => {
      active = false
      enqueueCamera(async () => {
        if (reader) await releaseReader(reader)
      })
    }
  }, [eventId, cameraAttempt])

  const eventName = event?.name?.trim() || 'Evento'

  return (
    <main className="screen scanner-screen">
      <header className="topbar">
        <div className="scanner-event">
          <EventLogo logo={event?.logo} className="scanner-event-logo" />
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

      {loadError ? <p className="form-error">{loadError}</p> : null}
      {cameraError ? (
        <div className="camera-alert">
          <p className="form-error">{cameraError}</p>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setCameraError(null)
              setCameraAttempt((attempt) => attempt + 1)
            }}
          >
            Reintentar cámara
          </button>
        </div>
      ) : null}

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
          <EventLogo logo={event?.logo} className="badge-event-logo" />
          <p className="badge-event-name">{eventName}</p>
          <p className="badge-title">{scanning ? 'Validando…' : 'Apunta al código QR'}</p>
          {scanError ? <p className="badge-error">{scanError}</p> : null}
        </section>
      )}
    </main>
  )
}
