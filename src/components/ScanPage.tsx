import { useEffect, useRef, useState } from 'react'
import { Camera, ImageUp, Plus, Trash2 } from 'lucide-react'
import type { DailyRecord, Page, PendingPayment } from '../types'
import type { ConfirmedEntry, Field, LedgerRow, LedgerType, ScanImage, ScannerStatus } from '../types/ledger'
import { openPayments, remainingOf } from '../lib/calc'
import {
  LedgerError,
  blankRow,
  entryKey,
  findDuplicateWarnings,
  getScannerStatus,
  isUncertain,
  matchCustomer,
  paymentOverflow,
  prepareImage,
  rowWarning,
  scanLedger,
  toConfirmed,
  toRows,
  validateRow,
} from '../lib/ledger.ts'
import { fmtINR, todayStr } from '../lib/utils'
import { useI18n } from '../lib/i18n'
import { scanT } from '../lib/scanI18n'
import '../styles/lumora-scan.css'

type Props = {
  image: ScanImage | null
  onImageChange: (image: ScanImage | null) => void
  records: DailyRecord[]
  pending: PendingPayment[]
  importedKeys: string[]
  onSave: (entries: ConfirmedEntry[], keys: string[]) => { ok: boolean; message?: string }
  onNavigate: (page: Page, question?: string) => void
}

type Step = 'start' | 'preview' | 'reading' | 'review' | 'error' | 'saved'

