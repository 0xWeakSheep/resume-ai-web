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

## 当前 MVP 能力

- 产品 Landing Page：说明 JD 定向改写原理、流程和可信边界。
- 工作台：支持上传 PDF / DOCX / TXT 简历，或使用简历文本作为备用输入。
- JD 输入：支持批量粘贴 JD 文本或链接，并进行标准化、去重、硬门槛过滤和匹配排序。
- 生成闭环：支持事实库抽取、岗位要求映射、补充追问、定制简历生成和事实风险提示。
- 审核交付：支持逐条接受/排除/编辑改写结果，保存“职位—简历版本”关系，并导出 DOCX / PDF。
- 部署准备：提供 Vercel 环境变量配置和后端 API 连接状态提示。
