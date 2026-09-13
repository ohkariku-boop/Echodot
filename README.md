# echodot

**Echo your voice across every app.**

Local-first AI that writes replies in *your* tone.  
Press a hotkey → it reads the context → drafts a reply that sounds like you → pastes it.

Free. Open source. Private by default.

---

## Why echodot?

Most AI writing tools force you into their voice or require constant copy-pasting between apps.  
echodot lives on your machine, works in any application, and learns how *you* actually write.

- **Works everywhere** — No integrations needed. Gmail, Slack, LinkedIn, Discord, Notion, Twitter/X, Outlook, etc.
- **Your voice** — Learns from your writing samples and preferences.
- **Local-first** — Runs with Ollama / LM Studio / llama.cpp. Your data stays on your device.
- **Optional cloud** — Bring your own OpenRouter / OpenAI / Anthropic / Groq key when you want higher quality or speed.
- **Zero cost by default** — Completely free to use offline.

---

## Features (Roadmap)

### v0.1 – Core (in progress)
- [ ] Global hotkey
- [ ] Context capture (selected text / clipboard / active window)
- [ ] Tone profile + writing samples
- [ ] Local model support (Ollama)
- [ ] Streaming generation + insert/paste
- [ ] Simple settings UI

### Later
- Voice input
- Per-app tone rules
- Skills / custom instructions
- Better long-term memory
- Android & iOS companions
- Team / enterprise features (optional)

---

## Tech Stack

- **Desktop**: Tauri 2 (Rust) + React + TypeScript + Tailwind
- **Local AI**: Ollama / LM Studio (OpenAI-compatible)
- **Cloud AI**: OpenRouter and any OpenAI-compatible provider
- **Storage**: SQLite (local)

---

## Getting Started (Development)

> Full setup instructions coming soon.

```bash
# Prerequisites
# - Node.js 20+
# - Rust
# - Ollama (recommended)

git clone https://github.com/ohkariku-boop/Echodot.git
cd Echodot
npm install
npm run tauri dev
```

---

## Philosophy

- **Local-first & private** by default
- Core features will always remain free and open source
- Commercial options (hosted version, team features, priority support) may come later — but will never remove or cripple the free local version

---

## License

MIT License — see [LICENSE](LICENSE)

---

**echodot** — Echo your voice across every app.
