import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type JsonToolModalProps = {
  onClose: () => void
}

type Toast = {
  message: string
  type: 'error' | 'success'
}

type ErrorDetail = {
  column: number | null
  contextLine: string | null
  line: number | null
  message: string
  pointerColumn: number | null
  position: number | null
}

type ParseSuccess = {
  data: unknown
  ok: true
}

type ParseFailure = {
  detail: ErrorDetail
  ok: false
}

type JsonToken = {
  type: 'boolean' | 'key' | 'null' | 'number' | 'punctuation' | 'string' | 'text'
  value: string
}

const tokenClassNames: Record<JsonToken['type'], string> = {
  boolean: 'text-violet-300',
  key: 'text-cyan-200',
  null: 'text-rose-300',
  number: 'text-amber-300',
  punctuation: 'text-slate-500',
  string: 'text-emerald-300',
  text: 'text-slate-300',
}

function extractErrorPosition(message: string) {
  const positionMatch = message.match(/position\s+(\d+)/i)

  if (!positionMatch) {
    return null
  }

  const position = Number(positionMatch[1])

  return Number.isFinite(position) ? position : null
}

function calculateLocation(input: string, position: number | null) {
  if (position === null) {
    return {
      column: null,
      contextLine: null,
      line: null,
      pointerColumn: null,
    }
  }

  const safePosition = Math.min(Math.max(position, 0), input.length)
  let line = 1
  let column = 1
  let lineStart = 0

  for (let index = 0; index < safePosition; index += 1) {
    if (input[index] === '\n') {
      line += 1
      column = 1
      lineStart = index + 1
    } else {
      column += 1
    }
  }

  const lineEndIndex = input.indexOf('\n', lineStart)
  const lineEnd = lineEndIndex === -1 ? input.length : lineEndIndex
  const contextLine = input.slice(lineStart, lineEnd)

  return {
    column,
    contextLine,
    line,
    pointerColumn: Math.max(column, 1),
  }
}

function createErrorDetail(input: string, error: unknown): ErrorDetail {
  const message = error instanceof Error ? error.message : 'JSON 格式无法识别'
  const position = extractErrorPosition(message)
  const location = calculateLocation(input, position)

  return {
    message,
    position,
    ...location,
  }
}

function parseJsonInput(input: string): ParseFailure | ParseSuccess {
  try {
    return {
      data: JSON.parse(input),
      ok: true,
    }
  } catch (error) {
    return {
      detail: createErrorDetail(input, error),
      ok: false,
    }
  }
}

function readJsonString(source: string, start: number) {
  let index = start + 1
  let escaped = false

  while (index < source.length) {
    const character = source[index]

    if (escaped) {
      escaped = false
    } else if (character === '\\') {
      escaped = true
    } else if (character === '"') {
      return source.slice(start, index + 1)
    }

    index += 1
  }

  return source.slice(start)
}

function isJsonKey(source: string, nextIndex: number) {
  let index = nextIndex

  while (index < source.length && /\s/.test(source[index])) {
    index += 1
  }

  return source[index] === ':'
}

function tokenizeJsonOutput(source: string): JsonToken[] {
  const tokens: JsonToken[] = []
  let index = 0

  while (index < source.length) {
    const character = source[index]

    if (/\s/.test(character)) {
      let nextIndex = index + 1

      while (nextIndex < source.length && /\s/.test(source[nextIndex])) {
        nextIndex += 1
      }

      tokens.push({ type: 'text', value: source.slice(index, nextIndex) })
      index = nextIndex
      continue
    }

    if (character === '"') {
      const value = readJsonString(source, index)
      tokens.push({ type: isJsonKey(source, index + value.length) ? 'key' : 'string', value })
      index += value.length
      continue
    }

    const numberMatch = source.slice(index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/)

    if (numberMatch) {
      tokens.push({ type: 'number', value: numberMatch[0] })
      index += numberMatch[0].length
      continue
    }

    if (source.startsWith('true', index) || source.startsWith('false', index)) {
      const value = source.startsWith('true', index) ? 'true' : 'false'
      tokens.push({ type: 'boolean', value })
      index += value.length
      continue
    }

    if (source.startsWith('null', index)) {
      tokens.push({ type: 'null', value: 'null' })
      index += 4
      continue
    }

    if ('{}[]:,'.includes(character)) {
      tokens.push({ type: 'punctuation', value: character })
      index += 1
      continue
    }

    tokens.push({ type: 'text', value: character })
    index += 1
  }

  return tokens
}

function countInputLines(value: string) {
  return value.split('\n').length
}

