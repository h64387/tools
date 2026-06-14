export type Tool = {
  name: string
  slug: string
  path: string
  description: string
  keywords: string[]
}

export const tools: Tool[] = [
  {
    name: '日期时间工具',
    slug: 'date-time',
    path: '/tools/date-time',
    description: '查看当前时间，完成时间戳与日期互转',
    keywords: ['日期', '时间', '时间戳', 'date', 'time', 'timestamp'],
  },
  {
    name: 'MD5 工具',
    slug: 'md5',
    path: '/tools/md5',
    description: '输入文本生成 MD5，支持大小写与 16/32 位输出',
    keywords: ['md5', '摘要', '哈希', 'hash'],
  },
  {
    name: 'Base64 工具',
    slug: 'base64',
    path: '/tools/base64',
    description: 'Base64 编码解码相关工具占位页',
    keywords: ['base64', '编码', '解码', 'encode', 'decode'],
  },
  {
    name: 'JSON 工具',
    slug: 'json',
    path: '/tools/json',
    description: 'JSON 格式化、压缩与校验工具',
    keywords: ['json', '格式化', '压缩', '校验', 'format', 'validate'],
  },
]
