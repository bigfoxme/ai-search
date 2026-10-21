import type { SearchResult } from "./types";

const MOCK_RESULTS: SearchResult[] = [
  {
    rerank_score: 2.92,
    title: "DeepSeek 开放平台文档",
    url: "https://api-docs.deepseek.com/zh-cn/",
    snippet:
      "DeepSeek API 官方文档，涵盖模型能力、计费方式、上下文缓存、搜索与抓取工具调用的完整说明。",
    summary:
      "DeepSeek 开放平台提供对话补全、推理模型、函数调用以及网页搜索等能力。文档包含快速开始、模型列表、计费规则、错误码与最佳实践，适合开发者构建问答、Agent 与 RAG 应用。",
    site_name: "DeepSeek API Docs",
    site_icon: "https://api-docs.deepseek.com/img/favicon.ico",
    date: "2026-10-01T00:00:00+00:00",
    authority: 4,
  },
  {
    rerank_score: 2.74,
    title: "人工智能 - 维基百科",
    url: "https://zh.wikipedia.org/wiki/%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD",
    snippet:
      "人工智能（Artificial Intelligence，AI）是研究、开发用于模拟、延伸和扩展人类智能的理论、方法、技术及应用系统的一门技术科学。",
    summary:
      "人工智能涉及机器学习、自然语言处理、计算机视觉、知识表示与推理等方向。条目介绍了人工智能的发展历史、主要流派、典型应用以及围绕安全、伦理与就业的讨论，并给出了进一步阅读的参考条目。",
    site_name: "维基百科",
    site_icon:
      "https://zh.wikipedia.org/static/favicon/wikipedia.ico",
    date: "2026-08-12T03:20:00+00:00",
    authority: 4,
  },
  {
    rerank_score: 2.48,
    title: "2026 年人工智能行业趋势报告：从模型能力到落地场景",
    url: "https://example.com/reports/ai-trends-2026",
    snippet:
      "报告梳理了多模态模型、长上下文、推理时计算与智能体工作流的最新进展，并给出企业落地的分阶段建议。",
    summary:
      "本报告基于对 300 余家企业的调研，总结出 2026 年人工智能落地的五个关键趋势：推理模型成为默认选择、检索增强生成进入生产环境、多模态交互成为标配、智能体从演示走向流程自动化、成本与合规成为选型的核心指标。",
    site_name: "Example Research",
    site_icon: null,
    date: "2026-09-28T08:00:00+00:00",
    authority: 3,
  },
  {
    rerank_score: 2.21,
    title: "什么是大语言模型？一文读懂 Transformer 与自回归生成",
    url: "https://cloud.example.cn/blog/what-is-llm",
    snippet:
      "从分词、注意力机制到预训练与对齐，这篇文章用图解方式介绍大语言模型的核心原理，并解释了上下文窗口与温度参数的作用。",
    summary:
      "文章面向非算法背景的读者，依次介绍了 token 化、Transformer 结构、自注意力机制、预训练目标、指令微调与人类反馈强化学习。最后讨论了幻觉、提示注入和长上下文带来的挑战。",
    site_name: "Example Cloud",
    site_icon: "https://cloud.example.cn/favicon.ico",
    date: "2026-07-05T11:30:00+00:00",
    authority: 2,
  },
  {
    rerank_score: 1.96,
    title: "GitHub - awesome-ai: 人工智能学习与工程资源合集",
    url: "https://github.com/example/awesome-ai",
    snippet:
      "精选的机器学习、深度学习与大模型资源列表，包含课程、论文、工具库、数据集和工程实践指南。",
    summary:
      "仓库按主题整理了人工智能领域的优质资源：基础课程与教材、经典论文、开源框架、评测基准、提示工程指南以及生产环境部署经验。维护者欢迎通过 Pull Request 补充条目。",
    site_name: "GitHub",
    site_icon: "https://github.com/favicon.ico",
    date: null,
    authority: 3,
  },
  {
    rerank_score: 1.83,
    title: "机器之心：多模态模型最新进展与评测结果",
    url: "https://www.jiqizhixin.com/articles/2026-multimodal",
    snippet:
      "新一代多模态模型在图像理解、视频问答和文档解析上的表现持续提升，本文汇总了近期公开的评测结果。",
    summary:
      "文章对比了多个多模态模型在视觉问答、OCR、图表理解和视频时间定位任务上的表现，并分析了训练数据规模、视觉编码器设计与推理成本之间的关系。",
    site_name: "机器之心",
    site_icon: "https://www.jiqizhixin.com/favicon.ico",
    date: "2026-09-10T02:15:00+00:00",
    authority: 2,
  },
  {
    rerank_score: 1.12,
    title: "AI 工具使用心得（个人博客）",
    url: "https://blog.example.org/posts/ai-notes",
    snippet:
      "记录作者在日常写作、编程和资料整理中使用 AI 工具的一些零散经验，观点主观，仅供参考。",
    summary:
      "这是一篇个人随笔，分享了作者使用对话式 AI 完成周报、代码补全和资料摘要的体验，也提到了一些失败案例。文章没有引用系统性数据，结论以个人感受为主。",
    site_name: null,
    site_icon: null,
    date: null,
    authority: -1,
  },
  {
    rerank_score: 2.35,
    title: "arXiv: A Survey on AI Safety Evaluation",
    url: "https://arxiv.org/abs/2609.01234",
    snippet:
      "This survey reviews benchmarks and methodologies for evaluating the safety of large language models, covering robustness, bias, and alignment.",
    summary:
      "The paper categorizes safety evaluation into capability, alignment, and deployment risk dimensions. It compares 40+ benchmarks, discusses their limitations, and proposes a reporting checklist for reproducible evaluations.",
    site_name: "arXiv",
    site_icon: "https://arxiv.org/favicon.ico",
    date: "2026-09-19T00:00:00+00:00",
    authority: 4,
  },
];

/**
 * Returns fixture results for local development. `null` means "simulate an
 * upstream failure"; `__empty__` / `__error__` are magic test queries.
 */
export function mockSearch(query: string, count: number): SearchResult[] | null {
  if (query.includes("__error__")) return null;
  if (query.includes("__empty__")) return [];
  return MOCK_RESULTS.slice(0, count);
}
