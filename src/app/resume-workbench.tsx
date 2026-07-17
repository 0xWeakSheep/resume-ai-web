"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";

type RequestState = "idle" | "loading" | "success" | "error";

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

export function ResumeWorkbench() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [resumeText, setResumeText] = useState(sampleResume);
  const [jobDescription, setJobDescription] = useState(sampleJd);
  const [answers, setAnswers] = useState("");
  const [resumeFile, setResumeFile] = useState<UploadedResumeFile | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<CustomizeResponse | null>(null);

  const coveragePercent = result
    ? Math.round(result.quality.keywordCoverage.ratio * 100)
    : 0;

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
      setRequestState("success");
    } catch (error) {
      setRequestState("error");
      setErrorMessage(error instanceof Error ? error.message : "请求失败");
    }
  }

  return (
    <main className="min-h-dvh">
      <header className="app-header">
        <div>
          <p className="eyebrow">Resume AI</p>
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

          {requestState === "error" ? (
            <p className="error-message">{errorMessage}</p>
          ) : null}
        </form>

        <section className="result-panel">
          {result ? (
            <>
              <div className="score-strip">
                <div>
                  <p className="eyebrow">Coverage</p>
                  <strong>{coveragePercent}%</strong>
                  <span>
                    {result.quality.keywordCoverage.matched}/
                    {result.quality.keywordCoverage.total} 关键词
                  </span>
                </div>
                <div>
                  <p className="eyebrow">Fact Risk</p>
                  <strong>{result.quality.factConsistency.riskLevel}</strong>
                  <span>事实一致性</span>
                </div>
                <div>
                  <p className="eyebrow">Readability</p>
                  <strong>{result.quality.readability.score}</strong>
                  <span>可读性评分</span>
                </div>
              </div>

              <div className="result-section">
                <div className="section-title">
                  <p className="eyebrow">Role</p>
                  <h2>{result.rewrite.targetRole}</h2>
                </div>
                <div className="keyword-row">
                  {result.analysis.matchedKeywords.map((keyword) => (
                    <span className="keyword matched-keyword" key={keyword}>
                      {keyword}
                    </span>
                  ))}
                  {result.analysis.missingKeywords.slice(0, 10).map((keyword) => (
                    <span className="keyword missing-keyword" key={keyword}>
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              <div className="result-section">
                <div className="section-title">
                  <p className="eyebrow">Mapping</p>
                  <h2>岗位要求映射</h2>
                </div>
                <div className="mapping-list">
                  {result.analysis.requirementMappings.map((mapping) => (
                    <article className="mapping-card" key={mapping.requirementId}>
                      <div className="mapping-card-head">
                        <span className={statusClassName[mapping.status]}>
                          {statusLabel[mapping.status]}
                        </span>
                        <code>{mapping.requirementId}</code>
                      </div>
                      <p>{mapping.requirement}</p>
                      {mapping.evidence.length > 0 ? (
                        <small>{mapping.evidence[0]}</small>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>

              <div className="result-section">
                <div className="section-title">
                  <p className="eyebrow">Rewrite</p>
                  <h2>改写建议</h2>
                </div>
                <div className="rewrite-list">
                  {result.rewrite.rewrittenExperienceBullets.map((suggestion) => (
                    <article className="rewrite-card" key={suggestion.after}>
                      <p>{suggestion.after}</p>
                      <small>{suggestion.reason}</small>
                    </article>
                  ))}
                </div>
              </div>

              <div className="result-section">
                <div className="section-title">
                  <p className="eyebrow">Questions</p>
                  <h2>补充追问</h2>
                </div>
                <ul className="question-list">
                  {result.analysis.followUpQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </div>

              <div className="result-section">
                <div className="section-title">
                  <p className="eyebrow">Draft</p>
                  <h2>定制简历草稿</h2>
                </div>
                <pre className="markdown-preview">{result.rewrite.finalResumeMarkdown}</pre>
              </div>
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
