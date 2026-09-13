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
- [x] Global hotkey (⌘⇧E / Ctrl+Shift+E)
- [x] Clipboard read / write
- [x] Local model support (Ollama)
- [x] Generate reply flow
- [x] Model selector (auto-detects installed Ollama models)
- [x] Improved prompt engineering
- [x] **Streaming generation** (token-by-token)
- [x] **Persistent settings** (tone, instruction, model remembered)
- [x] **Tone presets** (quick chips + custom)
- [x] Mobile strategy documented (Android + iOS)
- [ ] Better context capture (active window / selection)
- [ ] Auto-paste / insert
- [ ] System tray + hide-on-close
- [ ] Writing samples / deeper personalization

### Later
- Voice input
- Per-app tone rules
- Skills / custom instructions
- Better long-term memory
- System tray + hide-on-close
- Auto-paste / insert
- Team / enterprise features (optional)

---

## Mobile Strategy (Android & iPhone)

Full desktop-style global hotkeys + screen context are limited on mobile. We will support mobile with adapted experiences:

### Phase 1 – Companion approach (recommended)
- **Share Sheet / Action Extension**: Select text → Share to echodot → get reply suggestions
- **Custom Keyboard Extension**: echodot appears as a keyboard with one-tap AI replies
- Shared core logic (prompts, tone profiles, model settings) between desktop and mobile

### Phase 2 – Native apps
- **Android**: Kotlin + Jetpack Compose (or Flutter). Accessibility Service for better context where permitted.
- **iOS**: Swift + SwiftUI. Heavy use of Share Sheet + Keyboard Extension (App Store friendly).

### Tech options for mobile
| Approach              | Pros                          | Cons                          |
|-----------------------|-------------------------------|-------------------------------|
| Flutter               | Fast cross-platform           | Larger binary                 |
| React Native          | Share some frontend code      | Bridge overhead               |
| Native (Kotlin/Swift) | Best performance & UX         | Two codebases                 |

**Decision**: Desktop remains the priority (best product-market fit). Mobile companions will be added after the desktop core is solid. The same local-first + optional cloud philosophy will apply.

---

## Tech Stack

- **Desktop**: Tauri 2 (Rust) + React + TypeScript + Tailwind
- **Local AI**: Ollama / LM Studio (OpenAI-compatible)
- **Cloud AI**: OpenRouter and any OpenAI-compatible provider
- **Storage**: localStorage (current) → SQLite later
- **Mobile (planned)**: Flutter or native Kotlin/Swift companions

---

## Getting Started (Development)

**Prerequisites**
- Node.js 20+
- Rust
- Ollama (with a model, e.g. `ollama pull llama3.2`)

```bash
git clone https://github.com/ohkariku-boop/Echodot.git
cd Echodot
npm install
npm run tauri dev
```

The app will open.  
Default global hotkey: **⌘⇧E** (macOS) or **Ctrl+Shift+E** (Windows/Linux).

> Note: You still need to generate icons (`npm run tauri icon your-icon.png`) before building a release.

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
