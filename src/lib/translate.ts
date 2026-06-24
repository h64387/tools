import type { EnabledLlmModel } from './llmConfig'

export type TranslationDirection = 'en-to-zh' | 'zh-to-en'

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: unknown
    }
  }>
  error?: {
    message?: unknown
  }
}

function getDirectionPrompt(direction: TranslationDirection) {
  return direction === 'zh-to-en'
    ? 'Translate the user text from Chinese to English. Only output the translation.'
    : 'Translate the user text from English to Chinese. Only output the translation.'
}

async function parseErrorResponse(response: Response) {
  const fallback = `翻译请求失败（HTTP ${response.status}）`

  try {
    const data = (await response.json()) as ChatCompletionResponse
    const message = data.error?.message

    return typeof message === 'string' && message.trim() ? `${fallback}: ${message}` : fallback
  } catch {
    return fallback
  }
}

export async function translateText(
  model: EnabledLlmModel,
  direction: TranslationDirection,
  text: string,
) {
  const baseUrl = model.baseUrl.trim()
  const apiKey = model.apiKey.trim()
  const llmModel = model.model.trim()

  if (!baseUrl || !apiKey || !llmModel) {
    throw new Error('LLM 配置不完整，请检查 baseUrl、apiKey 和模型名称')
  }

  let response: Response

  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: llmModel,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: getDirectionPrompt(direction),
          },
          {
            role: 'user',
            content: text,
          },
        ],
      }),
    })
  } catch {
    throw new Error('翻译请求失败，请检查网络或 LLM 服务配置')
  }

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response))
  }

  let data: unknown

  try {
    data = await response.json()
  } catch {
    throw new Error('LLM 返回格式无法识别')
  }

  if (typeof data !== 'object' || data === null) {
    throw new Error('LLM 返回格式无法识别')
  }

  const content = (data as ChatCompletionResponse).choices?.[0]?.message?.content

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('LLM 返回格式无法识别')
  }

  return content.trim()
}
