export type LlmModelConfig = {
  enabled: boolean
  id: string
  name: string
}

export type LlmProviderConfig = {
  apiKey: string
  baseUrl: string
  enabled: boolean
  id: string
  models: LlmModelConfig[]
  name: string
}

export type LlmConfig = {
  defaultModelId: string
  providers: LlmProviderConfig[]
}

export const developmentLlmConfig: LlmConfig = {
  defaultModelId: 'deepseek-v4-flash',
  providers: [
    {
      id: 'deepseek',
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com',
      apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY ?? '',
      enabled: true,
      models: [
        {
          id: 'deepseek-v4-flash',
          name: 'DeepSeek V4 Flash',
          enabled: true,
        },
      ],
    },
  ],
}
