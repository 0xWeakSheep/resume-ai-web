import Link from "next/link";
import { HeroSignalCanvas } from "./hero-signal-canvas";
import styles from "./home.module.css";

const principles = [
  {
    index: "01",
    title: "先拆岗位，再动笔",
    body: "把 JD 拆成职责、硬性要求、关键词和隐含筛选信号。先弄清楚岗位真正要什么，而不是先做同义词替换。",
  },
  {
    index: "02",
    title: "只引用可证明的事实",
    body: "改写只来自你的原简历和补充回答。无法证明的能力进入追问列表，绝不会被写进最终稿。",
  },
  {
    index: "03",
    title: "每条改写都可追溯",
    body: "每一处调整都保留原文证据、目标表达和修改理由。你可以逐条确认、追问或回退。",
  },
  {
    index: "04",
    title: "导出前过一遍质检",
    body: "检查关键词覆盖、事实风险、可读性与格式问题，确认无误后再导出为可投递的文件。",
  },
] as const;

const productFlow = [
  {
    step: "第 1 步",
    title: "提交简历与目标 JD",
    body: "粘贴或上传现有简历，填入目标岗位描述。",
  },
  {
    step: "第 2 步",
    title: "查看岗位要求映射",
    body: "看到每条要求与你有的事实之间的对应关系和缺口。",
  },
  {
    step: "第 3 步",
    title: "回答缺口追问",
    body: "只补充真实发生过的细节，系统据此补全证据链。",
  },
  {
    step: "第 4 步",
    title: "确认终稿并导出",
    body: "逐条审核改写记录，确认后导出定制简历。",
  },
] as const;

const trustPoints = [
  "不虚构任何经历",
  "每条改写附原文证据",
  "导出前由你人工确认",
] as const;

export default function Home() {
  return (
    <main className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">
        跳到主要内容
      </a>

      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Link className={styles.brand} href="/">
            <span className={styles.brandMark} aria-hidden="true" />
            Resume AI
          </Link>
          <nav className={styles.navLinks} aria-label="首页导航">
            <a className={styles.navLink} href="#principle">
              原理
            </a>
            <a className={styles.navLink} href="#workflow">
              流程
            </a>
            <Link className={styles.navCta} href="/workbench">
              进入工作台
            </Link>
          </nav>
        </div>
      </header>

      <div id="main-content">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCanvas} aria-hidden="true">
            <HeroSignalCanvas />
            <div className={styles.canvasLegend}>
              <span>
                <i className={styles.legendFact} />
                职业事实节点
              </span>
              <span>
                <i className={styles.legendSignal} />
                JD 需求信号
              </span>
              <span>
                <i className={styles.legendMatch} />
                匹配路径
              </span>
            </div>
          </div>
          <div className={styles.heroVeil} aria-hidden="true" />

          <div className={styles.heroInner}>
            <div className={styles.heroContent}>
              <p className={styles.heroLabel}>JD 定向简历改写 · 事实驱动</p>
              <h1 className={styles.heroTitle} id="hero-title">
                把真实经历，
                <br />
                映射成岗位
                <span className={styles.heroTitleAccent}>要的答案。</span>
              </h1>
              <p className={styles.heroLede}>
                Resume AI 拆解目标 JD 的职责与筛选信号，只引用你可以证明的经历，
                生成逐条可追溯、可审核、可导出的定制简历。
              </p>
              <div className={styles.actions}>
                <Link className={styles.primaryBtn} href="/workbench">
                  进入工作台
                  <span className={styles.btnArrow} aria-hidden="true">
                    →
                  </span>
                </Link>
                <a className={styles.ghostBtn} href="#principle">
                  了解工作原理
                </a>
              </div>
              <ul className={styles.trustRow}>
                {trustPoints.map((point) => (
                  <li className={styles.trustItem} key={point}>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section
          className={styles.principleSection}
          id="principle"
          aria-labelledby="principle-title"
        >
          <div className={styles.sectionHead}>
            <p className={styles.sectionIndex}>原理 / Principles</p>
            <h2 className={styles.sectionTitle} id="principle-title">
              不是润色，
              <br />
              是岗位映射。
            </h2>
            <p className={styles.sectionLede}>
              产品先判断岗位真正要什么，再判断你的材料能证明什么。
              生成结果默认可被追问、审查和回退。
            </p>
          </div>
          <div className={styles.principleList}>
            {principles.map((item) => (
              <article className={styles.principleItem} key={item.index}>
                <span className={styles.principleNo} aria-hidden="true">
                  {item.index}
                </span>
                <div className={styles.principleBody}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          className={styles.workflowSection}
          id="workflow"
          aria-labelledby="workflow-title"
        >
          <div className={styles.workflowInner}>
            <div className={styles.sectionHead}>
              <p className={styles.sectionIndex}>流程 / Workflow</p>
              <h2 className={styles.sectionTitle} id="workflow-title">
                四步，从简历到终稿。
              </h2>
              <p className={styles.sectionLede}>
                当前版本先把核心业务闭环跑通：提交材料、获得分析、
                补充真实信息、确认并导出。
              </p>
              <Link className={styles.primaryBtn} href="/workbench">
                打开工作台
                <span className={styles.btnArrow} aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
            <ol className={styles.stepList}>
              {productFlow.map((item) => (
                <li className={styles.stepItem} key={item.step}>
                  <span className={styles.stepNo}>{item.step}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.closingSection} aria-labelledby="closing-title">
          <p className={styles.sectionIndex}>开始 / Start</p>
          <h2 className={styles.closingTitle} id="closing-title">
            下一次投递，用证据说话。
          </h2>
          <Link className={styles.primaryBtn} href="/workbench">
            免费进入工作台
            <span className={styles.btnArrow} aria-hidden="true">
              →
            </span>
          </Link>
        </section>
      </div>

      <footer className={styles.footer}>
        <span className={styles.footerBrand}>Resume AI</span>
        <span>真实经历 · 岗位映射 · 人工可审</span>
        <Link className={styles.footerLink} href="/workbench">
          工作台
        </Link>
      </footer>
    </main>
  );
}
