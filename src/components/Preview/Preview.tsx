import { useEffect, useRef } from "react";
import { useStore } from "../../store";

export function Preview() {
  const { code } = useStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    const doc = frame.contentDocument;
    if (!doc) return;

    const hasHtml = /<[a-z][\s\S]*>/i.test(code);
    const html = hasHtml
      ? code
      : `<!doctype html><html><body style="background:#0d0d0d;color:#e5e7eb;font-family:monospace;padding:12px"><script type="module">
          const _log = console.log;
          console.log = (...a) => { _log(...a); const el = document.createElement('pre'); el.textContent = a.join(' '); document.body.appendChild(el); };
          try { ${code} } catch(e) { const el = document.createElement('pre'); el.style.color='#f87171'; el.textContent = String(e); document.body.appendChild(el); }
        </script></body></html>`;

    doc.open();
    doc.write(html);
    doc.close();
  }, [code]);

  return (
    <div className="flex flex-col h-full border-l border-surface-600">
      <div className="px-4 py-2 border-b border-surface-600 shrink-0">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Preview</span>
      </div>
      <iframe ref={iframeRef} sandbox="allow-scripts" className="flex-1 w-full" title="preview" />
    </div>
  );
}
