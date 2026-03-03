# Full Doc to Markdown

A web application that crawls an entire documentation site starting from a single URL and outputs a complete, merged Markdown document — perfect for feeding into LLMs.

## Features

- **Recursive crawling**: Follows all internal links from a starting URL
- **Smart URL filtering**: Auto-detects the doc base path; only crawls relevant pages
- **Two-phase fetching**: Uses `httpx` for static sites; falls back to Playwright for SPA/JS-rendered docs
- **Clean conversion**: Strips navigation, headers, and footers; converts HTML to Markdown
- **Real-time progress**: Server-Sent Events (SSE) show live crawl progress
- **Merged output**: All pages combined into one Markdown file with a table of contents

## Tech Stack

| Layer    | Technology                             |
|----------|----------------------------------------|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Backend  | Python + FastAPI                       |
| Crawling | httpx + Playwright (fallback)          |
| HTML→MD  | markdownify + BeautifulSoup            |
| Progress | Server-Sent Events (SSE)               |

## Setup

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.11
- [uv](https://docs.astral.sh/uv/) (Python package manager)

### Backend

```bash
cd backend

# Install dependencies
uv sync

# Install Playwright browser (for SPA sites)
uv run playwright install chromium

# Start the server
uv run uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Paste any documentation URL into the input box (e.g. `https://docs.anthropic.com/en/docs/claude-code/overview`)
2. (Optional) Adjust max pages, depth, or path prefix in the advanced settings
3. Click **Start Crawling**
4. Watch real-time progress as pages are discovered and crawled
5. When complete, download or preview the merged Markdown file

## Running Tests

```bash
# Backend (165 tests, 90% coverage)
cd backend && uv run pytest

# Frontend (73 tests, 98% statement coverage)
cd frontend && npm test
```

## Project Structure

```
full-doc-to-md/
├── backend/
│   ├── api/          # FastAPI routes and Pydantic models
│   ├── crawler/      # URL filter, link extractor, page fetcher, engine
│   ├── converter/    # HTML cleaner and Markdown converter
│   ├── merger/       # Page sorting and document merging
│   ├── task/         # Task lifecycle management and SSE progress
│   ├── tests/        # pytest test suite
│   └── main.py       # FastAPI app entry point
└── frontend/
    ├── app/          # Next.js App Router pages
    ├── components/   # UI components
    ├── hooks/        # React hooks (task management, SSE)
    ├── lib/          # API client and constants
    ├── types/        # TypeScript type definitions
    └── __tests__/    # Jest test suite
```
