import { useEffect, useRef } from "react";
import { useStore } from "../../store";
import type { ExecutionLine } from "../../types";

function Line({ line }: { line: ExecutionLine }) {
  const colors = { stdout: "text-gray-200", stderr: "text-red-400", info: "text-blue-400" };
  const prefix = { stdout: "", stderr: "✖ ", info: "ℹ " };
  return (
    <div className={`font-mono text-sm leading-relaxed px-4 py-0.5 whitespace-pre-wrap break-words ${colors[line.output_type]}`}>
      <span className="opacity-40 text-xs">{prefix[line.output_type]}</span>
      {line.content}
    </div>
  );
}

export function Console() {
  const { outputLines, isRunning, clearOutput } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [outputLines]);

  return (
    <div className="flex flex-col h-full bg-surface-900">
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-600 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Console</span>
          {isRunning && <span className="text-xs text-blue-400 animate-pulse">● Running</span>}
        </div>
        <button onClick={clearOutput} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {outputLines.length === 0
          ? <div className="text-gray-600 text-sm font-mono px-4 py-3 italic">Run some code to see output…</div>
          : outputLines.map((line, i) => <Line key={i} line={line} />)
        }
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
