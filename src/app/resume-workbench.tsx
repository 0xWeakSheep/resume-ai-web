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
type JobSourceStatus = "ready" | "failed" | "duplicate";
type JobFilterStatus = "pass" | "review" | "blocked";
type RewriteDecision = "accepted" | "rejected";
type ExportFormat = "docx" | "pdf";
type CareerFactCategory =
  | "profile"
  | "experience"
  | "education"
  | "skill"
  | "metric"
  | "keyword";

interface UploadedResumeFile {
  name: string;
  mimeType?: string;
  dataBase64: string;
}

interface ResumePayload {
  text?: string;
  file?: UploadedResumeFile;
}

interface CareerFact {
  id: string;
  category: CareerFactCategory;
  title: string;
  detail: string;
  evidence: string;
  confidence: "high" | "medium" | "low";
}

interface FactResponse {
  factBase: {
    sourceType: "pdf" | "docx" | "text" | "plain-text";
    totalFacts: number;
    facts: CareerFact[];
    grouped: Record<CareerFactCategory, CareerFact[]>;
    warnings: string[];
  };
}

interface StandardizedRequirement {
  id: string;
  text: string;
  type: string;
  keywords: string[];
}

interface HardRequirement {
  type: string;
  text: string;
}

interface HardRequirementMatch {
  type: string;
  text: string;
  status: "matched" | "partial" | "missing";
  evidence: string[];
}

interface JobMatchReport {
  score: number;
  level: "high" | "medium" | "low" | "unmatched";
  matchedKeywords: string[];
  missingKeywords: string[];
  hardRequirementResults: HardRequirementMatch[];
  blockedByHardRequirements: boolean;
  reasons: string[];
}

interface StandardizedJob {
  id: string;
  sourceType: "text" | "url";
  source: string;
  status: JobSourceStatus;
  roleTitle: string;
  company?: string;
  rawText: string;
  normalizedText: string;
  requirements: StandardizedRequirement[];
  keywords: string[];
  criticalKeywords: string[];
  hardRequirements: HardRequirement[];
  similarityGroupId?: string;
  duplicateOf?: string;
  filterStatus?: JobFilterStatus;
  priorityRank?: number;
  match?: JobMatchReport;
  warnings: string[];
}

interface JobStandardizeResponse {
  jobs: StandardizedJob[];
  summary: {
    total: number;
    ready: number;
    failed: number;
    duplicate: number;
    ranked?: number;
    blocked?: number;
  };
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
  sourceFactIds?: string[];
  riskLevel?: "low" | "medium" | "high";
  riskReasons?: string[];
  acceptedByDefault?: boolean;
}

