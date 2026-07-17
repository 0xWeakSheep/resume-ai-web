# resume-ai-web

Resume AI 的用户端 Web 应用。基于 Next.js App Router、TypeScript 和 Tailwind CSS，面向 Vercel 部署。

## 本地开发

```bash
cp .env.example .env.local
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。默认后端地址为 `http://localhost:4000/api/v1`。

## 可用命令

```bash
npm run lint
npm run build
npm run start
```

## Vercel 部署

1. 在 Vercel 导入 `0xWeakSheep/resume-ai-web`。
2. Framework Preset 选择 Next.js，保留默认 Build Command。
3. 配置 `NEXT_PUBLIC_API_BASE_URL`，分别填写 Preview 与 Production API 地址。
4. 部署后在后端设置对应的 `WEB_ORIGIN`。

## 当前范围

- 产品 Landing Page
- 响应式与系统深浅色适配
- Vercel 环境变量模板

后续按照 Linear `A10-8` 继续实现材料提交、处理状态、结果编辑与导出。
