import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";

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

  // Load available Ollama models on start
  useEffect(() => {
    invoke<string[]>("list_ollama_models")
      .then((list) => {
        if (list.length > 0) {
          setModels(list);
          const preferred = list.find((m) => m.includes("llama3.2")) || list[0];
          setModel(preferred);
        }
      })
      .catch(() => {
        // Ollama not running — keep default
      });
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
    setStatus(`Generating with ${model}...`);

    try {
      const reply = await invoke<string>("generate_reply", {
        context: context.trim(),
        instruction: instruction.trim() || "Reply naturally",
        tone: tone.trim() || "casual and friendly",
        model: model.trim() || "llama3.2",
      });
      setResult(reply);
      setStatus("Done");
    } catch (e: any) {
      const msg = typeof e === "string" ? e : "Generation failed";
      setError(msg);
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    try {
      await writeText(result);
      setStatus("Copied to clipboard ✓");
    } catch {
      setError("Failed to copy");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-5">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="text-center space-y-1 pt-1">
          <h1 className="text-2xl font-bold tracking-tight">echodot</h1>
          <p className="text-zinc-500 text-sm">Echo your voice across every app</p>
        </div>

        {/* Status bar */}
        <div className="text-xs text-center text-zinc-500 bg-zinc-900/60 rounded-lg py-2 px-3">
          {status}
        </div>

        {/* Context */}
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

        {/* Controls row */}
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
              placeholder="casual and friendly"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>

        {/* Model selector */}
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

        {/* Generate */}
        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg py-2.5 text-sm font-semibold"
        >
          {loading ? "Generating..." : "Generate Reply"}
        </button>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2.5 whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-300">Reply</label>
              <button
                onClick={copyResult}
                className="text-xs text-blue-400 hover:text-blue-300 transition"
              >
                Copy to clipboard
              </button>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-3 text-sm leading-relaxed whitespace-pre-wrap">
              {result}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-zinc-600 pt-1">
          Local-first • Powered by Ollama
        </p>
      </div>
    </div>
  );
}

export default App;
