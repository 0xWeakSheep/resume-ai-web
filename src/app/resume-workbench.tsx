"use client";

import Link from "next/link";
import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

type RequestState = "idle" | "loading" | "success" | "error";
type ExportState = "idle" | "docx" | "pdf";
type ActivePanel = "analysis" | "review" | "quality";

interface UploadedResumeFile {
  name: string;
  mimeType?: string;
  dataBase64: string;
}

interface RequirementMapping {
  requirementId: string;
  requirement: string;
  status: "matched" | "partial" | "missing";
  matchedKeywords: string[];
  evidence: string[];
  recommendation: string;
}

interface RewriteSuggestion {
  before: string;
  after: string;
  reason: string;
  evidence: string;
}

interface CustomizeResponse {
  parsedResume: {
    warnings: string[];
    extracted: {
      skills: string[];
      experienceBullets: string[];
      keywords: string[];
    };
  };
  parsedJobDescription: {
    roleTitle: string;
    requirements: Array<{
      id: string;
      text: string;
      type: string;
      keywords: string[];
    }>;
  };
  analysis: {
    requirementMappings: RequirementMapping[];
    matchedKeywords: string[];
    missingKeywords: string[];
    followUpQuestions: string[];
  };
  rewrite: {
    targetRole: string;
    tailoredSummary: string[];
    rewrittenExperienceBullets: RewriteSuggestion[];
    skillsToEmphasize: string[];
    finalResumeMarkdown: string;
    modificationReasons: string[];
  };
  quality: {
    keywordCoverage: {
      matched: number;
      total: number;
      ratio: number;
      matchedKeywords: string[];
      missingKeywords: string[];
    };
    factConsistency: {
      riskLevel: "low" | "medium" | "high";
      issues: string[];
    };
    readability: {
      averageBulletLength: number;
      longBulletCount: number;
      score: number;
    };
    formatChecks: Array<{
      name: string;
      passed: boolean;
      detail: string;
    }>;
    manualReviewChecklist: string[];
  };
}

const sampleResume = `张三
产品经理

项目经历
- 负责 AI 客服工作台的需求分析和产品设计，协作算法与研发团队上线 RAG 知识库检索能力。
- 推动客服后台从人工检索升级为自动化推荐，试点团队处理效率提升 20%。

教育经历
某某大学 本科 信息管理

核心能力
AI 产品设计 / 需求分析 / 数据分析 / 跨团队协作 / A/B测试`;

const sampleJd = `岗位：AI 产品经理
1. 负责 AI 应用产品的需求分析、产品设计和跨团队协作。
2. 熟悉 RAG、LLM、Prompt 等 AI 应用能力，能和算法团队共同推进方案落地。
3. 具备数据分析能力，能够设计 A/B测试 并评估业务效果。
4. 有 SaaS 商业化经验优先。`;

const statusLabel: Record<RequirementMapping["status"], string> = {
  matched: "已匹配",
  partial: "部分匹配",
  missing: "需补充",
};

const statusClassName: Record<RequirementMapping["status"], string> = {
  matched: "status-pill matched",
  partial: "status-pill partial",
  missing: "status-pill missing",
};

function getApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const value = reader.result;
      if (typeof value !== "string") {
        reject(new Error("文件读取失败"));
        return;
      }

      resolve(value);
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

function buildFileName(extension: "docx" | "pdf") {
  const date = new Date().toISOString().slice(0, 10);

  return `resume-ai-${date}.${extension}`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function markdownToHtml(markdown: string) {
  return markdown
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return "<br />";
      }

      if (trimmed.startsWith("# ")) {
        return `<h1>${escapeHtml(trimmed.slice(2))}</h1>`;
      }

      if (trimmed.startsWith("## ")) {
        return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;
      }

      if (trimmed.startsWith("- ")) {
        return `<p class="bullet">• ${escapeHtml(trimmed.slice(2))}</p>`;
      }

      return `<p>${escapeHtml(trimmed)}</p>`;
    })
    .join("");
}

