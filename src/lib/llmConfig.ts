import type { LlmConfig, LlmProviderConfig } from '../config/llm'

export type EnabledLlmModel = {
  apiKey: string
  baseUrl: string
  id: string
  label: string
  model: string
  providerId: string
  providerName: string
}

export type LoadedLlmConfig = {
  defaultModelKey: string
  models: EnabledLlmModel[]
  source: 'development' | 'none' | 'runtime'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '')
}

function parseConfig(value: unknown): LlmConfig | null {
  if (!isRecord(value) || !isString(value.defaultModelId) || !Array.isArray(value.providers)) {
    return null
  }

  const providers: LlmProviderConfig[] = []

  for (const provider of value.providers) {
    if (
      !isRecord(provider) ||
      !isString(provider.id) ||
      !isString(provider.name) ||
      !isString(provider.baseUrl) ||
      !isString(provider.apiKey) ||
      typeof provider.enabled !== 'boolean' ||
      !Array.isArray(provider.models)
    ) {
      return null
    }

    const models = []

    for (const model of provider.models) {
      if (
        !isRecord(model) ||
        !isString(model.id) ||
        !isString(model.name) ||
        typeof model.enabled !== 'boolean'
      ) {
        return null
      }

      models.push({
        id: model.id,
        name: model.name,
        enabled: model.enabled,
      })
    }

    providers.push({
      id: provider.id,
      name: provider.name,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      enabled: provider.enabled,
      models,
    })
  }

  return {
    defaultModelId: value.defaultModelId,
    providers,
  }
}

export function flattenEnabledModels(config: LlmConfig) {
  return config.providers.flatMap((provider) => {
    if (!provider.enabled) {
      return []
    }

    return provider.models
      .filter((model) => model.enabled)
      .map((model) => ({
        id: `${provider.id}:${model.id}`,
        label: model.name,
        model: model.id,
        providerId: provider.id,
        providerName: provider.name,
        baseUrl: normalizeBaseUrl(provider.baseUrl),
        apiKey: provider.apiKey,
      }))
  })
}

export async function loadLlmConfig(): Promise<LoadedLlmConfig> {
  const runtimeConfig = await fetch('/config/llm.json', { cache: 'no-store' })
    .then(async (response) => {
      if (!response.ok) {
        return null
      }

      return parseConfig(await response.json())
    })
    .catch(() => null)

  if (runtimeConfig) {
    const runtimeModels = flattenEnabledModels(runtimeConfig)

    if (runtimeModels.length > 0) {
      const defaultModel = runtimeModels.find((model) => model.model === runtimeConfig.defaultModelId) ?? runtimeModels[0]

      return {
        defaultModelKey: defaultModel?.id ?? '',
        models: runtimeModels,
        source: 'runtime',
      }
    }
  }

  if (import.meta.env.DEV) {
    const { developmentLlmConfig } = await import('../config/llm')
    const developmentModels = flattenEnabledModels(developmentLlmConfig)
    const defaultModel = developmentModels.find((model) => model.model === developmentLlmConfig.defaultModelId) ?? developmentModels[0]

    return {
      defaultModelKey: defaultModel?.id ?? '',
      models: developmentModels,
      source: 'development',
    }
  }

  return {
    defaultModelKey: '',
    models: [],
    source: 'none',
  }
}
