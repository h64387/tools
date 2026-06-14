import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Md5ToolModalProps = {
  onClose: () => void
}

type HashLength = '16' | '32'
type LetterCase = 'lower' | 'upper'
type SelectId = 'hashLength' | 'letterCase'

type Toast = {
  message: string
  type: 'error' | 'success'
}

type SelectOption<T extends string> = {
  label: string
  value: T
}

const hashLengthOptions: SelectOption<HashLength>[] = [
  { label: '32 位', value: '32' },
  { label: '16 位', value: '16' },
]

const letterCaseOptions: SelectOption<LetterCase>[] = [
  { label: '小写', value: 'lower' },
  { label: '大写', value: 'upper' },
]

const shiftAmounts = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
]

const tableConstants = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32) >>> 0)

function rotateLeft(value: number, amount: number) {
  return ((value << amount) | (value >>> (32 - amount))) >>> 0
}

function addUnsigned(...values: number[]) {
  return values.reduce((sum, value) => (sum + value) >>> 0, 0)
}

function wordToHex(value: number) {
  return [0, 8, 16, 24]
    .map((shift) => ((value >>> shift) & 0xff).toString(16).padStart(2, '0'))
    .join('')
}

function createMd5Bytes(input: string) {
  const bytes = Array.from(new TextEncoder().encode(input))
  const bitLength = bytes.length * 8

  bytes.push(0x80)

  while (bytes.length % 64 !== 56) {
    bytes.push(0)
  }

  for (let index = 0; index < 8; index += 1) {
    bytes.push(Math.floor(bitLength / 2 ** (8 * index)) & 0xff)
  }

  return bytes
}

function md5(input: string) {
  const bytes = createMd5Bytes(input)
  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  for (let chunkOffset = 0; chunkOffset < bytes.length; chunkOffset += 64) {
    const words = Array.from({ length: 16 }, (_, index) => {
      const offset = chunkOffset + index * 4

      return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0
    })

    let a = a0
    let b = b0
    let c = c0
    let d = d0

    for (let index = 0; index < 64; index += 1) {
      let f: number
      let g: number

      if (index < 16) {
        f = (b & c) | (~b & d)
        g = index
      } else if (index < 32) {
        f = (d & b) | (~d & c)
        g = (5 * index + 1) % 16
      } else if (index < 48) {
        f = b ^ c ^ d
        g = (3 * index + 5) % 16
      } else {
        f = c ^ (b | ~d)
        g = (7 * index) % 16
      }

      const previousD = d
      d = c
      c = b
      b = addUnsigned(b, rotateLeft(addUnsigned(a, f, tableConstants[index], words[g]), shiftAmounts[index]))
      a = previousD
    }

    a0 = addUnsigned(a0, a)
    b0 = addUnsigned(b0, b)
    c0 = addUnsigned(c0, c)
    d0 = addUnsigned(d0, d)
  }

  return [a0, b0, c0, d0].map(wordToHex).join('')
}

