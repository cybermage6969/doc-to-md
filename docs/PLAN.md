# 计划：智能 URL 过滤 — 只爬取相关文档链接

## 背景

爬虫目前会从整个 HTML 页面提取所有 `<a>` 标签 — 包括 footer、header 和全站导航中的链接。这导致爬虫跟踪了大量不相关的链接（博客、更新日志、定价页、其他产品文档），污染了输出结果。此外，路径前缀推断过于宽泛：从 `/docs/claude-code/overview` 出发，推断出的前缀仅为 `/docs`，导致所有文档分区都会被爬取，而不仅仅是 claude-code 部分。

## 三层方案

### Layer 1：内容区域链接提取（影响最大）

**问题**：`LinkExtractor.extract()` 从整个 HTML 页面提取链接，包括 `<footer>` 和 `<header>` 中的。

**方案**：在提取链接之前，先从解析后的 HTML 中移除 `<header>` 和 `<footer>` 元素。这与已有的 `ContentCleaner.NOISE_TAGS` 模式一致（Markdown 转换时已经移除了这些元素）。

**关键设计决策**：保留独立的 `<nav>` 元素（文档侧边栏使用 `<nav>` 作为目录导航）。只移除嵌套在 `<header>` 或 `<footer>` 内的 `<nav>`（随父元素一起被移除）。

**涉及文件**：
- `backend/crawler/link_extractor.py` — 在 `__init__` 添加 `exclude_containers` 参数，在 `extract()` 的 `find_all("a")` 循环之前 decompose 排除的容器
- `backend/tests/test_link_extractor.py` — 新增 footer/header 排除测试、nav 保留测试

### Layer 2：更严格的路径前缀（中等影响）

**问题**：`_infer_base_prefix()` 在第一个 DOC_SEGMENT 处就停止了。`/docs/claude-code/overview` → 前缀 = `/docs`，允许所有文档。

**方案**：当 DOC_SEGMENT 之后有 2 个以上的路径段时，将第一个子段也纳入前缀。

```
/docs/claude-code/overview          → /docs/claude-code  (docs 之后有 2 段)
/docs/claude-code/start/install     → /docs/claude-code  (docs 之后有 3 段)
/docs/overview                      → /docs              (docs 之后仅 1 段，不变)
/docs                               → /docs              (docs 之后无段，不变)
```

**涉及文件**：
- `backend/crawler/url_filter.py` — 修改 `_infer_base_prefix()`：检查 `remaining = path_segments[i+1:]`，若 `len(remaining) >= 2` 则使用 `path_segments[:i+2]`
- `backend/tests/test_url_filter.py` — 新增更严格前缀的测试；所有现有测试保持通过（它们在 DOC_SEGMENT 之后都只有 ≤1 个段）

### Layer 3：用户可配置的范围路径（全栈）

**问题**：自动检测无法覆盖所有场景。高级用户需要显式控制。

**方案**：添加可选的 `scope_path` 参数（如 `/docs/claude-code`），设置后会覆盖自动检测。

**涉及文件**（后端）：
- `backend/api/models.py` — 在 `CreateTaskRequest` 中添加 `scope_path: str | None = None`
- `backend/crawler/url_filter.py` — `__init__` 接受 `scope_path`，提供时跳过 `_infer_base_prefix`
- `backend/crawler/engine.py` — 将 `scope_path` 从 `CrawlEngine.__init__` 传递到 `UrlFilter(start_url, scope_path=)`
- `backend/task/manager.py` — 在 `CrawlTask` dataclass 添加 `scope_path` 字段，在 `update_status()` 和 `set_result()` 中保留
- `backend/api/routes.py` — 将 `scope_path` 从 request → `create_task()` → `CrawlEngine()` 传递
- `backend/tests/test_url_filter.py` — scope_path 覆盖的测试
- `backend/tests/test_api_routes.py` — 请求体中 scope_path 的测试

**涉及文件**（前端）：
- `frontend/types/index.ts` — 在 `CreateTaskRequest` 中添加 `scope_path?: string`
- `frontend/components/url-input-form.tsx` — 添加可折叠的「高级选项」区域，含 scope path 输入框；更新 `onSubmit` 签名为 `(url, maxPages, scopePath?)`
- `frontend/hooks/use-crawl-task.ts` — 更新 `startCrawl` 接受并传递 `scopePath`
- `frontend/app/page.tsx` — 透传 `scopePath`
- `frontend/__tests__/components/url-input-form.test.tsx` — 测试高级选项 UI
- `frontend/__tests__/app/page.test.tsx` — 测试 scope_path 流转

## 实施顺序

1. **Phase 1：Layer 1**（仅后端，TDD）
   - 编写 footer/header 链接排除测试（RED）
   - 在 `LinkExtractor` 中实现容器 decompose（GREEN）
   - 验证所有现有链接提取器测试通过

2. **Phase 2：Layer 2**（仅后端，TDD）
   - 编写更严格前缀的测试（RED）
   - 修改 `_infer_base_prefix()`（GREEN）
   - 验证所有现有 URL 过滤器测试通过

3. **Phase 3：Layer 3**（全栈，TDD）
   - 后端：添加 scope_path 到 models、filter、engine、manager、routes + 测试
   - 前端：添加类型、表单字段、hook 更新、页面更新 + 测试

## 验证

1. 运行 `uv run pytest` — 所有后端测试通过
2. 运行 `npx jest` — 所有前端测试通过
3. 手动 E2E 测试：启动两个服务器，爬取 `https://docs.anthropic.com/en/docs/claude-code/overview`，验证：
   - 没有跟踪 footer/header 中的链接
   - 只爬取了 `/en/docs/claude-code/*` 页面（不包括 `/en/docs/agents/*` 等）
   - 可选：设置 scope_path 为 `/en/docs/claude-code` 并验证行为
