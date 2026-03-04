# deepcrawl2md

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

[中文文档](README.zh.md)

Crawl entire documentation sites into a single Markdown file — optimized for feeding into LLMs.

Paste a URL, click start, and get a clean, merged Markdown document with a table of contents. For large sites, the output is automatically chunked into ~80K-token parts so each file fits within an LLM's context window.

## Features

- **Recursive crawling** — follows all internal links from a starting URL
- **Smart URL scoping** — auto-detects the doc base path; only crawls relevant pages (configurable)
- **Content-area extraction** — strips navigation, headers, and footers before link discovery
- **Two-phase fetching** — `httpx` for static sites; Playwright fallback for SPA/JS-rendered docs
- **Clean conversion** — HTML to Markdown via BeautifulSoup + markdownify
- **Real-time progress** — Server-Sent Events (SSE) with live crawl status
- **Token-aware output** — single `.md` file + split `.zip` chunked by ~80K tokens
- **Bilingual UI** — Chinese / English, auto-detected from browser language, switchable at runtime
- **Task history** — completed crawls remain accessible within the session

## Tech Stack

| Layer    | Technology                             |
|----------|----------------------------------------|
| Frontend | Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 |
| Backend  | Python 3.11+ + FastAPI                 |
| Crawling | httpx + Playwright (fallback)          |
| HTML to MD | markdownify + BeautifulSoup          |
| Progress | Server-Sent Events (SSE)               |
| i18n     | React Context + TypeScript dictionary  |

## Quick Start

### Prerequisites

- Node.js >= 18
- Python >= 3.11
- [uv](https://docs.astral.sh/uv/) (Python package manager)

### Backend

```bash
cd backend
uv sync
uv run playwright install chromium
uv run uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. Paste a documentation URL (e.g. `https://docs.anthropic.com/en/docs/claude-code/overview`)
2. Optionally adjust max pages or set a scope path in advanced options
3. Click **Start crawling**
4. Watch real-time progress
5. Download the merged `.md` or split `.zip`

## Running Tests

```bash
# Backend (228 tests)
cd backend && uv run pytest

# Frontend (135 tests)
cd frontend && npm test
```

## Project Structure

```
deepcrawl2md/
├── backend/
│   ├── api/          # FastAPI routes and Pydantic models
│   ├── crawler/      # URL filter, link extractor, page fetcher, engine
│   ├── converter/    # HTML cleaner and Markdown converter
│   ├── merger/       # Page sorting and document merging
│   ├── task/         # Task lifecycle management and SSE progress
│   ├── tests/        # pytest test suite
│   └── main.py       # FastAPI entry point
├── frontend/
│   ├── app/          # Next.js App Router pages
│   ├── components/   # UI components
│   ├── hooks/        # React hooks (task management, SSE)
│   ├── i18n/         # Internationalization (zh/en)
│   ├── lib/          # API client and utilities
│   ├── types/        # TypeScript type definitions
│   └── __tests__/    # Jest test suite
└── docs/             # Project documentation
```

## License

This project is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
You may use, share, and adapt it for **non-commercial purposes** with attribution.