export function Md5ToolModal({ onClose }: Md5ToolModalProps) {
  const panelRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [inputText, setInputText] = useState('')
  const [baseHash, setBaseHash] = useState('')
  const [hashLength, setHashLength] = useState<HashLength>('32')
  const [letterCase, setLetterCase] = useState<LetterCase>('lower')
  const [openSelect, setOpenSelect] = useState<SelectId | null>(null)
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
    const handlePointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpenSelect(null)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)

    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [])

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

  const displayedHash = useMemo(() => {
    if (!baseHash) {
      return ''
    }

    const hash = hashLength === '16' ? baseHash.slice(8, 24) : baseHash

    return letterCase === 'upper' ? hash.toUpperCase() : hash
  }, [baseHash, hashLength, letterCase])

  const clearToast = () => {
    setToast(null)
    setToastExiting(false)
  }

  const showToast = (type: Toast['type'], message: string) => {
    setToastExiting(false)
    setToast({ type, message })
  }

  const handleGenerate = () => {
    clearToast()

    if (!inputText) {
      setBaseHash('')
      showToast('error', '请输入需要加密的文本')
      return
    }

    setBaseHash(md5(inputText))
  }

  const handleCopy = async () => {
    if (!displayedHash) {
      showToast('error', '没有可复制的 MD5 结果')
      return
    }

    try {
      await navigator.clipboard.writeText(displayedHash)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = displayedHash
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.append(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }

    showToast('success', 'MD5 结果已复制')
  }

  const handleClear = () => {
    setInputText('')
    setBaseHash('')
    clearToast()
  }

  const renderSelectField = <T extends string>(
    id: SelectId,
    label: string,
    value: T,
    options: SelectOption<T>[],
    onChange: (value: T) => void,
  ) => {
    const selectedOption = options.find((option) => option.value === value)

    return (
      <div className="relative grid gap-2 text-sm font-bold text-slate-500">
        <span>{label}</span>
        <button
          type="button"
          onClick={() => setOpenSelect((current) => (current === id ? null : id))}
          className="focus-ring flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/80 py-2.5 pl-4 pr-4 text-left text-base font-black text-slate-100 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_18px_44px_-34px_rgb(34_211_238/0.75)] transition-all duration-200 hover:border-cyan-300/40 focus:border-cyan-300/50 focus:outline-none focus:ring-4 focus:ring-cyan-300/15"
          aria-haspopup="listbox"
          aria-expanded={openSelect === id}
        >
          <span>{selectedOption?.label}</span>
          <svg className={`size-4 text-cyan-300 transition-transform duration-200 ${openSelect === id ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {openSelect === id && (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#0d121c] p-1.5 shadow-[0_28px_80px_-48px_rgb(0_0_0/0.95)]" role="listbox">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpenSelect(null)
                }}
                className={`flex w-full cursor-pointer items-center rounded-xl px-4 py-2.5 text-left text-sm font-black transition-colors duration-200 ${
                  option.value === value ? 'bg-cyan-300/15 text-cyan-100' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                }`}
                role="option"
                aria-selected={option.value === value}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    )
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
        aria-labelledby="md5-tool-title"
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
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">Hash Runner</p>
              <h2 id="md5-tool-title" className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
                MD5 工具
              </h2>
              <span className="mt-2 block text-sm font-semibold text-slate-500">输入文本生成 MD5 摘要，全部在浏览器本地完成</span>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="focus-ring inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition-colors duration-200 hover:bg-white/10 hover:text-white"
              aria-label="关闭 MD5 工具"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.85fr]">
            <section className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_-48px_rgb(0_0_0/0.95)]" aria-label="MD5 文本输入">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">Input</p>
              </div>

              <label className="grid text-sm font-bold text-slate-500">
                <textarea
                  value={inputText}
                  onChange={(event) => {
                    setInputText(event.target.value)
                    setBaseHash('')
                    clearToast()
                  }}
                  placeholder="输入任意文本，例如：hello"
                  className="focus-ring min-h-64 resize-y rounded-[1.35rem] border border-white/10 bg-slate-950/80 px-5 py-4 font-mono text-sm font-semibold leading-6 text-slate-100 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_16px_42px_-34px_rgb(34_211_238/0.65)] transition-all duration-200 placeholder:text-slate-600 hover:border-cyan-300/40 focus:border-cyan-300/50 focus:outline-none focus:ring-4 focus:ring-cyan-300/15"
                  spellCheck={false}
                />
              </label>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="focus-ring inline-flex cursor-pointer items-center justify-center rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-black text-slate-950 transition-colors duration-200 hover:bg-cyan-200"
                >
                  生成 MD5
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="focus-ring inline-flex cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-black text-slate-200 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                >
                  清空
                </button>
              </div>
            </section>

            <section className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_-48px_rgb(0_0_0/0.95)]" aria-labelledby="md5-result-title">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Result</p>
                <h3 id="md5-result-title" className="mt-2 text-xl font-black text-white">MD5 结果</h3>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                {renderSelectField('hashLength', '输出长度', hashLength, hashLengthOptions, setHashLength)}
                {renderSelectField('letterCase', '字母格式', letterCase, letterCaseOptions, setLetterCase)}
              </div>

              <div className="grid gap-2 text-sm font-bold text-slate-500">
                <span>摘要结果</span>
                <div className="relative">
                  <input
                    value={displayedHash}
                    readOnly
                    placeholder="MD5 结果会显示在这里"
                    className="focus-ring w-full rounded-[1.35rem] border border-white/10 bg-slate-950/80 px-5 py-3 pr-14 font-mono text-base font-black text-slate-100 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] transition-all duration-200 placeholder:text-slate-600 hover:border-cyan-300/40 focus:border-cyan-300/50 focus:outline-none focus:ring-4 focus:ring-cyan-300/15"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="absolute right-3 top-1/2 inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                    aria-label="复制 MD5 结果"
                  >
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-emerald-300/15 bg-emerald-300/10 p-4 text-sm font-semibold leading-6 text-emerald-100">
                16 位结果取 32 位 MD5 的中间 16 个字符。切换输出长度或字母格式会即时更新当前结果。
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  )
}
