import { isSafeDownloadUrl } from "@/lib/url-utils";
import type { CompletedTask } from "@/types";

interface TaskHistoryProps {
  tasks: readonly CompletedTask[];
}

/**
 * Displays a list of previously completed crawl tasks with download links.
 * Renders nothing when the list is empty.
 */
export function TaskHistory({ tasks }: TaskHistoryProps) {
  if (tasks.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 text-slate-400"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
            clipRule="evenodd"
          />
        </svg>
        历史任务
      </h2>
      <ul className="divide-y divide-slate-100">
        {tasks.toReversed().map((task) => (
          <li
            key={task.taskId}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm text-slate-700">
                {task.url}
              </span>
              <time
                dateTime={task.completedAt.toISOString()}
                className="text-xs text-slate-400"
              >
                {task.completedAt.toLocaleTimeString()}
              </time>
            </div>
            {isSafeDownloadUrl(task.downloadUrl) && (
              <a
                href={task.downloadUrl}
                download
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors duration-200 hover:bg-emerald-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
                  <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
                </svg>
                下载
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
