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
    <div className="prose prose-invert prose-sm max-w-none
      prose-headings:text-zinc-100 prose-headings:font-semibold
      prose-p:text-zinc-300 prose-p:leading-relaxed
      prose-strong:text-zinc-100
      prose-code:text-cyan-300 prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
      prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-pre:rounded-xl
      prose-blockquote:border-l-cyan-500 prose-blockquote:text-zinc-400
      prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
      prose-table:text-xs prose-th:text-zinc-400 prose-td:text-zinc-300
      prose-li:text-zinc-300
      prose-hr:border-zinc-800">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
