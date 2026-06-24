# 本地工具箱首页

React、Vite、TypeScript、Tailwind CSS v4 与 React Router 构建的本地工具箱首页。当前包含首页、五个工具入口、工具路由与 404 页面。

## 已确认工具

- 日期时间工具：`/tools/date-time`
- MD5 工具：`/tools/md5`
- Base64 工具：`/tools/base64`
- JSON 工具：`/tools/json`（首页卡片打开弹窗，支持格式化、压缩、校验与复制）
- 翻译工具：`/tools/translate`（通过浏览器侧 OpenAI 兼容 LLM 调用；`/config/llm.json` 属于静态公开配置，不要把可用公开 API Key 直接暴露在面向公网的站点中）

## 命令

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
npm run preview
```

## 开发说明

- 首页搜索为本地客户端过滤，会匹配工具名称、说明与关键词。
- 日期时间、MD5、Base64、JSON 与翻译工具均从首页卡片打开弹窗处理。
- 翻译工具通过浏览器侧 OpenAI 兼容 LLM 调用完成，请求生产配置读取自 `/config/llm.json`。
- 本地开发可复制 `.env.example` 为 `.env.local`，并填写 `VITE_DEEPSEEK_API_KEY`。
- `/config/llm.json` 会作为静态资源暴露给所有可访问站点的浏览器用户；该方案仅适合个人、内网或受访问控制的私有部署，公开服务应改用后端代理或受限 Key。
- 当前范围不包含后端、持久化、测试框架或额外工具入口。
