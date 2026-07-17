const workflow = [
  {
    title: "提交真实材料",
    description: "上传现有简历并粘贴目标 JD，保留你的真实经历和表达边界。",
  },
  {
    title: "识别岗位重点",
    description: "拆解职责、能力与关键词，找出简历和岗位之间最需要补强的部分。",
  },
  {
    title: "确认后再导出",
    description: "逐条查看修改依据，保留、调整或撤销内容，再导出最终版本。",
  },
] as const;

const improvements = [
  "把项目结果前置，减少职责流水账",
  "补齐 JD 中明确要求的关键词",
  "不虚构经历，不擅自扩大成果",
] as const;

export default function Home() {
  return (
    <main>
      <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
        <a className="text-lg font-semibold tracking-tight" href="#top">
          Resume AI
        </a>
        <a className="nav-link" href="#how-it-works">
          工作方式
        </a>
      </nav>

      <section
        id="top"
        className="mx-auto grid min-h-[calc(100dvh-4.5rem)] max-w-7xl items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:py-16"
      >
        <div className="max-w-2xl">
          <p className="mb-5 font-mono text-xs font-medium tracking-[0.16em] text-accent uppercase">
            针对目标岗位修改简历
          </p>
          <h1 className="text-5xl leading-[1.05] font-semibold tracking-[-0.055em] text-balance sm:text-6xl lg:text-7xl">
            每一份简历，都回应具体岗位。
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
            对照 JD 找出差距，保留真实经历，给出可解释、可编辑的修改建议。
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a className="button-primary" href="#how-it-works">
              查看流程
            </a>
            <a className="button-secondary" href="mailto:hello@resume-ai.dev">
              加入内测
            </a>
          </div>
        </div>

        <div className="product-preview" aria-label="简历与岗位匹配结果示例">
          <div className="preview-toolbar">
            <span>产品经理 · AI 应用</span>
            <span className="font-mono text-xs">匹配分析</span>
          </div>
          <div className="grid gap-0 md:grid-cols-[1.15fr_0.85fr]">
            <article className="resume-sheet">
              <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xl font-semibold">林知远</p>
                  <p className="mt-1 text-sm text-muted">产品经理</p>
                </div>
                <p className="font-mono text-[11px] text-muted">2 页简历</p>
              </div>
              <p className="resume-heading">项目经历</p>
              <div className="mt-4 border-l-2 border-accent pl-4">
                <p className="text-sm font-semibold">智能客服工作台</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  负责需求分析与版本规划，推动客服、算法和研发团队共同交付。
                </p>
                <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-sm leading-6">
                  将知识库检索命中率提升至可用标准，试点团队平均处理时间下降。
                </p>
              </div>
              <p className="resume-heading mt-8">核心能力</p>
              <p className="mt-4 text-sm leading-7 text-muted">
                用户研究 / 需求拆解 / AI 产品设计 / 跨团队协作
              </p>
            </article>

            <aside className="analysis-panel">
              <p className="text-sm font-semibold">建议优先处理</p>
              <div className="mt-5 space-y-5">
                {improvements.map((item, index) => (
                  <div className="flex gap-3" key={item}>
                    <span className="index-number">{index + 1}</span>
                    <p className="text-sm leading-6 text-muted">{item}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 border-t border-line pt-5">
                <p className="font-mono text-xs text-muted">修改原则</p>
                <p className="mt-2 text-sm leading-6">
                  每条建议都附带依据，最终内容由你确认。
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto max-w-7xl scroll-mt-8 px-5 py-24 sm:px-8 lg:py-32"
      >
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
          从岗位要求，到可以投递的版本。
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
          一次处理一份目标岗位，修改过程透明，原始简历始终保留。
        </p>
        <div className="mt-14 grid gap-10 border-t border-line pt-10 md:grid-cols-[1.2fr_1fr_0.9fr] md:gap-14">
          {workflow.map((item) => (
            <article key={item.title}>
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="mt-3 max-w-sm leading-7 text-muted">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8 lg:pb-32">
        <div className="cta-panel">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              先把第一份简历改对。
            </h2>
            <p className="mt-3 max-w-xl leading-7 text-muted-on-accent">
              产品正在搭建中。加入内测，获取首批试用资格。
            </p>
          </div>
          <a className="button-on-accent" href="mailto:hello@resume-ai.dev">
            加入内测
          </a>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Resume AI</p>
          <p>真实经历，针对岗位，修改有据。</p>
        </div>
      </footer>
    </main>
  );
}
