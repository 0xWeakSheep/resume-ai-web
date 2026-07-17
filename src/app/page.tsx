import Link from "next/link";
import { HeroSignalCanvas } from "./hero-signal-canvas";

const principles = [
  {
    title: "先拆岗位",
    body: "把 JD 拆成职责、要求、关键词和隐含筛选点，避免只做同义词替换。",
  },
  {
    title: "只用真事实",
    body: "改写只引用原简历和补充信息。无法证明的能力进入追问，不写进最终稿。",
  },
  {
    title: "逐条可审核",
    body: "每条改写都保留原文证据、目标表达和修改理由，方便人工确认。",
  },
  {
    title: "最后做质检",
    body: "检查关键词覆盖、事实风险、可读性和格式问题，再进入导出环节。",
  },
] as const;

const productFlow = [
  "提交简历和目标 JD",
  "查看岗位要求映射",
  "回答缺口追问",
  "确认最终稿并导出",
] as const;

export default function Home() {
  return (
    <main className="home-shell">
      <header className="home-nav">
        <Link className="home-brand" href="/">
          Resume AI
        </Link>
        <nav aria-label="首页导航">
          <a href="#principle">原理</a>
          <a href="#workflow">流程</a>
          <Link href="/workbench">工作台</Link>
        </nav>
      </header>

      <section className="home-hero">
        <HeroSignalCanvas />
        <div className="home-hero-content">
          <p className="home-label">JD 定向简历改写</p>
          <h1>把简历改成回应岗位的版本</h1>
          <p>
            拆解岗位要求，守住真实经历，生成可审核、可编辑、可导出的定制简历。
          </p>
          <div className="home-actions">
            <Link className="home-primary" href="/workbench">
              开始体验
            </Link>
            <a className="home-secondary" href="#principle">
              看原理
            </a>
          </div>
        </div>
      </section>

      <section className="principle-section" id="principle">
        <div className="section-copy">
          <h2>不是润色，是岗位映射。</h2>
          <p>
            产品先判断岗位真正要什么，再判断你的材料能证明什么。生成结果默认可被追问、审查和回退。
          </p>
        </div>
        <div className="principle-grid">
          {principles.map((item) => (
            <article className="principle-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-section" id="workflow">
        <div className="workflow-panel">
          <div>
            <h2>一条可跑通的 MVP 链路</h2>
            <p>
              当前版本先把核心业务闭环跑通：提交材料、获得分析、补充真实信息、确认并导出。
            </p>
          </div>
          <ol>
            {productFlow.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <Link className="home-primary" href="/workbench">
            打开工作台
          </Link>
        </div>
      </section>

      <footer className="home-footer">
        <span>Resume AI</span>
        <span>真实经历，岗位映射，人工可审。</span>
      </footer>
    </main>
  );
}
