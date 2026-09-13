import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";

function App() {
  const [context, setContext] = useState("");
  const [instruction, setInstruction] = useState("Reply politely and helpfully");
  const [tone, setTone] = useState("casual and friendly");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready • Press ⌘⇧E / Ctrl+Shift+E");

  async function loadFromClipboard() {
    try {
      const text = await readText();
      if (text) {
        setContext(text);
        setStatus("Loaded from clipboard");
      }
    } catch (e) {
      setError("Could not read clipboard");
    }
  }

  async function generate() {
    if (!context.trim()) {
      setError("Please provide some context (the message you're replying to)");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");
    setStatus("Generating with local model...");

    try {
      const reply = await invoke<string>("generate_reply", {
        context,
        instruction,
        tone,
      });
      setResult(reply);
      setStatus("Done");
    } catch (e: any) {
      setError(typeof e === "string" ? e : "Generation failed. Is Ollama running?");
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (result) {
      await writeText(result);
      setStatus("Copied to clipboard");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-5">
      <div className="max-w-lg mx-auto space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">echodot</h1>
          <p className="text-zinc-500 text-sm">Echo your voice across every app</p>
        </div>

        {/* Status */}
        <div className="text-xs text-center text-zinc-500 bg-zinc-900/50 rounded-lg py-2">
          {status}
        </div>

        {/* Context */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-300">Context (message to reply to)</label>
            <button
              onClick={loadFromClipboard}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition"
            >
              Load from clipboard
            </button>
          </div>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Paste the message you're replying to..."
            className="w-full h-28 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-zinc-600"
          />
        </div>

        {/* Instruction + Tone */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Instruction</label>
            <input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-600"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Tone</label>
            <input
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg py-2.5 text-sm font-medium"
        >
          {loading ? "Generating..." : "Generate Reply"}
        </button>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-300">Generated Reply</label>
              <button
                onClick={copyResult}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition"
              >
                Copy
              </button>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-3 text-sm whitespace-pre-wrap">
              {result}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-zinc-600 pt-2">
          Local-first • Uses Ollama (llama3.2 by default)
        </p>
      </div>
    </div>
  );
}

export default App;
