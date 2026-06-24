import { type MouseEvent, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { type EnabledLlmModel, loadLlmConfig } from '../lib/llmConfig'
import { type TranslationDirection, translateText } from '../lib/translate'

type TranslationToolModalProps = {
  onClose: () => void
}

type Toast = {
  message: string
  type: 'error' | 'success'
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

export function TranslationToolModal({ onClose }: TranslationToolModalProps) {
  const panelRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const translationRequestIdRef = useRef(0)
  const [models, setModels] = useState<EnabledLlmModel[]>([])
  const [selectedModelKey, setSelectedModelKey] = useState('')
  const [direction, setDirection] = useState<TranslationDirection>('en-to-zh')
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [isTranslating, setIsTranslating] = useState(false)
  const [openSelect, setOpenSelect] = useState(false)
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
        setOpenSelect(false)
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

  useEffect(() => {
    let isMounted = true

    loadLlmConfig()
      .then((config) => {
        if (!isMounted) {
          return
        }

        setModels(config.models)
        setSelectedModelKey(config.defaultModelKey)
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingConfig(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const selectedModel = models.find((model) => model.id === selectedModelKey) ?? null
  const modelButtonText = isLoadingConfig
    ? '正在加载模型...'
    : selectedModel
      ? `${selectedModel.providerName} · ${selectedModel.label}`
      : '未配置模型'

  const clearToast = () => {
    setToast(null)
    setToastExiting(false)
  }

  const showToast = (type: Toast['type'], message: string) => {
    setToastExiting(false)
    setToast({ type, message })
  }

  const invalidateTranslationRequest = () => {
    translationRequestIdRef.current += 1
    setIsTranslating(false)
  }

  const handleSwapDirection = () => {
    invalidateTranslationRequest()
    setDirection((current) => (current === 'zh-to-en' ? 'en-to-zh' : 'zh-to-en'))

    if (!translatedText) {
      clearToast()
      return
    }

    setSourceText(translatedText)
    setTranslatedText(sourceText)
    clearToast()
  }

  const handleTranslate = async () => {
    clearToast()

    if (!sourceText.trim()) {
      setTranslatedText('')
      showToast('error', '请输入需要翻译的文本')
      return
    }

    if (!selectedModel) {
      showToast('error', '未配置可用 LLM 模型')
      return
    }

    setIsTranslating(true)
    const requestId = translationRequestIdRef.current + 1
    translationRequestIdRef.current = requestId

    try {
      const result = await translateText(selectedModel, direction, sourceText.trim())

      if (translationRequestIdRef.current !== requestId) {
        return
      }

      setTranslatedText(result)
    } catch (error) {
      if (translationRequestIdRef.current !== requestId) {
        return
      }

      setTranslatedText('')
      showToast('error', error instanceof Error ? error.message : '翻译失败，请稍后重试')
    } finally {
      if (translationRequestIdRef.current === requestId) {
        setIsTranslating(false)
      }
    }
  }

  const handleClear = () => {
    invalidateTranslationRequest()
    setSourceText('')
    setTranslatedText('')
    clearToast()
  }

  const handleCopy = async () => {
    if (!translatedText) {
      showToast('error', '没有可复制的译文')
      return
    }

    await copyToClipboard(translatedText)
    showToast('success', '译文已复制')
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
        aria-labelledby="translation-tool-title"
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
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">AI Translator</p>
              <h2 id="translation-tool-title" className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
                翻译工具
              </h2>
              <span className="mt-2 block text-sm font-semibold text-slate-500">使用已配置的 LLM 模型完成中文与英文互译</span>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="focus-ring inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition-colors duration-200 hover:bg-white/10 hover:text-white"
              aria-label="关闭翻译工具"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="mt-4 grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_-48px_rgb(0_0_0/0.95)]">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="relative grid gap-2 text-sm font-bold text-slate-500">
                <span>LLM 模型</span>
                <button
                  type="button"
                  onClick={() => setOpenSelect((current) => !current)}
                  disabled={isLoadingConfig || models.length === 0}
                  className="focus-ring flex w-full min-w-0 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/80 py-2.5 pl-4 pr-4 text-left text-base font-black text-slate-100 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_18px_44px_-34px_rgb(34_211_238/0.75)] transition-all duration-200 hover:border-cyan-300/40 focus:border-cyan-300/50 focus:outline-none focus:ring-4 focus:ring-cyan-300/15 disabled:cursor-not-allowed disabled:text-slate-500 disabled:hover:border-white/10"
                  aria-haspopup="listbox"
                  aria-expanded={openSelect}
                >
                  <span className="min-w-0 flex-1 truncate">{modelButtonText}</span>
                  <svg className={`size-4 text-cyan-300 transition-transform duration-200 ${openSelect ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {openSelect && models.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#0d121c] p-1.5 shadow-[0_28px_80px_-48px_rgb(0_0_0/0.95)]" role="listbox">
                    {models.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          if (model.id === selectedModelKey) {
                            setOpenSelect(false)
                            return
                          }

                          invalidateTranslationRequest()
                          setSelectedModelKey(model.id)
                          setTranslatedText('')
                          setOpenSelect(false)
                          clearToast()
                        }}
                        className={`flex w-full cursor-pointer items-center rounded-xl px-4 py-2.5 text-left text-sm font-black transition-colors duration-200 ${
                          model.id === selectedModelKey ? 'bg-cyan-300/15 text-cyan-100' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                        }`}
                        role="option"
                        aria-selected={model.id === selectedModelKey}
                      >
                        <span className="min-w-0 truncate">
                          {model.providerName} · {model.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-2 text-sm font-bold text-slate-500">
                <span>翻译方向</span>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (direction === 'zh-to-en') {
                        return
                      }

                      invalidateTranslationRequest()
                      setDirection('zh-to-en')
                      setTranslatedText('')
                      clearToast()
                    }}
                    className={`focus-ring inline-flex cursor-pointer items-center justify-center rounded-full px-4 py-2.5 text-sm font-black transition-colors duration-200 ${
                      direction === 'zh-to-en'
                        ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200'
                        : 'border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10 hover:text-white'
                    }`}
                    aria-pressed={direction === 'zh-to-en'}
                  >
                    中文 -&gt; 英文
                  </button>
                  <button
                    type="button"
                    onClick={handleSwapDirection}
                    className="focus-ring inline-flex size-10 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                    aria-label="交换翻译方向"
                  >
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M7 7h11m0 0-4-4m4 4-4 4M17 17H6m0 0 4-4m-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (direction === 'en-to-zh') {
                        return
                      }

                      invalidateTranslationRequest()
                      setDirection('en-to-zh')
                      setTranslatedText('')
                      clearToast()
                    }}
                    className={`focus-ring inline-flex cursor-pointer items-center justify-center rounded-full px-4 py-2.5 text-sm font-black transition-colors duration-200 ${
                      direction === 'en-to-zh'
                        ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200'
                        : 'border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10 hover:text-white'
                    }`}
                    aria-pressed={direction === 'en-to-zh'}
                  >
                    英文 -&gt; 中文
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <section
                className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-slate-950/30 p-5 shadow-[0_20px_60px_-48px_rgb(0_0_0/0.95)]"
                aria-labelledby="translation-source-title"
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">Source</p>
                  <h3 id="translation-source-title" className="mt-2 text-xl font-black text-white">原文输入</h3>
                </div>

                <label className="grid gap-2 text-sm font-bold text-slate-500">
                  原文输入
                  <textarea
                    value={sourceText}
                    onChange={(event) => {
                      invalidateTranslationRequest()
                      setSourceText(event.target.value)
                      setTranslatedText('')
                      clearToast()
                    }}
                    placeholder={direction === 'zh-to-en' ? '输入中文，例如：今天天气很好' : '输入英文，例如：The weather is nice today.'}
                    className="focus-ring min-h-64 resize-y rounded-[1.35rem] border border-white/10 bg-slate-950/80 px-5 py-4 font-mono text-sm font-semibold leading-6 text-slate-100 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_16px_42px_-34px_rgb(34_211_238/0.65)] transition-all duration-200 placeholder:text-slate-600 hover:border-cyan-300/40 focus:border-cyan-300/50 focus:outline-none focus:ring-4 focus:ring-cyan-300/15"
                    spellCheck={false}
                  />
                </label>
              </section>

              <section
                className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-slate-950/30 p-5 shadow-[0_20px_60px_-48px_rgb(0_0_0/0.95)]"
                aria-labelledby="translation-result-title"
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Result</p>
                  <h3 id="translation-result-title" className="mt-2 text-xl font-black text-white">译文输出</h3>
                </div>

                <label className="grid gap-2 text-sm font-bold text-slate-500">
                  译文输出
                  <textarea
                    value={translatedText}
                    readOnly
                    placeholder="译文会显示在这里"
                    className="focus-ring min-h-64 resize-y rounded-[1.35rem] border border-white/10 bg-slate-950/80 px-5 py-4 font-mono text-sm font-black leading-6 text-slate-100 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] transition-all duration-200 placeholder:text-slate-600 hover:border-cyan-300/40 focus:border-cyan-300/50 focus:outline-none focus:ring-4 focus:ring-cyan-300/15"
                    spellCheck={false}
                  />
                </label>
              </section>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleTranslate}
                disabled={isTranslating || isLoadingConfig}
                className="focus-ring inline-flex cursor-pointer items-center justify-center rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-black text-slate-950 transition-colors duration-200 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
              >
                {isTranslating ? '翻译中...' : '翻译'}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="focus-ring inline-flex cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-black text-slate-200 transition-colors duration-200 hover:bg-white/10 hover:text-white"
              >
                复制译文
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="focus-ring inline-flex cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-black text-slate-200 transition-colors duration-200 hover:bg-white/10 hover:text-white"
              >
                清空
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  )
}