export default function ScanPage({
  image,
  onImageChange,
  records,
  pending,
  importedKeys,
  onSave,
  onNavigate,
}: Props) {
  const { language } = useI18n()
  const s = (key: Parameters<typeof scanT>[1], values?: Record<string, string | number>) => scanT(language, key, values)
  const localizeMessage = (message: string) => {
    const validation: Record<string, Parameters<typeof scanT>[1]> = {
      'Add a date': 'addDate', 'This date isn’t valid': 'invalidDate', 'This date is in the future': 'futureDate',
      'Add an amount': 'addAmount', 'Please check this amount': 'checkAmount',
      'Choose what this entry is': 'chooseType', 'Add the customer’s name': 'addCustomerName', 'Choose who paid': 'chooseWhoPaid',
      'Same as another row in this scan.': 'duplicateSameRow',
      'You already saved a matching entry from an earlier scan.': 'duplicateEarlier',
      'This credit is already in Pending Payments.': 'duplicateCredit',
      'This payment is already recorded.': 'duplicatePayment',
      'The page marks this as unpaid. If the customer hasn’t paid yet, choose “Credit given”.': 'unpaidWarning',
      'The page marks this as paid. If it was paid in full, choose “Sale”.': 'paidWarning',
    }
    if (validation[message]) return s(validation[message])
    const translatedErrors: Record<string, Parameters<typeof scanT>[1]> = {
      'Please use a JPEG, PNG or WebP photo.': 'imageTypeError',
      'That image is too large. Please use one under 20 MB.': 'imageTooLarge',
      'That file could not be opened as an image.': 'imageOpenError',
      'Your browser could not process that image.': 'imageProcessError',
      'Could not reach the scanner. Check your internet connection and try again.': 'networkError',
      'That image is still too large after shrinking. Try a closer photo of one page.': 'imageShrinkError',
      'Saving is not connected yet.': 'saveFailed',
    }
    if (translatedErrors[message]) return s(translatedErrors[message])
    const overflowMatch = message.match(/^(.*) only owes (₹[\d,]+)$/)
    if (overflowMatch) return s('paymentOverflow', { name: overflowMatch[1], amount: overflowMatch[2] })
    const salesMatch = message.match(/^That day already has (₹[\d,]+) of sales recorded\. This would be added on top\.$/)
    if (salesMatch) return s('duplicateSales', { amount: salesMatch[1] })
    const expensesMatch = message.match(/^That day already has (₹[\d,]+) of expenses recorded\. This would be added on top\.$/)
    if (expensesMatch) return s('duplicateExpenses', { amount: expensesMatch[1] })
    return message
  }

  const today = todayStr()
  const open = openPayments(pending)

  const [step, setStep] = useState<Step>(image ? 'preview' : 'start')
  const [status, setStatus] = useState<ScannerStatus>('checking')
  const [fileError, setFileError] = useState('')
  const [error, setError] = useState<{ code: string; message: string } | null>(null)
  const [rows, setRows] = useState<LedgerRow[]>([])
  const [notes, setNotes] = useState<string[]>([])
  const [checked, setChecked] = useState(false)
  const [dupOk, setDupOk] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [summary, setSummary] = useState({ count: 0, sales: 0, expenses: 0, credit: 0, received: 0 })
  const [showImage, setShowImage] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const readToken = useRef(0)

  useEffect(() => {
    let cancelled = false
    getScannerStatus().then((nextStatus) => {
      if (!cancelled) setStatus(nextStatus)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return
    videoRef.current.srcObject = streamRef.current
    void videoRef.current.play().catch(() => setCameraError('cameraPreviewError'))
  }, [cameraOpen])

  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOpen(false)
  }

  const pick = async (file: File | undefined) => {
    if (!file) return
    setFileError('')
    try {
      const prepared = await prepareImage(file)
      onImageChange(prepared)
      setRows([])
      setError(null)
      setStep('preview')
    } catch (e) {
      const key = e instanceof LedgerError
        ? ({ bad_type: 'imageTypeError', too_big: 'imageTooLarge', bad_image: 'imageOpenError' } as Record<string, Parameters<typeof scanT>[1]>)[e.code] ?? 'imageError'
        : 'imageError'
      setFileError(key)
    }
  }

  const openCamera = async () => {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('cameraUnavailable')
      return
    }
    try {
      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      setCameraOpen(true)
    } catch {
      setCameraError('cameraOpenError')
    }
  }

  const captureCameraPhoto = async () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError('cameraNotReady')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')

    if (!context) {
      setCameraError('captureError')
      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))

    if (!blob) {
      setCameraError('createPhotoError')
      return
    }

    const file = new File([blob], 'ledger-photo.jpg', { type: 'image/jpeg' })
    stopCamera()
    await pick(file)
  }

  const read = async () => {
    if (!image || status !== 'ready') return
    const token = ++readToken.current
    setStep('reading')
    setError(null)

    try {
      const result = await scanLedger(image, today)
      if (token !== readToken.current) return

      const nextRows = toRows(result.entries)
      if (nextRows.length === 0) {
        setError({ code: 'nothing_found', message: '' })
        setStep('error')
        return
      }

      setRows(nextRows.map((row) => ({
        ...row,
        paymentId: row.type === 'payment_received' ? matchCustomer(row.name, open) : '',
      })))
      setNotes(result.notes)
      setChecked(false)
      setDupOk(false)
      setSaveError('')
      setStep('review')
    } catch (e) {
      if (token !== readToken.current) return
      const err = e instanceof LedgerError
        ? e
        : new LedgerError('provider_error', s('genericError'))
      if (err.code === 'not_configured') setStatus('not_configured')
      setError({ code: err.code, message: err.message })
      setStep('error')
    }
  }

  const cancelReading = () => {
    readToken.current++
    setStep('preview')
  }

  const startOver = () => {
    readToken.current++
    stopCamera()
    onImageChange(null)
    setRows([])
    setError(null)
    setFileError('')
    setStep('start')
  }

  const update = (id: string, patch: Partial<LedgerRow>, field?: Field) => {
    setRows((previous) => previous.map((row) => {
      if (row.id !== id) return row
      const next = {
        ...row,
        ...patch,
        edited: field ? { ...row.edited, [field]: true } : row.edited,
      }
      if (
        next.type === 'payment_received' &&
        !patch.paymentId &&
        (field === 'name' || field === 'type')
      ) {
        next.paymentId = matchCustomer(next.name, open) || next.paymentId
      }
      if (next.type !== 'payment_received') next.paymentId = ''
      return next
    }))
  }

  const removeRow = (id: string) => setRows((previous) => previous.filter((row) => row.id !== id))

  const rowErrors = Object.fromEntries(rows.map((row) => [row.id, validateRow(row, today)]))
  const overflow = paymentOverflow(rows, pending)
  const dups = findDuplicateWarnings(rows, records, pending, importedKeys)
  const hasErrors = rows.some((row) => Object.keys(rowErrors[row.id]).length > 0 || overflow[row.id])
  const dupCount = Object.keys(dups).length
  const uncertainCount = rows.filter((row) =>
    (['date', 'name', 'amount', 'type'] as Field[]).some((field) => isUncertain(row, field)),
  ).length
  const canSave = rows.length > 0 && !hasErrors && checked && (dupCount === 0 || dupOk)
  const confirmed = toConfirmed(rows)

  const totals = {
    sales: confirmed.filter((entry) => entry.type === 'sale' || entry.type === 'credit_given')
      .reduce((sum, entry) => sum + entry.amount, 0),
    expenses: confirmed.filter((entry) => entry.type === 'expense')
      .reduce((sum, entry) => sum + entry.amount, 0),
    credit: confirmed.filter((entry) => entry.type === 'credit_given')
      .reduce((sum, entry) => sum + entry.amount, 0),
    received: confirmed.filter((entry) => entry.type === 'payment_received')
      .reduce((sum, entry) => sum + entry.amount, 0),
  }

  const save = () => {
    if (!canSave) return
    const result = onSave(confirmed, rows.map((row) => entryKey(row)))
    if (!result.ok) {
      setSaveError(result.message ?? 'saveFailed')
      return
    }
    setSummary({ count: confirmed.length, ...totals })
    setSaveError('')
    setStep('saved')
    window.scrollTo({ top: 0 })
  }

  const cls = (row: LedgerRow, field: Field) =>
    `lm-input ${isUncertain(row, field) ? 'uncertain' : ''} ${rowErrors[row.id]?.[field] ? 'invalid' : ''}`

  const unavailable = status === 'not_configured' || status === 'unreachable'

  const typeLabel = (type: LedgerType) => {
    switch (type) {
      case 'sale': return s('sale')
      case 'credit_given': return s('creditGiven')
      case 'payment_received': return s('paymentReceived')
      case 'expense': return s('expense')
    }
  }

  return (
    <div className="lm-stack">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="lm-sr"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          void pick(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="lm-sr"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          void pick(event.target.files?.[0])
          event.target.value = ''
        }}
      />

      {cameraOpen && (
        <section className="lm-camera-panel">
          <h3>{s('cameraTitle')}</h3>
          <video ref={videoRef} autoPlay playsInline muted className="lm-camera-video" />
          {cameraError && <p role="alert">{s(cameraError as Parameters<typeof scanT>[1])}</p>}
          <div className="lm-camera-actions">
            <button type="button" onClick={() => void captureCameraPhoto()}>{s('capture')}</button>
            <button type="button" onClick={stopCamera}>{s('cancel')}</button>
          </div>
        </section>
      )}

      {(step === 'start' || step === 'preview') && (
        <section className="lm-hero compact">
          <div>
            <span className="lm-label terra">{s('scanEyebrow')}</span>
            <h2>{s('scanHeadline')}</h2>
            <p>{s('scanIntro')}</p>
          </div>
        </section>
      )}

      {status === 'not_configured' && step !== 'saved' && (
        <div className="lm-notice warn" role="status">
          <strong>{s('scannerSetupTitle')}</strong>
          <span>{s('scannerSetupBody')}</span>
        </div>
      )}

      {status === 'unreachable' && step !== 'saved' && (
        <div className="lm-notice warn" role="status">
          <strong>{s('scannerOfflineTitle')}</strong>
          <span>{s('scannerOfflineBody')}</span>
        </div>
      )}

      {fileError && <p className="lm-errors" role="alert">{s(fileError as Parameters<typeof scanT>[1])}</p>}

      {step === 'start' && (
        <section className="lm-card lm-scan-start">
          <div className="lm-scan-buttons">
            <button type="button" className="lm-scan-big" onClick={() => void openCamera()}>
              <Camera size={28} aria-hidden="true" />
              <strong>{s('takePhoto')}</strong>
              <small>{s('phoneHint')}</small>
            </button>
            <button type="button" className="lm-scan-big" onClick={() => fileRef.current?.click()}>
              <ImageUp size={28} aria-hidden="true" />
              <strong>{s('uploadImage')}</strong>
              <small>{s('imageFormats')}</small>
            </button>
          </div>

          <ul className="lm-tips">
            <li>{s('tip1')}</li>
            <li>{s('tip2')}</li>
            <li>{s('tip3')}</li>
          </ul>

          <p className="lm-privacy">
            <strong>{s('privacyTitle')}</strong> {s('privacyBody')}
          </p>

          <button type="button" className="lm-link" onClick={() => onNavigate('checkup')}>
            {s('typeInstead')}
          </button>
        </section>
      )}

      {step === 'preview' && image && (
        <section className="lm-card lm-scan-preview">
          <img src={image.dataUrl} alt={s('photoAlt')} />
          <div className="lm-row-actions">
            <button type="button" className="lm-btn primary" onClick={() => void read()} disabled={status !== 'ready'}>
              {status === 'checking' ? s('checkingScanner') : s('readPage')}
            </button>
            <button type="button" className="lm-btn ghost" onClick={() => void openCamera()}>{s('retake')}</button>
            <button type="button" className="lm-btn ghost" onClick={() => fileRef.current?.click()}>{s('replace')}</button>
            <button type="button" className="lm-btn ghost" onClick={startOver}>{s('cancel')}</button>
          </div>
          {unavailable && (
            <button type="button" className="lm-link" onClick={() => onNavigate('checkup')}>
              {s('enterByHand')}
            </button>
          )}
        </section>
      )}

      {step === 'reading' && (
        <section className="lm-card lm-scan-reading" aria-live="polite">
          <div className="lm-spinner" aria-hidden="true" />
          <h3>{s('readingTitle')}</h3>
          <p>{s('readingBody')}</p>
          <button type="button" className="lm-btn ghost" onClick={cancelReading}>{s('cancel')}</button>
        </section>
      )}

      {step === 'error' && error && (
        <section className="lm-card lm-scan-reading" role="alert">
          <h3>{error.code === 'not_configured' ? s('readingSetupError') : s('readingError')}</h3>
          <p>{error.code === 'nothing_found' ? s('nothingFound') : error.code === 'network' ? s('networkError') : localizeMessage(error.message) === error.message ? s('genericError') : localizeMessage(error.message)}</p>
          {image && <img className="lm-thumb" src={image.dataUrl} alt={s('retryPhotoAlt')} />}
          <div className="lm-row-actions">
            {error.code !== 'not_configured' && (
              <button type="button" className="lm-btn primary" onClick={() => void read()}>{s('tryAgain')}</button>
            )}
            <button type="button" className="lm-btn ghost" onClick={() => setStep('preview')}>{s('changePhoto')}</button>
            <button type="button" className="lm-btn ghost" onClick={() => onNavigate('checkup')}>{s('enterByHandShort')}</button>
          </div>
        </section>
      )}

      {step === 'review' && (
        <>
          <section className="lm-hero compact">
            <div>
              <span className="lm-label terra">{s('reviewEyebrow')}</span>
              <h2>
                {rows.length} {rows.length === 1 ? s('entrySingular') : s('entries')} {s('found')}
              </h2>
              <p>
                {s('handwritingWarning')}{' '}
                {uncertainCount > 0
                  ? `${uncertainCount} ${uncertainCount === 1 ? s('uncertainOne') : s('uncertainMany')}`
                  : s('checkEveryRow')}
              </p>
            </div>
          </section>

          {notes.length > 0 && (
            <div className="lm-notice" role="status">
              <strong>{s('notesTitle')}</strong>
              {notes.map((note, index) => <span key={`${index}-${note}`}>{note}</span>)}
            </div>
          )}

          {image && (
            <section className="lm-card lm-scan-original">
              <button type="button" className="lm-link" onClick={() => setShowImage((value) => !value)} aria-expanded={showImage}>
                {showImage ? s('hidePhoto') : s('showPhoto')}
              </button>
              {showImage && <img src={image.dataUrl} alt={s('ledgerAlt')} />}
            </section>
          )}

          <div className="lm-stack tight">
            {rows.map((row, index) => {
              const err = rowErrors[row.id]
              const warning = rowWarning(row)
              return (
                <article key={row.id} className={`lm-card lm-row-card ${dups[row.id] ? 'dup' : ''}`}>
                  <div className="lm-row-head">
                    <strong>{s('entry')} {index + 1}</strong>
                    <button type="button" className="lm-icon-btn" onClick={() => removeRow(row.id)} aria-label={`${s('removeEntry')} ${index + 1}`}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>

                  {row.rawText && <p className="lm-raw">{s('readAs')} “{row.rawText}”</p>}

                  <div className="lm-row-grid">
                    <div className="lm-field">
                      <label htmlFor={`d-${row.id}`} className="lm-mini-label">{s('date')}</label>
                      <input
                        id={`d-${row.id}`}
                        type="date"
                        max={today}
                        className={cls(row, 'date')}
                        value={row.date}
                        onChange={(event) => update(row.id, { date: event.target.value }, 'date')}
                      />
                      {err.date && <span className="lm-fe">{localizeMessage(err.date)}</span>}
                    </div>

                    <div className="lm-field">
                      <label htmlFor={`a-${row.id}`} className="lm-mini-label">{s('amount')}</label>
                      <input
                        id={`a-${row.id}`}
                        inputMode="numeric"
                        className={cls(row, 'amount')}
                        value={row.amount}
                        placeholder="0"
                        onChange={(event) => update(row.id, { amount: event.target.value.replace(/[^0-9]/g, '').slice(0, 9) }, 'amount')}
                      />
                      {err.amount && <span className="lm-fe">{localizeMessage(err.amount)}</span>}
                    </div>

                    <div className="lm-field wide">
                      <label htmlFor={`t-${row.id}`} className="lm-mini-label">{s('whatIsThis')}</label>
                      <select
                        id={`t-${row.id}`}
                        className={cls(row, 'type')}
                        value={row.type}
                        onChange={(event) => update(row.id, { type: event.target.value as LedgerType | '' }, 'type')}
                      >
                        <option value="">{s('choose')}</option>
                        {(['sale', 'credit_given', 'payment_received', 'expense'] as LedgerType[]).map((type) => (
                          <option key={type} value={type}>{typeLabel(type)}</option>
                        ))}
                      </select>
                      {err.type && <span className="lm-fe">{localizeMessage(err.type)}</span>}
                    </div>

                    <div className="lm-field wide">
                      {row.type === 'payment_received' ? (
                        <>
                          <label htmlFor={`n-${row.id}`} className="lm-mini-label">{s('whoPaid')}</label>
                          <select
                            id={`n-${row.id}`}
                            className={cls(row, 'name')}
                            value={row.paymentId}
                            onChange={(event) => {
                              const payment = open.find((item) => item.id === event.target.value)
                              update(row.id, { paymentId: event.target.value, name: payment ? payment.customer : row.name }, 'name')
                            }}
                          >
                            <option value="">{s('chooseOwingCustomer')}</option>
                            {open.map((payment) => (
                              <option key={payment.id} value={payment.id}>
                                {payment.customer} · {s('owes')} {fmtINR(remainingOf(payment))}
                              </option>
                            ))}
                          </select>
                          {row.name && !row.paymentId && (
                            <span className="lm-hint">
                              {s('pageSays')} “{row.name}”. {s('noMatchingCustomer')}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <label htmlFor={`n-${row.id}`} className="lm-mini-label">
                            {row.type === 'credit_given' ? s('customer') : s('customerSupplierOptional')}
                          </label>
                          <input
                            id={`n-${row.id}`}
                            className={cls(row, 'name')}
                            value={row.name}
                            autoComplete="off"
                            onChange={(event) => update(row.id, { name: event.target.value }, 'name')}
                          />
                        </>
                      )}
                      {err.name && <span className="lm-fe">{localizeMessage(err.name)}</span>}
                      {overflow[row.id] && <span className="lm-fe">{localizeMessage(overflow[row.id])}</span>}
                    </div>

                    <div className="lm-field wide">
                      <label htmlFor={`x-${row.id}`} className="lm-mini-label">{s('itemNoteOptional')}</label>
                      <input
                        id={`x-${row.id}`}
                        className="lm-input"
                        value={row.description}
                        autoComplete="off"
                        onChange={(event) => update(row.id, { description: event.target.value })}
                      />
                    </div>
                  </div>

                  {warning && <p className="lm-row-warn">{localizeMessage(warning)}</p>}
                  {dups[row.id] && <p className="lm-row-dup">{s('possibleDuplicate')} {localizeMessage(dups[row.id])}</p>}
                </article>
              )
            })}
          </div>

          <button type="button" className="lm-btn ghost" onClick={() => setRows((previous) => [...previous, blankRow(today)])}>
            <Plus size={16} aria-hidden="true" /> {s('addRow')}
          </button>

          <section className="lm-card lm-confirm">
            <h3>{s('readyToSave')}</h3>
            {rows.length === 0 ? (
              <p className="lm-hint">{s('noRows')}</p>
            ) : (
              <ul className="lm-confirm-list">
                <li><span>{s('salesIncludingCredit')}</span><strong>{fmtINR(totals.sales)}</strong></li>
                <li><span>{s('expenses')}</span><strong>{fmtINR(totals.expenses)}</strong></li>
                <li><span>{s('newCredit')}</span><strong>{fmtINR(totals.credit)}</strong></li>
                <li><span>{s('receivedNotSales')}</span><strong>{fmtINR(totals.received)}</strong></li>
              </ul>
            )}

            {dupCount > 0 && (
              <label className="lm-check warn">
                <input type="checkbox" checked={dupOk} onChange={(event) => setDupOk(event.target.checked)} />
                <span>{dupCount} {dupCount === 1 ? s('duplicateOne') : s('duplicateMany')}</span>
              </label>
            )}

            <label className="lm-check">
              <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
              <span>{s('confirmation')}</span>
            </label>

            {hasErrors && <p className="lm-errors" role="alert">{s('fixProblems')}</p>}
            {saveError && <p className="lm-errors" role="alert">{saveError === 'saveFailed' || localizeMessage(saveError) === saveError ? s('saveFailed') : localizeMessage(saveError)}</p>}

            <div className="lm-row-actions">
              <button type="button" className="lm-btn primary" onClick={save} disabled={!canSave}>
                {rows.length === 1 ? s('saveOne') : `${s('saveMany')} (${rows.length})`}
              </button>
              <button type="button" className="lm-btn ghost" onClick={() => setStep('preview')}>
                {s('backToPhoto')}
              </button>
            </div>
          </section>
        </>
      )}

      {step === 'saved' && (
        <section className="lm-card lm-saved" role="status">
          <span className="lm-label terra">{s('saved')}</span>
          <h2>{summary.count} {summary.count === 1 ? s('entrySingular') : s('entries')} {s('addedToBusiness')}</h2>
          <ul className="lm-confirm-list">
            <li><span>{s('salesAdded')}</span><strong>{fmtINR(summary.sales)}</strong></li>
            <li><span>{s('expensesAdded')}</span><strong>{fmtINR(summary.expenses)}</strong></li>
            <li><span>{s('newCreditToCollect')}</span><strong>{fmtINR(summary.credit)}</strong></li>
            <li><span>{s('paymentsReceived')}</span><strong>{fmtINR(summary.received)}</strong></li>
          </ul>
          <div className="lm-row-actions">
            <button type="button" className="lm-btn primary" onClick={() => onNavigate('home')}>{s('seeHome')}</button>
            <button type="button" className="lm-btn ghost" onClick={() => onNavigate('history')}>{s('openHistory')}</button>
            <button type="button" className="lm-btn ghost" onClick={startOver}>{s('scanAnother')}</button>
          </div>
        </section>
      )}
    </div>
  )
}
