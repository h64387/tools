import { type MouseEvent, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Base64ToolModalProps = {
  onClose: () => void
}

type Toast = {
  message: string
  type: 'error' | 'success'
}

function encodeTextToBase64(input: string) {
  const bytes = new TextEncoder().encode(input)
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary)
}

function isBase64ShapeValid(input: string) {
  return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input)
}

function decodeBase64ToText(input: string) {
  const normalizedInput = input.replace(/\s/g, '')

  if (!isBase64ShapeValid(normalizedInput)) {
    return { message: 'Base64 格式无法识别', ok: false as const }
  }

  try {
    const binary = atob(normalizedInput)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)

    return { ok: true as const, text }
  } catch {
    return { message: 'Base64 内容不是有效文本', ok: false as const }
  }
}

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.append(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }
}

export function Base64ToolModal({ onClose }: Base64ToolModalProps) {
  const panelRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [textInput, setTextInput] = useState('')
  const [encodedOutput, setEncodedOutput] = useState('')
  const [base64Input, setBase64Input] = useState('')
  const [decodedOutput, setDecodedOutput] = useState('')
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

    const fadeTimer = window.setTimeout(() => setToastExiting(true), 1800)
    const removeTimer = window.setTimeout(() => setToast(null), 2200)

    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(removeTimer)
    }
  }, [toast])

  const clearToast = () => {
    setToast(null)
    setToastExiting(false)
  }

  const showToast = (type: Toast['type'], message: string) => {
    setToastExiting(false)
    setToast({ type, message })
  }

  const handleEncode = () => {
    clearToast()

    if (!textInput) {
      setEncodedOutput('')
      showToast('error', '请输入需要编码的文本')
      return
    }

    setEncodedOutput(encodeTextToBase64(textInput))
  }

  const handleDecode = () => {
    clearToast()

    if (!base64Input.trim()) {
      setDecodedOutput('')
      showToast('error', '请输入需要解码的 Base64')
      return
    }

    const result = decodeBase64ToText(base64Input)

    if (!result.ok) {
      setDecodedOutput('')
      showToast('error', result.message)
      return
    }

    setDecodedOutput(result.text)
  }

  const handleCopy = async (value: string, emptyMessage: string, successMessage: string) => {
    if (!value) {
      showToast('error', emptyMessage)
      return
    }

    await copyToClipboard(value)
    showToast('success', successMessage)
  }

  const handleClearEncode = () => {
    setTextInput('')
    setEncodedOutput('')
    clearToast()
  }

  const handleClearDecode = () => {
    setBase64Input('')
    setDecodedOutput('')
    clearToast()
  }

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    <div className="toolbox-modal-backdrop fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-6 backdrop-blur-xl sm:px-6" onClick={handleBackdropClick} role="presentation">
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="base64-tool-title"
        className="toolbox-modal-panel relative max-h-[calc(100dvh-3rem)] w-full max-w-7xl overflow-y-auto rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-400/20 via-sky-500/10 to-emerald-400/20 p-px shadow-[0_40px_120px_-64px_rgb(34_211_238/0.55)]"
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
        <div className="rounded-[2rem] bg-[#0a0f17]/95 p-4 pb-6 lg:p-5 lg:pb-6">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">Codec Runner</p>
              <h2 id="base64-tool-title" className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
                Base64 工具
              </h2>
              <span className="mt-2 block text-sm font-semibold text-slate-500">文本与 Base64 双向转换，全部在浏览器本地完成</span>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="focus-ring inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition-colors duration-200 hover:bg-white/10 hover:text-white"
              aria-label="关闭 Base64 工具"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <section className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_-48px_rgb(0_0_0/0.95)]" aria-labelledby="base64-encode-title">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">Encode</p>
                <h3 id="base64-encode-title" className="mt-2 text-xl font-black text-white">文本转 Base64</h3>
              </div>

              <label className="grid gap-2 text-sm font-bold text-slate-500">
                文本输入
                <textarea
                  value={textInput}
                  onChange={(event) => {
                    setTextInput(event.target.value)
                    setEncodedOutput('')
                    clearToast()
                  }}
                  placeholder="输入任意文本，例如：你好"
                  className="focus-ring min-h-40 resize-y rounded-[1.35rem] border border-white/10 bg-slate-950/80 px-5 py-4 font-mono text-sm font-semibold leading-6 text-slate-100 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_16px_42px_-34px_rgb(34_211_238/0.65)] transition-all duration-200 placeholder:text-slate-600 hover:border-cyan-300/40 focus:border-cyan-300/50 focus:outline-none focus:ring-4 focus:ring-cyan-300/15"
                  spellCheck={false}
                />
              </label>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleEncode}
                  className="focus-ring inline-flex cursor-pointer items-center justify-center rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-black text-slate-950 transition-colors duration-200 hover:bg-cyan-200"
                >
                  转 Base64
                </button>
                <button
                  type="button"
                  onClick={handleClearEncode}
                  className="focus-ring inline-flex cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-black text-slate-200 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                >
                  清空
                </button>
              </div>

              <div className="grid gap-2 text-sm font-bold text-slate-500">
                <span>Base64 结果</span>
                <div className="relative">
                  <textarea
                    value={encodedOutput}
                    readOnly
                    placeholder="Base64 结果会显示在这里"
                    className="focus-ring min-h-28 w-full resize-y rounded-[1.35rem] border border-white/10 bg-slate-950/80 px-5 py-4 pr-14 font-mono text-sm font-black leading-6 text-slate-100 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] transition-all duration-200 placeholder:text-slate-600 hover:border-cyan-300/40 focus:border-cyan-300/50 focus:outline-none focus:ring-4 focus:ring-cyan-300/15"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(encodedOutput, '没有可复制的 Base64 结果', 'Base64 结果已复制')}
                    className="absolute right-3 top-4 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                    aria-label="复制 Base64 结果"
                  >
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_-48px_rgb(0_0_0/0.95)]" aria-labelledby="base64-decode-title">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Decode</p>
                <h3 id="base64-decode-title" className="mt-2 text-xl font-black text-white">Base64 转文本</h3>
              </div>

              <label className="grid gap-2 text-sm font-bold text-slate-500">
                Base64 输入
                <textarea
                  value={base64Input}
                  onChange={(event) => {
                    setBase64Input(event.target.value)
                    setDecodedOutput('')
                    clearToast()
                  }}
                  placeholder="输入 Base64，例如：aGVsbG8="
                  className="focus-ring min-h-40 resize-y rounded-[1.35rem] border border-white/10 bg-slate-950/80 px-5 py-4 font-mono text-sm font-semibold leading-6 text-slate-100 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_16px_42px_-34px_rgb(34_211_238/0.65)] transition-all duration-200 placeholder:text-slate-600 hover:border-cyan-300/40 focus:border-cyan-300/50 focus:outline-none focus:ring-4 focus:ring-cyan-300/15"
                  spellCheck={false}
                />
              </label>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleDecode}
                  className="focus-ring inline-flex cursor-pointer items-center justify-center rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-black text-slate-950 transition-colors duration-200 hover:bg-cyan-200"
                >
                  转文本
                </button>
                <button
                  type="button"
                  onClick={handleClearDecode}
                  className="focus-ring inline-flex cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-black text-slate-200 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                >
                  清空
                </button>
              </div>

              <div className="grid gap-2 text-sm font-bold text-slate-500">
                <span>文本结果</span>
                <div className="relative">
                  <textarea
                    value={decodedOutput}
                    readOnly
                    placeholder="文本结果会显示在这里"
                    className="focus-ring min-h-28 w-full resize-y rounded-[1.35rem] border border-white/10 bg-slate-950/80 px-5 py-4 pr-14 font-mono text-sm font-black leading-6 text-slate-100 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] transition-all duration-200 placeholder:text-slate-600 hover:border-cyan-300/40 focus:border-cyan-300/50 focus:outline-none focus:ring-4 focus:ring-cyan-300/15"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(decodedOutput, '没有可复制的文本结果', '文本结果已复制')}
                    className="absolute right-3 top-4 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                    aria-label="复制文本结果"
                  >
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  )
}
