"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

interface MarkdownReportProps {
  content: string;
}

export default function MarkdownReport({ content }: MarkdownReportProps) {
  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert
        prose-headings:font-semibold
        prose-code:text-cyan-600 dark:prose-code:text-cyan-300
        prose-pre:rounded-xl
        prose-blockquote:border-l-cyan-500
        prose-a:text-cyan-600 dark:prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
        prose-table:text-xs
        prose-hr:border-[var(--border)]"
      style={{
        color: "var(--text-secondary)",
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
