import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";

const TONE_PRESETS = [
  "casual and friendly",
  "professional and concise",
  "warm and empathetic",
  "direct and clear",
  "enthusiastic",
  "formal",
];

function App() {
  const [context, setContext] = useState("");
  const [instruction, setInstruction] = useState("Reply naturally");
  const [tone, setTone] = useState("casual and friendly");
  const [model, setModel] = useState("llama3.2");
  const [models, setModels] = useState<string[]>([]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready • ⌘⇧E / Ctrl+Shift+E");
  const resultRef = useRef("");

  // Load persisted settings
  useEffect(() => {
    const saved = localStorage.getItem("echodot-settings");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.tone) setTone(s.tone);
        if (s.instruction) setInstruction(s.instruction);
        if (s.model) setModel(s.model);
      } catch {}
    }
  }, []);

  // Persist settings
  useEffect(() => {
    localStorage.setItem(
      "echodot-settings",
      JSON.stringify({ tone, instruction, model })
    );
  }, [tone, instruction, model]);

  // Load Ollama models
  useEffect(() => {
    invoke<string[]>("list_ollama_models")
      .then((list) => {
        if (list.length > 0) {
          setModels(list);
          setModel((prev) => {
            if (list.includes(prev)) return prev;
            return list.find((m) => m.includes("llama3.2")) || list[0];
          });
        }
      })
      .catch(() => {});
  }, []);

  // Streaming listener + auto-copy when finished
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<{ token: string; done: boolean }>("reply-stream", (event) => {
      const { token, done } = event.payload;
      if (token) {
        resultRef.current += token;
        setResult(resultRef.current);
      }
      if (done) {
        setLoading(false);
        // Auto-copy the final result so user can immediately paste
        if (resultRef.current.trim()) {
          writeText(resultRef.current).then(() => {
            setStatus("Done • Copied to clipboard — just paste (⌘V / Ctrl+V)");
          }).catch(() => {
            setStatus("Done");
          });
        } else {
          setStatus("Done");
        }
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  async function loadFromClipboard() {
    try {
      const text = await readText();
      if (text?.trim()) {
        setContext(text.trim());
        setStatus("Loaded from clipboard");
        setError("");
      } else {
        setStatus("Clipboard is empty");
      }
    } catch {
      setError("Could not read clipboard");
    }
  }

  async function generate() {
    if (!context.trim()) {
      setError("Add some context first (the message you're replying to)");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");
    resultRef.current = "";
    setStatus(`Streaming from ${model}...`);

    try {
      await invoke("generate_reply_stream", {
        context: context.trim(),
        instruction: instruction.trim() || "Reply naturally",
        tone: tone.trim() || "casual and friendly",
        model: model.trim() || "llama3.2",
      });
    } catch (e: any) {
      const msg = typeof e === "string" ? e : "Generation failed";
      setError(msg);
      setStatus("Error");
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    try {
      await writeText(result);
      setStatus("Copied to clipboard ✓ — paste with ⌘V / Ctrl+V");
    } catch {
      setError("Failed to copy");
    }
  }

  async function hideApp() {
    try {
      await invoke("hide_window");
    } catch {
      // fallback: just ignore
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-5">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-start justify-between pt-1">
          <div className="text-center flex-1 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">echodot</h1>
            <p className="text-zinc-500 text-sm">Echo your voice across every app</p>
          </div>
          <button
            onClick={hideApp}
            title="Hide window (app keeps running)"
            className="text-zinc-500 hover:text-zinc-300 text-xs px-2 py-1 rounded border border-zinc-800 hover:border-zinc-600 transition"
          >
            Hide
          </button>
        </div>

        <div className="text-xs text-center text-zinc-500 bg-zinc-900/60 rounded-lg py-2 px-3">
          {status}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-300">Context</label>
            <button
              onClick={loadFromClipboard}
              className="text-xs text-blue-400 hover:text-blue-300 transition"
            >
              Load clipboard
            </button>
          </div>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Paste the message you want to reply to..."
            className="w-full h-28 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Instruction</label>
            <input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Reply naturally"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-600"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Tone</label>
            <input
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              list="tone-presets"
              placeholder="casual and friendly"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-600"
            />
            <datalist id="tone-presets">
              {TONE_PRESETS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Tone preset chips */}
        <div className="flex flex-wrap gap-1.5">
          {TONE_PRESETS.map((t) => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${
                tone === t
                  ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-300">Model</label>
          {models.length > 0 ? (
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-600"
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="llama3.2"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-600"
            />
          )}
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg py-2.5 text-sm font-semibold"
        >
          {loading ? "Generating..." : "Generate Reply"}
        </button>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2.5 whitespace-pre-wrap">
            {error}
          </div>
        )}

        {(result || loading) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-300">
                Reply {loading && <span className="text-zinc-500">(streaming...)</span>}
              </label>
              {result && !loading && (
                <button
                  onClick={copyResult}
                  className="text-xs text-blue-400 hover:text-blue-300 transition"
                >
                  Copy to clipboard
                </button>
              )}
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-3 text-sm leading-relaxed whitespace-pre-wrap min-h-[60px]">
              {result}
              {loading && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-zinc-400 animate-pulse" />
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-zinc-600 pt-1">
          Local-first • Powered by Ollama • Settings auto-saved
        </p>
      </div>
    </div>
  );
}

export default App;