function buildPrintDocument(markdown: string) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>Resume AI Draft</title>
    <style>
      @page { margin: 18mm; }
      body {
        color: #1f2522;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        line-height: 1.62;
      }
      h1 { margin: 0 0 18px; font-size: 26px; }
      h2 { margin: 22px 0 8px; font-size: 17px; border-bottom: 1px solid #ddd8ce; padding-bottom: 6px; }
      p { margin: 6px 0; }
      .bullet { padding-left: 12px; }
    </style>
  </head>
  <body>${markdownToHtml(markdown)}</body>
</html>`;
}

export function ResumeWorkbench() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [resumeText, setResumeText] = useState(sampleResume);
  const [jobDescription, setJobDescription] = useState(sampleJd);
  const [answers, setAnswers] = useState("");
  const [resumeFile, setResumeFile] = useState<UploadedResumeFile | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [activePanel, setActivePanel] = useState<ActivePanel>("analysis");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [result, setResult] = useState<CustomizeResponse | null>(null);
  const [editableDraft, setEditableDraft] = useState("");
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);

  const coveragePercent = result
    ? Math.round(result.quality.keywordCoverage.ratio * 100)
    : 0;
  const draftChanged = result
    ? editableDraft !== result.rewrite.finalResumeMarkdown
    : false;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setResumeFile(null);
      return;
    }

    const dataBase64 = await readFileAsBase64(file);
    setResumeFile({
      name: file.name,
      mimeType: file.type,
      dataBase64,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!apiBaseUrl) {
      setRequestState("error");
      setErrorMessage("缺少 NEXT_PUBLIC_API_BASE_URL，前端无法连接后端。");
      return;
    }

    setRequestState("loading");
    setStatusMessage("");
    setErrorMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/resume/customize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume: resumeText.trim()
            ? { text: resumeText }
            : { file: resumeFile },
          jobDescription,
          answers,
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message = Array.isArray(errorBody?.message)
          ? errorBody.message.join("；")
          : errorBody?.message;
        throw new Error(message || `请求失败：${response.status}`);
      }

      const payload = (await response.json()) as CustomizeResponse;
      setResult(payload);
      setEditableDraft(payload.rewrite.finalResumeMarkdown);
      setConfirmedAt(null);
      setActivePanel("analysis");
      setRequestState("success");
    } catch (error) {
      setRequestState("error");
      setErrorMessage(error instanceof Error ? error.message : "请求失败");
    }
  }

  function handleClearPersonalData() {
    setResumeText("");
    setJobDescription("");
    setAnswers("");
    setResumeFile(null);
    setResult(null);
    setEditableDraft("");
    setConfirmedAt(null);
    setActivePanel("analysis");
    setErrorMessage("");
    setRequestState("idle");
    setStatusMessage("已清除当前页面中的简历材料、JD、补充信息和生成结果。");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleConfirmDraft() {
    setConfirmedAt(new Date().toLocaleString("zh-CN"));
    setActivePanel("review");
    setStatusMessage("最终稿已确认，可以导出。");
  }

  function handleUseQuestion(question: string) {
    setAnswers((current) => {
      const nextLine = `待补充：${question}`;
      return current.trim() ? `${current.trim()}\n${nextLine}` : nextLine;
    });
    setStatusMessage("追问已加入补充信息区，补充事实后可重新生成。");
  }

  function handleResetDraft() {
    if (!result) {
      return;
    }

    setEditableDraft(result.rewrite.finalResumeMarkdown);
    setConfirmedAt(null);
    setStatusMessage("已恢复 AI 草稿。");
  }

  async function handleCopyDraft() {
    if (!editableDraft.trim()) {
      return;
    }

    await navigator.clipboard.writeText(editableDraft);
    setStatusMessage("Markdown 已复制。");
  }

  async function handleExportDocx() {
    if (!editableDraft.trim()) {
      return;
    }

    setExportState("docx");
    setErrorMessage("");

    try {
      const { Document, HeadingLevel, Packer, Paragraph, TextRun } =
        await import("docx");
      const paragraphs = editableDraft.split("\n").map((line) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("# ")) {
          return new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun(trimmed.slice(2))],
          });
        }

        if (trimmed.startsWith("## ")) {
          return new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun(trimmed.slice(3))],
          });
        }

        if (trimmed.startsWith("- ")) {
          return new Paragraph({
            children: [new TextRun(`• ${trimmed.slice(2)}`)],
          });
        }

        return new Paragraph({
          children: [new TextRun(trimmed)],
        });
      });
      const document = new Document({
        title: result?.rewrite.targetRole ?? "Resume AI Draft",
        creator: "Resume AI",
        sections: [{ children: paragraphs }],
      });
      const blob = await Packer.toBlob(document);

      downloadBlob(blob, buildFileName("docx"));
      setStatusMessage("DOCX 已生成。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "DOCX 导出失败");
      setRequestState("error");
    } finally {
      setExportState("idle");
    }
  }

  function handleExportPdf() {
    if (!editableDraft.trim()) {
      return;
    }

    setExportState("pdf");
    setErrorMessage("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setExportState("idle");
      setRequestState("error");
      setErrorMessage("浏览器阻止了 PDF 打印窗口。");
      return;
    }

    printWindow.document.write(buildPrintDocument(editableDraft));
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => {
      printWindow.print();
      setExportState("idle");
      setStatusMessage("PDF 打印窗口已打开。");
    }, 150);
  }

  return (
    <main className="min-h-dvh">
      <header className="app-header">
        <div>
          <Link className="back-link" href="/">
            返回首页
          </Link>
          <h1>JD 定向简历改写工作台</h1>
        </div>
        <div className="api-state">
          <span className={apiBaseUrl ? "dot online" : "dot offline"} />
          <span>{apiBaseUrl ? "API 已配置" : "API 未配置"}</span>
        </div>
      </header>

      <section className="workspace-grid">
        <form className="input-panel" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Input</p>
              <h2>材料</h2>
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setResumeText(sampleResume);
                setJobDescription(sampleJd);
                setAnswers("");
                setResumeFile(null);
                setResult(null);
                setEditableDraft("");
                setConfirmedAt(null);
                setActivePanel("analysis");
                setStatusMessage("");
                setErrorMessage("");

                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
            >
              填入样例
            </button>
          </div>

          <label className="field">
            <span>简历文本</span>
            <textarea
              value={resumeText}
              onChange={(event) => setResumeText(event.target.value)}
              rows={12}
            />
          </label>

          <label className="file-field">
            <span>或上传 PDF / DOCX / TXT</span>
            <input
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />
            <small>{resumeFile ? resumeFile.name : "文本为空时使用上传文件"}</small>
          </label>

          <label className="field">
            <span>目标 JD</span>
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              rows={10}
            />
          </label>

          <label className="field">
            <span>补充真实信息</span>
            <textarea
              value={answers}
              onChange={(event) => setAnswers(event.target.value)}
              placeholder="可选：补充项目成果、指标、职责边界。"
              rows={4}
            />
          </label>

          <button className="primary-button" disabled={requestState === "loading"}>
            {requestState === "loading" ? "分析中..." : "生成定制版本"}
          </button>

          <button
            className="danger-button"
            onClick={handleClearPersonalData}
            type="button"
          >
            清除材料
          </button>

          {requestState === "error" ? (
            <p className="error-message">{errorMessage}</p>
          ) : null}
          {statusMessage ? <p className="status-message">{statusMessage}</p> : null}
        </form>

        <section className="result-panel">
          {result ? (
            <>
              <div className="workflow-tabs" aria-label="处理流程">
                <button
                  className={activePanel === "analysis" ? "active" : ""}
                  onClick={() => setActivePanel("analysis")}
                  type="button"
                >
                  匹配分析
                </button>
                <button
                  className={activePanel === "quality" ? "active" : ""}
                  onClick={() => setActivePanel("quality")}
                  type="button"
                >
                  质量检查
                </button>
                <button
                  className={activePanel === "review" ? "active" : ""}
                  onClick={() => setActivePanel("review")}
                  type="button"
                >
                  审核导出
                </button>
              </div>

              <div className="score-strip">
                <div>
                  <p className="metric-label">关键词覆盖</p>
                  <strong>{coveragePercent}%</strong>
                  <span>
                    {result.quality.keywordCoverage.matched}/
                    {result.quality.keywordCoverage.total} 关键词
                  </span>
                </div>
                <div>
                  <p className="metric-label">事实风险</p>
                  <strong>{result.quality.factConsistency.riskLevel}</strong>
                  <span>事实一致性</span>
                </div>
                <div>
                  <p className="metric-label">可读性</p>
                  <strong>{result.quality.readability.score}</strong>
                  <span>可读性评分</span>
                </div>
              </div>

              {activePanel === "analysis" ? (
                <>
                  <div className="result-section">
                    <div className="section-title">
                      <h2>{result.rewrite.targetRole}</h2>
                    </div>
                    <div className="keyword-row">
                      {result.analysis.matchedKeywords.map((keyword) => (
                        <span className="keyword matched-keyword" key={keyword}>
                          {keyword}
                        </span>
                      ))}
                      {result.analysis.missingKeywords
                        .slice(0, 10)
                        .map((keyword) => (
                          <span className="keyword missing-keyword" key={keyword}>
                            {keyword}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="result-section">
                    <div className="section-title">
                      <h2>岗位要求映射</h2>
                    </div>
                    <div className="mapping-list">
                      {result.analysis.requirementMappings.map((mapping) => (
                        <article
                          className="mapping-card"
                          key={mapping.requirementId}
                        >
                          <div className="mapping-card-head">
                            <span className={statusClassName[mapping.status]}>
                              {statusLabel[mapping.status]}
                            </span>
                            <code>{mapping.requirementId}</code>
                          </div>
                          <p>{mapping.requirement}</p>
                          {mapping.evidence.length > 0 ? (
                            <small>{mapping.evidence[0]}</small>
                          ) : (
                            <small>{mapping.recommendation}</small>
                          )}
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="result-section">
                    <div className="section-title">
                      <h2>补充追问</h2>
                    </div>
                    <div className="question-list">
                      {result.analysis.followUpQuestions.map((question) => (
                        <article className="question-card" key={question}>
                          <p>{question}</p>
                          <button
                            className="ghost-button"
                            onClick={() => handleUseQuestion(question)}
                            type="button"
                          >
                            加入补充区
                          </button>
                        </article>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {activePanel === "quality" ? (
                <>
                  <div className="result-section">
                    <div className="section-title">
                      <h2>事实边界</h2>
                    </div>
                    <div className="quality-list">
                      {result.quality.factConsistency.issues.map((issue) => (
                        <article className="quality-card" key={issue}>
                          <span>事实一致性</span>
                          <p>{issue}</p>
                        </article>
                      ))}
                      {result.quality.formatChecks.map((check) => (
                        <article className="quality-card" key={check.name}>
                          <span>{check.passed ? "通过" : "需检查"}</span>
                          <p>
                            {check.name}：{check.detail}
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="result-section">
                    <div className="section-title">
                      <h2>人工审核清单</h2>
                    </div>
                    <ul className="review-checklist">
                      {result.quality.manualReviewChecklist.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : null}

              {activePanel === "review" ? (
                <>
                  <div className="result-section">
                    <div className="section-title">
                      <h2>原文与改写对比</h2>
                    </div>
                    <div className="comparison-list">
                      {result.rewrite.rewrittenExperienceBullets.map(
                        (suggestion) => (
                          <article
                            className="comparison-card"
                            key={suggestion.after}
                          >
                            <div>
                              <span>原文证据</span>
                              <p>{suggestion.before}</p>
                            </div>
                            <div>
                              <span>改写结果</span>
                              <p>{suggestion.after}</p>
                            </div>
                            <div>
                              <span>修改理由</span>
                              <p>{suggestion.reason}</p>
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="result-section">
                    <div className="section-title">
                      <h2>可编辑最终稿</h2>
                    </div>
                    <label className="draft-editor">
                      <span>最终稿 Markdown</span>
                      <textarea
                        onChange={(event) => {
                          setEditableDraft(event.target.value);
                          setConfirmedAt(null);
                        }}
                        rows={18}
                        value={editableDraft}
                      />
                    </label>
                    <div className="draft-actions">
                      <button
                        className="primary-button compact"
                        disabled={!editableDraft.trim()}
                        onClick={handleConfirmDraft}
                        type="button"
                      >
                        确认版本
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!draftChanged}
                        onClick={handleResetDraft}
                        type="button"
                      >
                        恢复草稿
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!editableDraft.trim()}
                        onClick={handleCopyDraft}
                        type="button"
                      >
                        复制 Markdown
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!confirmedAt || exportState !== "idle"}
                        onClick={handleExportDocx}
                        type="button"
                      >
                        {exportState === "docx" ? "生成中..." : "下载 DOCX"}
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!confirmedAt || exportState !== "idle"}
                        onClick={handleExportPdf}
                        type="button"
                      >
                        {exportState === "pdf" ? "打开中..." : "导出 PDF"}
                      </button>
                      {confirmedAt ? (
                        <span className="confirm-state">已确认：{confirmedAt}</span>
                      ) : (
                        <span className="confirm-state">编辑后需重新确认</span>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <div className="empty-state">
              <p className="eyebrow">Ready</p>
              <h2>提交简历和 JD 后，这里显示分析、追问、改写草稿和质量检查。</h2>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
