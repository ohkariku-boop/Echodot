import { useState } from "react";

function App() {
  const [status, setStatus] = useState("Ready");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">echodot</h1>
          <p className="text-zinc-400 text-sm">
            Echo your voice across every app.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Status</span>
            <span className="font-medium text-emerald-400">{status}</span>
          </div>

          <p className="text-sm text-zinc-400 leading-relaxed">
            This is the early foundation of echodot.  
            Global hotkey, context capture, and local AI integration are coming next.
          </p>

          <button
            onClick={() => setStatus("Hotkey system coming soon...")}
            className="w-full bg-zinc-100 text-zinc-900 hover:bg-white transition-colors rounded-lg py-2.5 text-sm font-medium"
          >
            Test UI
          </button>
        </div>

        <p className="text-center text-xs text-zinc-600">
          Local-first • Open source • MIT License
        </p>
      </div>
    </div>
  );
}

export default App;