interface SourceFactReference {
  id: string;
  category: CareerFactCategory;
  detail: string;
  evidence: string;
  confidence: "high" | "medium" | "low";
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
    sourceFacts?: SourceFactReference[];
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

interface SelectedJobContext {
  id: string;
  roleTitle: string;
  company?: string;
  priorityRank?: number;
  score?: number;
  level?: JobMatchReport["level"];
  filterStatus?: JobFilterStatus;
}

interface ResumeVersionRecord {
  id: string;
  fingerprint: string;
  roleTitle: string;
  company?: string;
  jobDescription: string;
  draftMarkdown: string;
  selectedJob: SelectedJobContext | null;
  createdAt: string;
  updatedAt: string;
  exportedFormats: ExportFormat[];
  modificationSummary: {
    total: number;
    accepted: number;
    rejected: number;
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

const sampleJobBatchInput = `${sampleJd}

公司：某 AI SaaS 公司
岗位：增长产品经理
1. 本科及以上学历，3 年以上增长或 AI 产品经验。
2. 熟悉数据分析、A/B测试 和跨团队项目推进。`;

const VERSION_STORAGE_KEY = "resume-ai.version-records.v1";
const VERSION_STORAGE_SCHEMA = 1;
const MAX_VERSION_RECORDS = 20;

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

const jobStatusLabel: Record<JobSourceStatus, string> = {
  ready: "可用",
  failed: "失败",
  duplicate: "重复",
};

const jobStatusClassName: Record<JobSourceStatus, string> = {
  ready: "status-pill matched",
  failed: "status-pill missing",
  duplicate: "status-pill partial",
};

const jobFilterLabel: Record<JobFilterStatus, string> = {
  pass: "优先处理",
  review: "待复核",
  blocked: "硬门槛阻断",
};

const jobFilterClassName: Record<JobFilterStatus, string> = {
  pass: "status-pill matched",
  review: "status-pill partial",
  blocked: "status-pill missing",
};

const hardRequirementStatusLabel: Record<HardRequirementMatch["status"], string> =
  {
    matched: "已满足",
    partial: "部分满足",
    missing: "未满足",
  };

const rewriteRiskLabel: Record<NonNullable<RewriteSuggestion["riskLevel"]>, string> =
  {
    low: "低风险",
    medium: "需复核",
    high: "高风险",
  };

const rewriteRiskClassName: Record<
  NonNullable<RewriteSuggestion["riskLevel"]>,
  string
> = {
  low: "status-pill matched",
  medium: "status-pill partial",
  high: "status-pill missing",
};

const rewriteDecisionLabel: Record<RewriteDecision, string> = {
  accepted: "已纳入最终稿",
  rejected: "已从最终稿排除",
};

const factCategoryOrder: CareerFactCategory[] = [
  "profile",
  "experience",
  "education",
  "skill",
  "metric",
  "keyword",
];

const factCategoryLabel: Record<CareerFactCategory, string> = {
  profile: "基础信息",
  experience: "经历事实",
  education: "教育经历",
  skill: "技能能力",
  metric: "量化成果",
  keyword: "关键词",
};

function getApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
}

function buildResumePayload(
  resumeText: string,
  resumeFile: UploadedResumeFile | null,
): ResumePayload | null {
  if (resumeFile) {
    return { file: resumeFile };
  }

  const trimmedResume = resumeText.trim();

  if (trimmedResume) {
    return { text: resumeText };
  }

  return null;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseJobSources(input: string) {
  const jobDescriptions: string[] = [];
  const jobUrls: string[] = [];

  input
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .forEach((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length > 0 && lines.every(isHttpUrl)) {
        jobUrls.push(...lines);
        return;
      }

      jobDescriptions.push(block);
    });

  return { jobDescriptions, jobUrls };
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

function sanitizeFilePart(value: string) {
  return value
    .trim()
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
}

function buildFileName(extension: "docx" | "pdf", roleTitle?: string) {
  const date = new Date().toISOString().slice(0, 10);
  const role = roleTitle ? sanitizeFilePart(roleTitle) : "";

  return `resume-ai${role ? `-${role}` : ""}-${date}.${extension}`;
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

function getSuggestionKey(suggestion: RewriteSuggestion, index: number) {
  return `${index}-${suggestion.before.slice(0, 24)}`;
}

function buildInitialSuggestionDecisions(
  suggestions: RewriteSuggestion[],
): Record<string, RewriteDecision> {
  return Object.fromEntries(
    suggestions.map((suggestion, index) => [
      getSuggestionKey(suggestion, index),
      suggestion.acceptedByDefault === false ? "rejected" : "accepted",
    ]),
  );
}

function buildInitialSuggestionEdits(
  suggestions: RewriteSuggestion[],
): Record<string, string> {
  return Object.fromEntries(
    suggestions.map((suggestion, index) => [
      getSuggestionKey(suggestion, index),
      suggestion.after,
    ]),
  );
}

function buildDraftFromSuggestions(
  payload: CustomizeResponse,
  decisions: Record<string, RewriteDecision>,
  edits: Record<string, string>,
) {
  const acceptedBullets = payload.rewrite.rewrittenExperienceBullets
    .map((suggestion, index) => {
      const key = getSuggestionKey(suggestion, index);

      if (decisions[key] === "rejected") {
        return null;
      }

      const edited = edits[key] ?? suggestion.after;
      return edited.trim() ? `- ${edited.trim()}` : null;
    })
    .filter((line): line is string => Boolean(line));
  const nextBulletSection =
    acceptedBullets.length > 0
      ? acceptedBullets.join("\n")
      : "- 暂无已接受改写，请先接受或编辑至少一条修改。";
  const sectionPattern =
    /## 重点经历改写\n[\s\S]*?\n\n## 建议强调技能/;

  if (!sectionPattern.test(payload.rewrite.finalResumeMarkdown)) {
    return `${payload.rewrite.finalResumeMarkdown}\n\n## 已接受改写\n${nextBulletSection}\n`;
  }

  return payload.rewrite.finalResumeMarkdown.replace(
    sectionPattern,
    `## 重点经历改写\n${nextBulletSection}\n\n## 建议强调技能`,
  );
}

function stableHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash).toString(36);
}

function createVersionFingerprint(
  roleTitle: string,
  jobDescription: string,
  draftMarkdown: string,
) {
  return stableHash(`${roleTitle}\n${jobDescription}\n${draftMarkdown}`);
}

function findBestReadyJob(payload: JobStandardizeResponse) {
  let bestJob: StandardizedJob | null = null;

  for (const job of payload.jobs) {
    if (job.status !== "ready" || job.filterStatus === "blocked") {
      continue;
    }

    if (!bestJob) {
      bestJob = job;
      continue;
    }

    const currentRank = job.priorityRank ?? Number.POSITIVE_INFINITY;
    const bestRank = bestJob.priorityRank ?? Number.POSITIVE_INFINITY;
    const currentScore = job.match?.score ?? 0;
    const bestScore = bestJob.match?.score ?? 0;

    if (
      currentRank < bestRank ||
      (currentRank === bestRank && currentScore > bestScore)
    ) {
      bestJob = job;
    }
  }

  return bestJob;
}

function readStoredVersionRecords(): ResumeVersionRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(VERSION_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const payload = JSON.parse(rawValue) as {
      schema?: number;
      records?: ResumeVersionRecord[];
    };

    if (
      payload.schema !== VERSION_STORAGE_SCHEMA ||
      !Array.isArray(payload.records)
    ) {
      return [];
    }

    return payload.records.slice(0, MAX_VERSION_RECORDS);
  } catch {
    return [];
  }
}

export function ResumeWorkbench() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [resumeText, setResumeText] = useState(sampleResume);
  const [jobDescription, setJobDescription] = useState(sampleJd);
  const [jobBatchInput, setJobBatchInput] = useState(sampleJobBatchInput);
  const [answers, setAnswers] = useState("");
  const [resumeFile, setResumeFile] = useState<UploadedResumeFile | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [factState, setFactState] = useState<RequestState>("idle");
  const [jobState, setJobState] = useState<RequestState>("idle");
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [activePanel, setActivePanel] = useState<ActivePanel>("analysis");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [result, setResult] = useState<CustomizeResponse | null>(null);
  const [factResponse, setFactResponse] = useState<FactResponse | null>(null);
  const [jobResponse, setJobResponse] = useState<JobStandardizeResponse | null>(
    null,
  );
  const [selectedJob, setSelectedJob] = useState<SelectedJobContext | null>(
    null,
  );
  const [editableDraft, setEditableDraft] = useState("");
  const [suggestionDecisions, setSuggestionDecisions] = useState<
    Record<string, RewriteDecision>
  >({});
  const [suggestionEdits, setSuggestionEdits] = useState<Record<string, string>>(
    {},
  );
  const [versionRecords, setVersionRecords] = useState<ResumeVersionRecord[]>(
    () => readStoredVersionRecords(),
  );
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);

  const coveragePercent = result
    ? Math.round(result.quality.keywordCoverage.ratio * 100)
    : 0;
  const draftChanged = result
    ? editableDraft !== result.rewrite.finalResumeMarkdown
    : false;
  const visibleFactGroups = useMemo(
    () =>
      factResponse
        ? factCategoryOrder
            .map((category) => ({
              category,
              facts: factResponse.factBase.grouped[category],
            }))
            .filter((group) => group.facts.length > 0)
        : [],
    [factResponse],
  );
  const jobSources = useMemo(() => parseJobSources(jobBatchInput), [
    jobBatchInput,
  ]);
  const hasResumeMaterial = Boolean(buildResumePayload(resumeText, resumeFile));
  const hasJobSources =
    jobSources.jobDescriptions.length > 0 || jobSources.jobUrls.length > 0;
  const jdSourceCount =
    jobSources.jobDescriptions.length + jobSources.jobUrls.length;
  const hasTargetJobDescription = Boolean(jobDescription.trim());
  const hasJobMaterial = hasJobSources || hasTargetJobDescription;
  const readinessPercent = Math.round(
    ([
      hasResumeMaterial,
      hasJobMaterial,
      Boolean(factResponse),
      Boolean(jobResponse) || hasTargetJobDescription,
    ].filter(Boolean).length /
      4) *
      100,
  );
  const isPrimaryBusy =
    requestState === "loading" ||
    factState === "loading" ||
    jobState === "loading";
  const isAnalysisReady =
    Boolean(factResponse) &&
    hasJobMaterial &&
    (!hasJobSources || Boolean(jobResponse));
  const primaryActionLabel =
    requestState === "loading"
      ? "生成中..."
      : factState === "loading" || jobState === "loading"
        ? "分析中..."
        : !hasResumeMaterial
          ? "先添加简历材料"
          : !hasJobMaterial
            ? "先添加 JD"
            : isAnalysisReady
          ? selectedJob
            ? "生成高优先级定制简历"
            : "生成定制简历"
          : "分析材料与 JD";
  const canUsePrimaryAction =
    hasResumeMaterial && hasJobMaterial && !isPrimaryBusy;
  const primaryActionPhase = isAnalysisReady ? "Generate" : "Analyze";
  const primaryActionTitle = isAnalysisReady
    ? selectedJob
      ? `生成 ${selectedJob.roleTitle} 定制版本`
      : "生成当前目标 JD 的定制版本"
    : "先分析材料与 JD";
  const primaryActionHelper = !hasResumeMaterial
    ? "先上传 PDF / DOCX / TXT，或填写简历文本。"
    : !hasJobMaterial
      ? "需要一个目标 JD，或在批量 JD 区粘贴岗位来源。"
      : isAnalysisReady
        ? "材料、事实库和 JD 已就绪，下一步会生成可审核的简历草稿。"
        : "会同时抽取职业事实库、标准化 JD，并自动选择优先岗位。";
  const readabilityPercent = result
    ? Math.max(0, Math.min(100, result.quality.readability.score))
    : 0;
  const riskPercent = result
    ? {
        low: 22,
        medium: 58,
        high: 88,
      }[result.quality.factConsistency.riskLevel]
    : 0;
  const totalSuggestionCount =
    result?.rewrite.rewrittenExperienceBullets.length ?? 0;
  const acceptedSuggestionCount = Object.values(suggestionDecisions).filter(
    (decision) => decision === "accepted",
  ).length;
  const acceptedSuggestionPercent = totalSuggestionCount
    ? Math.round((acceptedSuggestionCount / totalSuggestionCount) * 100)
    : 0;

  function resetFactBase() {
    setFactResponse(null);
    setFactState("idle");
  }

  function resetGeneratedResume() {
    setResult(null);
    setEditableDraft("");
    setSuggestionDecisions({});
    setSuggestionEdits({});
    setCurrentVersionId(null);
    setConfirmedAt(null);
    setActivePanel("analysis");
    setRequestState("idle");
  }

  function persistVersionRecords(nextRecords: ResumeVersionRecord[]) {
    const trimmedRecords = nextRecords.slice(0, MAX_VERSION_RECORDS);

    setVersionRecords(trimmedRecords);

    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      VERSION_STORAGE_KEY,
      JSON.stringify({
        schema: VERSION_STORAGE_SCHEMA,
        records: trimmedRecords,
      }),
    );
  }

  function saveCurrentVersion(exportFormat?: ExportFormat) {
    if (!result || !editableDraft.trim()) {
      return null;
    }

    const now = new Date().toISOString();
    const roleTitle = result.rewrite.targetRole;
    const fingerprint = createVersionFingerprint(
      roleTitle,
      jobDescription,
      editableDraft,
    );
    const existingRecord = versionRecords.find(
      (record) => record.fingerprint === fingerprint,
    );
    const exportedFormats = exportFormat
      ? Array.from(
          new Set([...(existingRecord?.exportedFormats ?? []), exportFormat]),
        )
      : existingRecord?.exportedFormats ?? [];
    const accepted = Object.values(suggestionDecisions).filter(
      (decision) => decision === "accepted",
    ).length;
    const rejected = Object.values(suggestionDecisions).filter(
      (decision) => decision === "rejected",
    ).length;
    const record: ResumeVersionRecord = {
      id: existingRecord?.id ?? crypto.randomUUID(),
      fingerprint,
      roleTitle,
      company: selectedJob?.company,
      jobDescription,
      draftMarkdown: editableDraft,
      selectedJob,
      createdAt: existingRecord?.createdAt ?? now,
      updatedAt: now,
      exportedFormats,
      modificationSummary: {
        total: result.rewrite.rewrittenExperienceBullets.length,
        accepted,
        rejected,
      },
    };
    const nextRecords = [
      record,
      ...versionRecords.filter((item) => item.id !== record.id),
    ];

    persistVersionRecords(nextRecords);
    setCurrentVersionId(record.id);

    return record;
  }

  function handleLoadVersion(record: ResumeVersionRecord) {
    setJobDescription(record.jobDescription);
    setSelectedJob(record.selectedJob);
    setEditableDraft(record.draftMarkdown);
    setCurrentVersionId(record.id);
    setConfirmedAt(null);
    setActivePanel("review");
    setStatusMessage("已载入历史版本，可继续编辑或重新确认导出。");
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setResumeFile(null);
      resetFactBase();
      return;
    }

    const dataBase64 = await readFileAsBase64(file);
    setResumeFile({
      name: file.name,
      mimeType: file.type,
      dataBase64,
    });
    resetFactBase();
  }

  async function handleExtractFacts() {
    if (!apiBaseUrl) {
      setFactState("error");
      setErrorMessage("缺少 NEXT_PUBLIC_API_BASE_URL，前端无法连接后端。");
      return false;
    }

    const resumePayload = buildResumePayload(resumeText, resumeFile);
    if (!resumePayload) {
      setFactState("error");
      setErrorMessage("请先填写简历文本，或上传 PDF / DOCX / TXT 文件。");
      return false;
    }

    setFactState("loading");
    setStatusMessage("");
    setErrorMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/resume/facts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume: resumePayload,
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
        throw new Error(message || `事实库生成失败：${response.status}`);
      }

      const payload = (await response.json()) as FactResponse;
      setFactResponse(payload);
      setFactState("success");
      setStatusMessage(
        `已生成 ${payload.factBase.totalFacts} 条结构化职业事实。`,
      );
      return true;
    } catch (error) {
      setFactState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "事实库生成失败",
      );
      return false;
    }
  }

  async function handleStandardizeJobs() {
    if (!apiBaseUrl) {
      setJobState("error");
      setErrorMessage("缺少 NEXT_PUBLIC_API_BASE_URL，前端无法连接后端。");
      return false;
    }

    const { jobDescriptions, jobUrls } = parseJobSources(jobBatchInput);
    const resumePayload = buildResumePayload(resumeText, resumeFile);
    if (jobDescriptions.length === 0 && jobUrls.length === 0) {
      setJobState("error");
      setErrorMessage("请粘贴至少一个 JD 文本，或输入至少一个 JD 链接。");
      return false;
    }

    setJobState("loading");
    setStatusMessage("");
    setErrorMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/resume/jobs/standardize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobDescriptions,
          jobUrls,
          ...(resumePayload
            ? {
                resume: resumePayload,
                answers,
              }
            : {}),
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          message?: string | string[];
        } | null;
        const message = Array.isArray(errorBody?.message)
          ? errorBody.message.join("；")
          : errorBody?.message;
        throw new Error(message || `JD 标准化失败：${response.status}`);
      }

      const payload = (await response.json()) as JobStandardizeResponse;
      const bestJob = findBestReadyJob(payload);

      setJobResponse(payload);
      setJobState("success");
      if (bestJob) {
        handleUseStandardizedJob(bestJob, { silent: true });
      }
      setStatusMessage(
        `已处理 ${payload.summary.total} 个 JD 来源，可用 ${payload.summary.ready} 个${
          bestJob ? `，已自动选择 ${bestJob.roleTitle}` : ""
        }。`,
      );
      return true;
    } catch (error) {
      setJobState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "JD 标准化失败",
      );
      return false;
    }
  }

  async function handleAnalyzeInputs() {
    const resumePayload = buildResumePayload(resumeText, resumeFile);
    if (!resumePayload) {
      setFactState("error");
      setErrorMessage("请先填写简历文本，或上传 PDF / DOCX / TXT 文件。");
      return false;
    }

    if (!hasJobMaterial) {
      setJobState("error");
      setErrorMessage("请先填写目标 JD，或粘贴至少一个 JD 文本 / 链接。");
      return false;
    }

    const [factsReady, jobsReady] = await Promise.all([
      handleExtractFacts(),
      hasJobSources ? handleStandardizeJobs() : Promise.resolve(true),
    ]);

    if (factsReady && jobsReady) {
      setStatusMessage(
        hasJobSources
          ? "材料和 JD 已完成分析，可以生成定制简历。"
          : "简历事实库已完成分析，可以生成定制简历。",
      );
    }

    return factsReady && jobsReady;
  }

  async function handleGenerateResume() {
    if (!apiBaseUrl) {
      setRequestState("error");
      setErrorMessage("缺少 NEXT_PUBLIC_API_BASE_URL，前端无法连接后端。");
      return;
    }

    const resumePayload = buildResumePayload(resumeText, resumeFile);
    if (!resumePayload) {
      setRequestState("error");
      setErrorMessage("请先填写简历文本，或上传 PDF / DOCX / TXT 文件。");
      return;
    }

    if (!jobDescription.trim()) {
      setRequestState("error");
      setErrorMessage("请先选择或填写目标 JD。");
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
          resume: resumePayload,
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
      const initialDecisions = buildInitialSuggestionDecisions(
        payload.rewrite.rewrittenExperienceBullets,
      );
      const initialEdits = buildInitialSuggestionEdits(
        payload.rewrite.rewrittenExperienceBullets,
      );
      setResult(payload);
      setSuggestionDecisions(initialDecisions);
      setSuggestionEdits(initialEdits);
      setEditableDraft(
        buildDraftFromSuggestions(payload, initialDecisions, initialEdits),
      );
      setConfirmedAt(null);
      setActivePanel("analysis");
      setRequestState("success");
    } catch (error) {
      setRequestState("error");
      setErrorMessage(error instanceof Error ? error.message : "请求失败");
    }
  }

  async function handlePrimaryWorkflowAction() {
    if (!isAnalysisReady) {
      await handleAnalyzeInputs();
      return;
    }

    await handleGenerateResume();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handlePrimaryWorkflowAction();
  }

  function handleFillSampleData() {
    setResumeText(sampleResume);
    setJobDescription(sampleJd);
    setJobBatchInput(sampleJobBatchInput);
    setAnswers("");
    setResumeFile(null);
    setFactResponse(null);
    setFactState("idle");
    setJobResponse(null);
    setJobState("idle");
    setSelectedJob(null);
    setResult(null);
    setEditableDraft("");
    setSuggestionDecisions({});
    setSuggestionEdits({});
    setCurrentVersionId(null);
    setConfirmedAt(null);
    setActivePanel("analysis");
    setStatusMessage("");
    setErrorMessage("");
    setRequestState("idle");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleClearPersonalData() {
    setResumeText("");
    setJobDescription("");
    setJobBatchInput("");
    setAnswers("");
    setResumeFile(null);
    setFactResponse(null);
    setFactState("idle");
    setJobResponse(null);
    setJobState("idle");
    setSelectedJob(null);
    setResult(null);
    setEditableDraft("");
    setSuggestionDecisions({});
    setSuggestionEdits({});
    setCurrentVersionId(null);
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
    saveCurrentVersion();
    setConfirmedAt(new Date().toLocaleString("zh-CN"));
    setActivePanel("review");
    setStatusMessage("最终稿已确认并保存为当前版本，可以导出。");
  }

  function handleUseQuestion(question: string) {
    setAnswers((current) => {
      const nextLine = `待补充：${question}`;
      return current.trim() ? `${current.trim()}\n${nextLine}` : nextLine;
    });
    resetFactBase();
    setStatusMessage("追问已加入补充信息区，补充事实后可重新生成。");
  }

  function handleUseStandardizedJob(
    job: StandardizedJob,
    options: { silent?: boolean } = {},
  ) {
    const nextJobDescription = job.normalizedText || job.rawText;
    if (
      !nextJobDescription.trim() ||
      job.status !== "ready" ||
      job.filterStatus === "blocked"
    ) {
      return;
    }

    setJobDescription(nextJobDescription);
    setSelectedJob({
      id: job.id,
      roleTitle: job.roleTitle,
      company: job.company,
      priorityRank: job.priorityRank,
      score: job.match?.score,
      level: job.match?.level,
      filterStatus: job.filterStatus,
    });
    resetGeneratedResume();
    if (!options.silent) {
      setStatusMessage(
        `已选择 ${job.roleTitle}${job.company ? `｜${job.company}` : ""} 作为目标 JD。`,
      );
    }
    setErrorMessage("");
  }

  function applySuggestionState(
    nextDecisions: Record<string, RewriteDecision>,
    nextEdits: Record<string, string>,
  ) {
    setSuggestionDecisions(nextDecisions);
    setSuggestionEdits(nextEdits);
    setConfirmedAt(null);

    if (result) {
      setEditableDraft(buildDraftFromSuggestions(result, nextDecisions, nextEdits));
    }
  }

  function handleSuggestionDecision(
    suggestion: RewriteSuggestion,
    index: number,
    decision: RewriteDecision,
  ) {
    const key = getSuggestionKey(suggestion, index);
    const nextDecisions = {
      ...suggestionDecisions,
      [key]: decision,
    };

    applySuggestionState(nextDecisions, suggestionEdits);
    setStatusMessage(rewriteDecisionLabel[decision]);
  }

  function handleSuggestionEdit(
    suggestion: RewriteSuggestion,
    index: number,
    value: string,
  ) {
    const key = getSuggestionKey(suggestion, index);
    const nextDecisions = {
      ...suggestionDecisions,
      [key]: "accepted" as RewriteDecision,
    };
    const nextEdits = {
      ...suggestionEdits,
      [key]: value,
    };

    applySuggestionState(nextDecisions, nextEdits);
  }

  function handleResetDraft() {
    if (!result) {
      return;
    }

    const nextDecisions = buildInitialSuggestionDecisions(
      result.rewrite.rewrittenExperienceBullets,
    );
    const nextEdits = buildInitialSuggestionEdits(
      result.rewrite.rewrittenExperienceBullets,
    );

    applySuggestionState(nextDecisions, nextEdits);
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
      const record = saveCurrentVersion("docx");

      downloadBlob(blob, buildFileName("docx", result?.rewrite.targetRole));
      setStatusMessage(
        record
          ? `DOCX 已生成，并关联到版本 ${record.id.slice(0, 8)}。`
          : "DOCX 已生成。",
      );
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

    const record = saveCurrentVersion("pdf");

    printWindow.document.write(buildPrintDocument(editableDraft));
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => {
      printWindow.print();
      setExportState("idle");
      setStatusMessage(
        record
          ? `PDF 打印窗口已打开，并关联到版本 ${record.id.slice(0, 8)}。`
          : "PDF 打印窗口已打开。",
      );
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
              onClick={handleFillSampleData}
              type="button"
            >
              填入样例
            </button>
          </div>

          <div className="workbench-action-bar" aria-label="工作台主操作">
            <div className="action-copy">
              <p className="eyebrow">{primaryActionPhase}</p>
              <strong>{primaryActionTitle}</strong>
              <span>{primaryActionHelper}</span>
              <div className="action-checklist" aria-label="准备状态">
                <span className={hasResumeMaterial ? "ready" : ""}>简历</span>
                <span className={hasJobMaterial ? "ready" : ""}>JD</span>
                <span className={factResponse ? "ready" : ""}>事实库</span>
                <span className={jobResponse || selectedJob ? "ready" : ""}>
                  匹配
                </span>
              </div>
            </div>
            <div className="action-bar-buttons">
              <button
                className="primary-button"
                disabled={!canUsePrimaryAction}
                type="submit"
              >
                {primaryActionLabel}
              </button>
              <button
                className="text-button danger-link"
                onClick={handleClearPersonalData}
                type="button"
              >
                清除
              </button>
            </div>
          </div>

          {requestState === "error" ||
          factState === "error" ||
          jobState === "error" ? (
            <p className="error-message">{errorMessage}</p>
          ) : null}
          {statusMessage ? <p className="status-message">{statusMessage}</p> : null}

          <label className="field resume-text-field">
            <span>简历文本</span>
            <textarea
              value={resumeText}
              onChange={(event) => {
                setResumeText(event.target.value);
                resetFactBase();
              }}
              rows={6}
            />
          </label>

          <label className="file-field">
            <span>优先上传 PDF / DOCX / TXT 简历</span>
            <input
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />
            <small>
              {resumeFile
                ? `已选择：${resumeFile.name}`
                : "上传文件后会优先使用文件内容；文本框可作为备用输入。"}
            </small>
          </label>

          <section className="fact-base-card" aria-live="polite">
            <div className="fact-base-header">
              <div>
                <p className="eyebrow">P0 Fact Base</p>
                <h3>结构化职业事实库</h3>
                <p className="card-subcopy">
                  由主流程按钮自动生成，用来约束后续改写只引用可追溯事实。
                </p>
              </div>
            </div>

            {factResponse ? (
              <>
                <div className="fact-stat-grid">
                  <div>
                    <span>事实数</span>
                    <strong>{factResponse.factBase.totalFacts}</strong>
                  </div>
                  <div>
                    <span>来源类型</span>
                    <strong>{factResponse.factBase.sourceType}</strong>
                  </div>
                  <div>
                    <span>分组</span>
                    <strong>{visibleFactGroups.length}</strong>
                  </div>
                </div>

                {factResponse.factBase.warnings.length > 0 ? (
                  <div className="fact-warning-list">
                    {factResponse.factBase.warnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
                ) : null}

                <div className="fact-group-list">
                  {visibleFactGroups.map((group) => (
                    <article className="fact-group" key={group.category}>
                      <h4>
                        {factCategoryLabel[group.category]}
                        <span>{group.facts.length}</span>
                      </h4>
                      <div className="fact-chip-list">
                        {group.facts.slice(0, 4).map((fact) => (
                          <div className="fact-chip" key={fact.id}>
                            <strong>{fact.detail}</strong>
                            <small>
                              {fact.confidence}｜证据：{fact.evidence}
                            </small>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <p className="fact-empty">
                下一步点击“分析材料与 JD”，系统会先抽取简历事实，再进入匹配与改写。
              </p>
            )}
          </section>

          <section className="job-source-card" aria-live="polite">
            <div className="fact-base-header">
              <div>
                <p className="eyebrow">P0 JD Queue</p>
                <h3>JD 输入与标准化</h3>
                <p className="card-subcopy">
                  支持多个 JD 文本或链接；分析后会自动选择最适合优先处理的岗位。
                </p>
                <div className="jd-link-callout">
                  <span>可以直接甩 JD 链接</span>
                  <p>
                    多个链接逐行粘贴即可；如果是整段 JD 文本，用空行分隔。
                  </p>
                </div>
              </div>
            </div>

            <label className="field compact-field jd-source-field">
              <span>
                批量 JD 文本 / 链接 <strong>支持直接粘贴链接</strong>
              </span>
              <textarea
                onChange={(event) => {
                  setJobBatchInput(event.target.value);
                  setJobResponse(null);
                  setJobState("idle");
                  setSelectedJob(null);
                }}
                placeholder={`可以直接粘贴 JD 链接，例如：
https://example.com/jobs/ai-product-manager
https://example.com/jobs/growth-pm

也可以粘贴整段 JD 文本；多个 JD 用空行分隔。`}
                rows={8}
                value={jobBatchInput}
              />
            </label>

            {jobResponse ? (
              <>
                <div className="job-stat-grid">
                  <div>
                    <span>总来源</span>
                    <strong>{jobResponse.summary.total}</strong>
                  </div>
                  <div>
                    <span>可用</span>
                    <strong>{jobResponse.summary.ready}</strong>
                  </div>
                  <div>
                    <span>已排序</span>
                    <strong>{jobResponse.summary.ranked ?? 0}</strong>
                  </div>
                  <div>
                    <span>阻断</span>
                    <strong>{jobResponse.summary.blocked ?? 0}</strong>
                  </div>
                  <div>
                    <span>失败/重复</span>
                    <strong>
                      {jobResponse.summary.failed}/
                      {jobResponse.summary.duplicate}
                    </strong>
                  </div>
                </div>

                <div className="job-card-list">
                  {jobResponse.jobs.map((job) => {
                    const isSelectedJob = selectedJob?.id === job.id;
                    const canSelectJob =
                      job.status === "ready" && job.filterStatus !== "blocked";

                    return (
                    <article
                      className={`job-card${isSelectedJob ? " selected" : ""}`}
                      key={job.id}
                    >
                      <div className="job-card-head">
                        <div>
                          <div className="job-pill-row">
                            {job.priorityRank ? (
                              <span className="rank-badge">
                                #{job.priorityRank}
                              </span>
                            ) : null}
                            <span className={jobStatusClassName[job.status]}>
                              {jobStatusLabel[job.status]}
                            </span>
                            {job.filterStatus ? (
                              <span
                                className={
                                  jobFilterClassName[job.filterStatus]
                                }
                              >
                                {jobFilterLabel[job.filterStatus]}
                              </span>
                            ) : null}
                          </div>
                          <h4>{job.roleTitle}</h4>
                          <small>
                            {job.company ? `${job.company}｜` : ""}
                            {job.sourceType === "url" ? "链接来源" : "文本来源"}
                            {job.duplicateOf ? `｜重复于 ${job.duplicateOf}` : ""}
                          </small>
                        </div>
                        {isSelectedJob ? (
                          <span className="selected-chip">当前目标</span>
                        ) : canSelectJob ? (
                          <button
                            className="text-button"
                            onClick={() => handleUseStandardizedJob(job)}
                            type="button"
                          >
                            选择
                          </button>
                        ) : null}
                      </div>

                      {job.warnings.length > 0 ? (
                        <div className="job-warning-list">
                          {job.warnings.map((warning) => (
                            <p key={warning}>{warning}</p>
                          ))}
                        </div>
                      ) : null}

                      {job.status === "ready" ? (
                        <>
                          <div className="job-meta-grid">
                            <div>
                              <span>匹配分</span>
                              <strong>
                                {job.match ? job.match.score : "未计算"}
                              </strong>
                            </div>
                            <div>
                              <span>匹配等级</span>
                              <strong>{job.match?.level ?? "n/a"}</strong>
                            </div>
                            <div>
                              <span>硬门槛</span>
                              <strong>
                                {job.match
                                  ? job.match.hardRequirementResults.length
                                  : job.hardRequirements.length}
                              </strong>
                            </div>
                            <div>
                              <span>要求</span>
                              <strong>{job.requirements.length}</strong>
                            </div>
                          </div>

                          {job.match?.reasons.length ? (
                            <div className="job-reason-list">
                              {job.match.reasons.map((reason) => (
                                <p key={`${job.id}-${reason}`}>{reason}</p>
                              ))}
                            </div>
                          ) : null}

                          {job.match?.hardRequirementResults.length ? (
                            <div className="hard-requirement-list">
                              {job.match.hardRequirementResults
                                .slice(0, 4)
                                .map((item) => (
                                  <span
                                    className={`hard-status ${item.status}`}
                                    key={`${job.id}-${item.type}-${item.text}`}
                                  >
                                    {hardRequirementStatusLabel[item.status]}｜
                                    {item.type}：{item.text}
                                  </span>
                                ))}
                            </div>
                          ) : job.hardRequirements.length > 0 ? (
                            <div className="hard-requirement-list">
                              {job.hardRequirements.slice(0, 3).map((item) => (
                                <span
                                  className="hard-status partial"
                                  key={`${job.id}-${item.type}-${item.text}`}
                                >
                                  待匹配｜{item.type}：{item.text}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          <div className="keyword-row">
                            {(job.match?.matchedKeywords.length
                              ? job.match.matchedKeywords
                              : job.criticalKeywords
                            )
                              .slice(0, 8)
                              .map((keyword) => (
                                <span
                                  className="keyword matched-keyword"
                                  key={`${job.id}-matched-${keyword}`}
                                >
                                  {keyword}
                                </span>
                              ))}
                            {job.match?.missingKeywords
                              .slice(0, 8)
                              .map((keyword) => (
                                <span
                                  className="keyword missing-keyword"
                                  key={`${job.id}-missing-${keyword}`}
                                >
                                  {keyword}
                                </span>
                              ))}
                          </div>
                        </>
                      ) : null}
                    </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="fact-empty">
                这里用于把多个 JD 文本或链接先转成统一结构，再选择一个作为定制简历目标。
              </p>
            )}
          </section>

          {selectedJob ? (
            <section className="selected-job-card">
              <div>
                <p className="eyebrow">Selected Priority JD</p>
                <h3>
                  {selectedJob.priorityRank
                    ? `#${selectedJob.priorityRank}｜`
                    : ""}
                  {selectedJob.roleTitle}
                </h3>
                <p>
                  {selectedJob.company ? `${selectedJob.company}｜` : ""}
                  {selectedJob.score !== undefined
                    ? `匹配分 ${selectedJob.score}`
                    : "未计算匹配分"}
                  {selectedJob.level ? `｜${selectedJob.level}` : ""}
                </p>
              </div>
              {selectedJob.filterStatus ? (
                <span className={jobFilterClassName[selectedJob.filterStatus]}>
                  {jobFilterLabel[selectedJob.filterStatus]}
                </span>
              ) : null}
            </section>
          ) : null}

          <label className="field">
            <span>目标 JD</span>
            <textarea
              value={jobDescription}
              onChange={(event) => {
                setJobDescription(event.target.value);
                setSelectedJob(null);
                resetGeneratedResume();
              }}
              rows={10}
            />
          </label>

          <label className="field">
            <span>补充真实信息</span>
            <textarea
              value={answers}
              onChange={(event) => {
                setAnswers(event.target.value);
                resetFactBase();
              }}
              placeholder="可选：补充项目成果、指标、职责边界。"
              rows={4}
            />
          </label>

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
                  <progress value={coveragePercent} max={100} />
                  <span>
                    {result.quality.keywordCoverage.matched}/
                    {result.quality.keywordCoverage.total} 关键词
                  </span>
                </div>
                <div>
                  <p className="metric-label">事实风险</p>
                  <strong>{result.quality.factConsistency.riskLevel}</strong>
                  <progress value={riskPercent} max={100} />
                  <span>事实一致性</span>
                </div>
                <div>
                  <p className="metric-label">可读性</p>
                  <strong>{result.quality.readability.score}</strong>
                  <progress value={readabilityPercent} max={100} />
                  <span>可读性评分</span>
                </div>
              </div>

              <div className="result-chart-grid" aria-label="结果数值概览">
                <article className="chart-card">
                  <div>
                    <span>关键词缺口</span>
                    <strong>{result.analysis.missingKeywords.length}</strong>
                  </div>
                  <p>
                    已匹配 {result.analysis.matchedKeywords.length} 个，缺口优先进入追问和改写建议。
                  </p>
                </article>
                <article className="chart-card">
                  <div>
                    <span>改写纳入率</span>
                    <strong>{acceptedSuggestionPercent}%</strong>
                  </div>
                  <progress value={acceptedSuggestionPercent} max={100} />
                  <p>
                    {acceptedSuggestionCount}/{totalSuggestionCount} 条改写已纳入最终稿。
                  </p>
                </article>
                <article className="chart-card">
                  <div>
                    <span>硬门槛风险</span>
                    <strong>
                      {
                        result.analysis.requirementMappings.filter(
                          (mapping) => mapping.status === "missing",
                        ).length
                      }
                    </strong>
                  </div>
                  <p>未满足项会保留在质量检查和人工审核清单里。</p>
                </article>
              </div>

              {activePanel === "analysis" ? (
                <>
                  <div className="result-section">
                    <div className="section-title">
                      <h2>{result.rewrite.targetRole}</h2>
                    </div>
                    {selectedJob ? (
                      <p className="selected-job-note">
                        基于已选高优先级 JD：
                        {selectedJob.priorityRank
                          ? `#${selectedJob.priorityRank}｜`
                          : ""}
                        {selectedJob.roleTitle}
                        {selectedJob.score !== undefined
                          ? `｜匹配分 ${selectedJob.score}`
                          : ""}
                      </p>
                    ) : null}
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

                  {result.rewrite.sourceFacts?.length ? (
                    <div className="result-section">
                      <div className="section-title">
                        <h2>职业事实依据</h2>
                      </div>
                      <div className="source-fact-list">
                        {result.rewrite.sourceFacts.slice(0, 8).map((fact) => (
                          <article className="source-fact-card" key={fact.id}>
                            <div>
                              <span>{fact.id}</span>
                              <strong>{fact.detail}</strong>
                            </div>
                            <p>证据：{fact.evidence}</p>
                            <small>
                              {factCategoryLabel[fact.category]}｜
                              {fact.confidence}
                            </small>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}

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
                        (suggestion, index) => {
                          const key = getSuggestionKey(suggestion, index);
                          const decision =
                            suggestionDecisions[key] ??
                            (suggestion.acceptedByDefault === false
                              ? "rejected"
                              : "accepted");
                          const editedAfter =
                            suggestionEdits[key] ?? suggestion.after;

                          return (
                            <article className="comparison-card" key={key}>
                              <div>
                                <span>原文证据</span>
                                <p>{suggestion.before}</p>
                              </div>
                              <div>
                                <span>改写结果</span>
                                <textarea
                                  className="inline-suggestion-editor"
                                  onChange={(event) =>
                                    handleSuggestionEdit(
                                      suggestion,
                                      index,
                                      event.target.value,
                                    )
                                  }
                                  rows={5}
                                  value={editedAfter}
                                />
                              </div>
                              <div>
                                <div className="comparison-meta-row">
                                  <span>修改理由</span>
                                  {suggestion.riskLevel ? (
                                    <span
                                      className={
                                        rewriteRiskClassName[
                                          suggestion.riskLevel
                                        ]
                                      }
                                    >
                                      {rewriteRiskLabel[suggestion.riskLevel]}
                                    </span>
                                  ) : null}
                                </div>
                                <p>{suggestion.reason}</p>
                                {suggestion.riskReasons?.length ? (
                                  <ul className="risk-reason-list">
                                    {suggestion.riskReasons.map((reason) => (
                                      <li key={`${key}-${reason}`}>{reason}</li>
                                    ))}
                                  </ul>
                                ) : null}
                                {suggestion.sourceFactIds?.length ? (
                                  <small>
                                    引用事实：
                                    {suggestion.sourceFactIds.join("、")}
                                  </small>
                                ) : null}
                                <div className="suggestion-actions">
                                  <span
                                    className={`decision-state ${decision}`}
                                  >
                                    {rewriteDecisionLabel[decision]}
                                  </span>
                                  <button
                                    className="text-button"
                                    onClick={() =>
                                      handleSuggestionDecision(
                                        suggestion,
                                        index,
                                        decision === "accepted"
                                          ? "rejected"
                                          : "accepted",
                                      )
                                    }
                                    type="button"
                                  >
                                    {decision === "accepted" ? "排除" : "纳入"}
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        },
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
                        确认并保存版本
                      </button>
                      <button
                        className="text-button"
                        disabled={!draftChanged}
                        onClick={handleResetDraft}
                        type="button"
                      >
                        恢复 AI 草稿
                      </button>
                      <button
                        className="text-button"
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

                  <div className="result-section">
                    <div className="section-title">
                      <h2>职位—简历版本</h2>
                    </div>
                    <p className="version-privacy-note">
                      版本记录只保存在当前浏览器本地，用于 MVP 阶段回看岗位、JD、最终稿和导出关系。
                    </p>
                    <div className="version-summary-row">
                      {currentVersionId ? (
                        <span className="confirm-state">
                          当前版本：{currentVersionId.slice(0, 8)}
                        </span>
                      ) : (
                        <span className="confirm-state">
                          确认最终稿或导出后会自动保存版本。
                        </span>
                      )}
                    </div>
                    {versionRecords.length > 0 ? (
                      <div className="version-list">
                        {versionRecords.map((record) => (
                          <article className="version-card" key={record.id}>
                            <div>
                              <strong>{record.roleTitle}</strong>
                              <span>
                                {new Date(record.updatedAt).toLocaleString(
                                  "zh-CN",
                                )}
                              </span>
                            </div>
                            <p>
                              {record.company ? `${record.company}｜` : ""}
                              修改 {record.modificationSummary.total} 条，接受{" "}
                              {record.modificationSummary.accepted} 条，拒绝{" "}
                              {record.modificationSummary.rejected} 条
                            </p>
                            <small>
                              导出：
                              {record.exportedFormats.length > 0
                                ? record.exportedFormats.join(" / ")
                                : "尚未导出"}
                            </small>
                            <button
                              className="ghost-button"
                              onClick={() => handleLoadVersion(record)}
                              type="button"
                            >
                              载入版本
                            </button>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="fact-empty">
                        暂无版本。确认最终稿或导出后会自动保存。
                      </p>
                    )}
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-head">
                <p className="eyebrow">Result preview</p>
                <h2>结果会在这里生成</h2>
                <p>
                  右侧先显示当前材料准备度；生成后切换为匹配分析、质量检查和审核导出。
                </p>
              </div>

              <div className="preview-metric-grid">
                <article>
                  <span>准备度</span>
                  <strong>{readinessPercent}%</strong>
                  <progress value={readinessPercent} max={100} />
                </article>
                <article>
                  <span>简历来源</span>
                  <strong>{resumeFile ? "文件" : resumeText.trim() ? "文本" : "待补充"}</strong>
                  <small>{resumeFile?.name ?? "PDF 优先，其次使用简历文本"}</small>
                </article>
                <article>
                  <span>JD 来源</span>
                  <strong>{jdSourceCount || (jobDescription.trim() ? 1 : 0)}</strong>
                  <small>批量 JD / 目标 JD</small>
                </article>
                <article>
                  <span>事实库</span>
                  <strong>{factResponse?.factBase.totalFacts ?? 0}</strong>
                  <small>{factResponse ? "已生成" : "待分析"}</small>
                </article>
              </div>

              <div className="preview-chart-panel">
                <div className="preview-chart-row">
                  <span>材料</span>
                  <progress value={hasResumeMaterial ? 100 : 0} max={100} />
                </div>
                <div className="preview-chart-row">
                  <span>JD</span>
                  <progress
                    value={hasJobSources || hasTargetJobDescription ? 100 : 0}
                    max={100}
                  />
                </div>
                <div className="preview-chart-row">
                  <span>事实库</span>
                  <progress value={factResponse ? 100 : 0} max={100} />
                </div>
                <div className="preview-chart-row">
                  <span>版本</span>
                  <progress
                    value={versionRecords.length > 0 ? 100 : 0}
                    max={100}
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
