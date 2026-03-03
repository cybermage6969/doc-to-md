"use client";

interface ErrorDisplayProps {
  error: string | null;
}

/**
 * Display an error message with proper ARIA role for accessibility.
 * Renders nothing if error is null or empty.
 */
export function ErrorDisplay({ error }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-600"
    >
      <span className="font-medium">错误：</span>
      {error}
    </div>
  );
}
