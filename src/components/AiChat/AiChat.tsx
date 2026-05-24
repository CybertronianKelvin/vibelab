import { useEffect, useRef } from "react";
import { useAiChat } from "../../hooks/useAiChat";
import { useStore } from "../../store";
import type { AiMessage } from "../../types";

function isPureCode(content: string): boolean {
  return !content.includes("```");
}

interface BubbleProps {
  msg: AiMessage;
  isLastStreaming: boolean;
  onInsert: (code: string) => void;
}

function MessageBubble({ msg, isLastStreaming, onInsert }: BubbleProps) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[80%] px-3 py-2 rounded-lg bg-brand-900/40 border border-brand-500/20 text-sm text-gray-200 whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    );
  }

  if (!msg.content && isLastStreaming) {
    return (
      <div className="mb-3 flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    );
  }

  const pure = msg.content ? isPureCode(msg.content) : false;

  if (pure) {
    return (
      <div className="mb-3">
        <pre className="bg-surface-700 border border-surface-500 rounded-lg p-3 text-xs font-mono text-gray-200 overflow-x-auto whitespace-pre-wrap">
          {msg.content}
        </pre>
        <button
          onClick={() => onInsert(msg.content)}
          className="mt-1.5 w-full px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-white text-xs font-medium transition-colors"
        >
          ↑ Insert into editor
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3 text-sm text-gray-200 leading-relaxed">
      {renderMixed(msg.content, onInsert)}
    </div>
  );
}

function renderMixed(content: string, onInsert: (code: string) => void) {
  const parts = content.split(/(```[\w]*\n[\s\S]*?```)/g);
  return parts.map((part, i) => {
    const fenceMatch = part.match(/^```([\w]*)\n([\s\S]*)```$/);
    if (fenceMatch) {
      const code = fenceMatch[2].trim();
      return (
        <div key={i} className="my-2">
          <pre className="bg-surface-700 border border-surface-500 rounded-lg p-3 text-xs font-mono text-gray-200 overflow-x-auto whitespace-pre-wrap">
            {code}
          </pre>
          <button
            onClick={() => onInsert(code)}
            className="mt-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            ↑ Insert into editor
          </button>
        </div>
      );
    }
    return part ? <span key={i}>{part}</span> : null;
  });
}

const PROVIDER_LABELS: Record<string, string> = {
  claude: "Claude",
  openai: "OpenAI",
  groq: "Groq",
  openrouter: "OpenRouter",
};

interface AiChatProps {
  onInsertCode: (code: string) => void;
}

export function AiChat({ onInsertCode }: AiChatProps) {
  const { aiMessages, aiStreaming, settings, toggleAiChat } = useStore();
  const { send, clearChat } = useAiChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const configured = !!(settings.aiProvider && settings.aiApiKey && settings.aiModel);
  const providerLabel = settings.aiProvider ? (PROVIDER_LABELS[settings.aiProvider] ?? settings.aiProvider) : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages.length, aiStreaming]);

  const handleSend = async () => {
    const el = textareaRef.current;
    if (!el) return;
    const text = el.value.trim();
    if (!text || aiStreaming) return;
    el.value = "";
    el.style.height = "auto";
    await send(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex flex-col h-full border-t border-surface-600 bg-surface-800">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-surface-600 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-300">AI Chat</span>
          {providerLabel && <span className="text-xs text-gray-500">{providerLabel}</span>}
          {aiStreaming && (
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-brand-500 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {aiMessages.length > 0 && !aiStreaming && (
            <button
              onClick={clearChat}
              className="text-xs text-gray-500 hover:text-gray-300 px-1.5 py-0.5 rounded hover:bg-surface-600"
            >
              Clear
            </button>
          )}
          <button
            onClick={toggleAiChat}
            className="text-gray-500 hover:text-gray-200 text-base leading-none px-1"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
        {aiMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-gray-600 text-center">
              {configured
                ? "Ask me to write or edit your code"
                : "Configure an AI provider in Settings ⚙"}
            </p>
          </div>
        ) : (
          <>
            {aiMessages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isLastStreaming={aiStreaming && i === aiMessages.length - 1}
                onInsert={onInsertCode}
              />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className="px-3 py-2 border-t border-surface-600 shrink-0">
        {!configured ? (
          <p className="text-xs text-gray-600 text-center py-1">
            Open Settings to add an AI API key
          </p>
        ) : (
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Ask AI to write or edit code… (Enter to send)"
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              disabled={aiStreaming}
              className="flex-1 bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-brand-500 resize-none disabled:opacity-50"
              style={{ minHeight: "36px", maxHeight: "120px", overflow: "hidden" }}
            />
            <button
              onClick={handleSend}
              disabled={aiStreaming}
              className="px-3 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white text-sm font-medium shrink-0 transition-colors"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