export function JsonToolModal({ onClose }: JsonToolModalProps) {
  const panelRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const lineNumberRef = useRef<HTMLDivElement>(null)
  const [jsonOutput, setJsonOutput] = useState('')
  const [errorDetail, setErrorDetail] = useState<ErrorDetail | null>(null)
  const [inputLineCount, setInputLineCount] = useState(1)
  const [toast, setToast] = useState<Toast | null>(null)
  const [toastExiting, setToastExiting] = useState(false)

  useEffect(() => {
    const previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousBodyOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    window.setTimeout(() => closeButtonRef.current?.focus(), 0)

    return () => {
      document.body.style.overflow = previousBodyOverflow
      previouslyFocusedElement?.focus()
    }
  }, [])

  useEffect(() => {
    const getFocusableElements = () => {
      const panel = panelRef.current

      if (!panel) {
        return []
      }

      return Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusableElements = getFocusableElements()

      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
        return
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!toast) {
      return
    }

    const fadeTimer = window.setTimeout(() => setToastExiting(true), 800)
    const removeTimer = window.setTimeout(() => setToast(null), 1200)

    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(removeTimer)
    }
  }, [toast])

  const highlightedTokens = useMemo(() => tokenizeJsonOutput(jsonOutput), [jsonOutput])

  const clearToast = () => {
    setToast(null)
    setToastExiting(false)
  }

  const showToast = (type: Toast['type'], message: string) => {
    setToastExiting(false)
    setToast({ type, message })
  }

  const syncInputLineNumberScroll = () => {
    if (lineNumberRef.current && inputRef.current) {
      lineNumberRef.current.scrollTop = inputRef.current.scrollTop
    }
  }

  const selectErrorPosition = (position: number | null) => {
    if (position === null) {
      return
    }

    window.setTimeout(() => {
      const input = inputRef.current

      if (!input) {
        return
      }

      const start = Math.min(Math.max(position, 0), input.value.length)
      const end = Math.min(start + 1, input.value.length)
      const location = calculateLocation(input.value, start)
      const lineHeight = Number.parseFloat(window.getComputedStyle(input).lineHeight)

      input.focus()
      input.setSelectionRange(start, end)

      if (location.line !== null && Number.isFinite(lineHeight)) {
        input.scrollTop = Math.max((location.line - 1) * lineHeight - input.clientHeight / 2 + lineHeight, 0)
      }

      syncInputLineNumberScroll()
      window.requestAnimationFrame(syncInputLineNumberScroll)
    }, 0)
  }

  const parseCurrentInput = () => {
    const currentInput = inputRef.current?.value ?? ''

    if (!currentInput.trim()) {
      setJsonOutput('')
      setErrorDetail(null)
      return null
    }

    const result = parseJsonInput(currentInput)

    if (!result.ok) {
      setJsonOutput('')
      setErrorDetail(result.detail)
      selectErrorPosition(result.detail.position)
      return null
    }

    setErrorDetail(null)
    return result
  }

  const handleFormat = () => {
    clearToast()
    const result = parseCurrentInput()

    if (!result) {
      return
    }

    setJsonOutput(JSON.stringify(result.data, null, 2))
  }

  const handleCompress = () => {
    clearToast()
    const result = parseCurrentInput()

    if (!result) {
      return
    }

    setJsonOutput(JSON.stringify(result.data))
  }

  const handleValidate = () => {
    clearToast()
    const result = parseCurrentInput()

    if (!result) {
      return
    }
  }

  const handleCopy = async () => {
    if (!jsonOutput) {
      showToast('error', '没有可复制的 JSON 结果')
      return
    }

    try {
      await navigator.clipboard.writeText(jsonOutput)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = jsonOutput
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.append(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }

    showToast('success', 'JSON 结果已复制')
  }

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    setJsonOutput('')
    setErrorDetail(null)
    setInputLineCount(1)
    clearToast()
  }

  const handleInputChange = () => {
    setInputLineCount(countInputLines(inputRef.current?.value ?? ''))
    setErrorDetail(null)
    clearToast()
  }

  const handleInputScroll = () => {
    syncInputLineNumberScroll()
  }

  const errorDetailId = errorDetail ? 'json-error-detail' : undefined

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    <div className="toolbox-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-xl sm:px-6" onClick={handleBackdropClick} role="presentation">
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="json-tool-title"
        className="toolbox-modal-panel relative h-[calc(100dvh-2rem)] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-400/20 via-sky-500/10 to-emerald-400/20 p-px shadow-[0_40px_120px_-64px_rgb(34_211_238/0.55)]"
      >
        {toast && (
          <div
            className={`pointer-events-none absolute left-1/2 top-1/2 z-30 w-[min(calc(100%-2rem),26rem)] -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out ${
              toastExiting ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
            }`}
            role="status"
            aria-live="polite"
          >
            <p
              className={`rounded-2xl border px-5 py-4 text-center text-sm font-black shadow-[0_28px_80px_-36px_rgb(0_0_0/0.95)] backdrop-blur-xl ${
                toast.type === 'success'
                  ? 'border-emerald-300/25 bg-emerald-300/15 text-emerald-100'
                  : 'border-red-400/25 bg-red-400/15 text-red-100'
              }`}
            >
              {toast.message}
            </p>
          </div>
        )}
        <div className="flex h-full flex-col rounded-[2rem] bg-[#0a0f17]/95 p-4 pb-6 lg:p-5 lg:pb-6">
          <div className="flex flex-none items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">JSON Runner</p>
              <h2 id="json-tool-title" className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
                JSON 工具
              </h2>
              <span className="mt-2 block text-sm font-semibold text-slate-500">格式化、压缩、校验 JSON 数据，结果在本地完成</span>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="focus-ring inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition-colors duration-200 hover:bg-white/10 hover:text-white"
              aria-label="关闭 JSON 工具"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="mt-4 grid flex-1 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-2">
            <section className="flex flex-col gap-4 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_-48px_rgb(0_0_0/0.95)]" aria-labelledby="json-input-title">
              <div>
                <p id="json-input-title" className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">Input</p>
              </div>
              <label className="flex flex-1 flex-col gap-2 overflow-hidden text-sm font-bold text-slate-500">
                <div className="focus-within:ring-cyan-300/15 flex min-h-0 flex-1 overflow-hidden rounded-[1.35rem] border border-white/10 bg-slate-950/80 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_16px_42px_-34px_rgb(34_211_238/0.65)] transition-all duration-200 hover:border-cyan-300/40 focus-within:border-cyan-300/50 focus-within:ring-4">
                  <div
                    ref={lineNumberRef}
                    className="min-h-0 w-14 shrink-0 select-none overflow-hidden border-r border-white/10 px-3 py-4 text-right font-mono text-sm font-semibold leading-[20px] text-slate-600"
                    aria-hidden="true"
                  >
                    {Array.from({ length: inputLineCount }, (_, index) => (
                      <div key={index}>{index + 1}</div>
                    ))}
                  </div>
                  <textarea
                    ref={inputRef}
                    onChange={handleInputChange}
                    onScroll={handleInputScroll}
                    aria-describedby={errorDetailId}
                    aria-invalid={errorDetail ? 'true' : undefined}
                    aria-label="JSON 输入"
                    placeholder={'例如：{"name":"demo","enabled":true}'}
                    wrap="off"
                    className="min-h-0 flex-1 resize-none overflow-auto bg-transparent px-5 py-4 font-mono text-sm font-semibold leading-[20px] text-slate-100 outline-none transition-all duration-200 placeholder:text-slate-600"
                    spellCheck={false}
                  />
                </div>
              </label>

              <div className="grid flex-none gap-2">
                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={handleFormat}
                    className="focus-ring inline-flex cursor-pointer items-center justify-center rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-black text-slate-950 transition-colors duration-200 hover:bg-cyan-200"
                  >
                    格式化
                  </button>
                  <button
                    type="button"
                    onClick={handleCompress}
                    className="focus-ring inline-flex cursor-pointer items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/10 px-5 py-2.5 text-sm font-black text-cyan-100 transition-colors duration-200 hover:bg-cyan-300/15"
                  >
                    压缩
                  </button>
                  <button
                    type="button"
                    onClick={handleValidate}
                    className="focus-ring inline-flex cursor-pointer items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 px-5 py-2.5 text-sm font-black text-emerald-100 transition-colors duration-200 hover:bg-emerald-300/15"
                  >
                    校验
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleClear}
                  className="focus-ring inline-flex cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-black text-slate-200 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                >
                  清空
                </button>
              </div>

              {errorDetail && (
                <div id="json-error-detail" className="flex-none rounded-[1.35rem] border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-100">
                  <p className="font-black">JSON 校验失败</p>
                  <p className="mt-2 font-semibold text-red-200">{errorDetail.message}</p>
                  {errorDetail.line !== null && errorDetail.column !== null && (
                    <p className="mt-3 font-black text-red-100">第 {errorDetail.line} 行，第 {errorDetail.column} 列</p>
                  )}
                  {errorDetail.contextLine !== null && errorDetail.pointerColumn !== null && (
                    <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80 p-3 font-mono text-xs leading-5 text-slate-200">
                      <code>{errorDetail.contextLine || ' '}</code>
                      {'\n'}
                      <code className="text-red-300">{' '.repeat(Math.max(errorDetail.pointerColumn - 1, 0))}^</code>
                    </pre>
                  )}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-4 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_-48px_rgb(0_0_0/0.95)]" aria-labelledby="json-result-title">
              <div className="flex flex-none items-start justify-between gap-4">
                <div>
                  <p id="json-result-title" className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Result</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="focus-ring inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                  aria-label="复制 JSON 结果"
                >
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-auto rounded-[1.35rem] border border-white/10 bg-slate-950/80 p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
                {jsonOutput ? (
                  <pre className="font-mono text-sm font-semibold leading-6">
                    <code>
                      {highlightedTokens.map((token, index) => (
                        <span key={`${index}-${token.value}`} className={tokenClassNames[token.type]}>
                          {token.value}
                        </span>
                      ))}
                    </code>
                  </pre>
                ) : (
                  <div className="grid h-full place-items-center text-center" />
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  )
}
