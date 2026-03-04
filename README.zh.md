# deepcrawl2md

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

[English](README.md)

将整个文档站点爬取为单个 Markdown 文件 — 专为 LLM 输入优化。

粘贴一个 URL，点击开始，即可获得一份带目录的完整 Markdown 文档。对于大型站点，输出会自动按约 80K tokens 分块，每个文件都能放进 LLM 的上下文窗口。

## 特性

- **递归爬取** — 从起始 URL 自动跟踪所有内部链接
- **智能范围限定** — 自动检测文档基础路径，只爬取相关页面（可配置）
- **内容区域提取** — 在链接发现前剥离导航栏、页头和页脚
- **两阶段抓取** — 静态站点使用 `httpx`，SPA/JS 渲染的文档自动回退到 Playwright
- **干净转换** — 通过 BeautifulSoup + markdownify 将 HTML 转为 Markdown
- **实时进度** — 基于 Server-Sent Events (SSE) 的实时爬取状态
- **Token 感知输出** — 单个 `.md` 文件 + 按约 80K tokens 分块的 `.zip`
- **中英双语 UI** — 根据浏览器语言自动检测，支持运行时切换
- **任务历史** — 已完成的爬取任务在会话内保持可访问

## 技术栈

| 层级    | 技术                             |
|---------|----------------------------------------|
| 前端 | Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 |
| 后端  | Python 3.11+ + FastAPI                 |
| 爬取 | httpx + Playwright（回退）          |
| HTML 转 MD | markdownify + BeautifulSoup          |
| 进度推送 | Server-Sent Events (SSE)               |
| 国际化     | React Context + TypeScript 字典  |

## 快速开始

### 前置要求

- Node.js >= 18
- Python >= 3.11
- [uv](https://docs.astral.sh/uv/)（Python 包管理器）

### 后端

```bash
cd backend
uv sync
uv run playwright install chromium
uv run uvicorn main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 使用方法

1. 粘贴一个文档 URL（例如 `https://docs.anthropic.com/en/docs/claude-code/overview`）
2. 可选：调整最大页数或在高级选项中设置范围路径
3. 点击 **开始抓取**
4. 查看实时进度
5. 下载合并后的 `.md` 或分块 `.zip`

## 运行测试

```bash
# 后端（228 个测试）
cd backend && uv run pytest

# 前端（135 个测试）
cd frontend && npm test
```

## 项目结构

```
deepcrawl2md/
├── backend/
│   ├── api/          # FastAPI 路由和 Pydantic 模型
│   ├── crawler/      # URL 过滤、链接提取、页面抓取、引擎
│   ├── converter/    # HTML 清洗和 Markdown 转换
│   ├── merger/       # 页面排序和文档合并
│   ├── task/         # 任务生命周期管理和 SSE 进度
│   ├── tests/        # pytest 测试套件
│   └── main.py       # FastAPI 入口
├── frontend/
│   ├── app/          # Next.js App Router 页面
│   ├── components/   # UI 组件
│   ├── hooks/        # React hooks（任务管理、SSE）
│   ├── i18n/         # 国际化（中/英）
│   ├── lib/          # API 客户端和工具函数
│   ├── types/        # TypeScript 类型定义
│   └── __tests__/    # Jest 测试套件
└── docs/             # 项目文档
```

## 许可证

本项目采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 许可证。
你可以在**非商业目的**下使用、分享和修改，但须注明出处。
