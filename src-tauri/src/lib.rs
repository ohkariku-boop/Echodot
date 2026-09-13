use tauri::{AppHandle, Emitter, Manager, WindowEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use futures_util::StreamExt;
use serde::Serialize;

#[derive(Clone, Serialize)]
struct StreamEvent {
    token: String,
    done: bool,
}

fn build_prompt(context: &str, instruction: &str, tone: &str, samples: &str) -> String {
    let samples_section = if samples.trim().is_empty() {
        String::new()
    } else {
        format!(
            "\n\nHere are examples of how the user typically writes (match this style):\n\"\"\"\n{}\n\"\"\"",
            samples.trim()
        )
    };

    format!(
        r#"You are a skilled writing assistant. Write a reply that sounds natural and matches the requested tone.

Tone: {tone}
{samples_section}

Message the user wants to reply to:
\"\"\"
{context}
\"\"\"

User instruction: {instruction}

Rules:
- Write only the reply text
- Sound human, not robotic
- Match the requested tone and writing style closely
- Keep it concise unless the instruction asks otherwise
- Do not include quotes, explanations, or extra commentary"#
    )
}

#[tauri::command]
async fn generate_reply_stream(
    app: AppHandle,
    context: String,
    instruction: String,
    tone: String,
    model: String,
    provider: String,          // "ollama" | "openrouter"
    api_key: String,           // only needed for openrouter
    samples: String,           // optional writing samples
) -> Result<(), String> {
    let model_name = if model.trim().is_empty() {
        if provider == "openrouter" {
            "openrouter/free".to_string()
        } else {
            "llama3.2".to_string()
        }
    } else {
        model.trim().to_string()
    };

    let prompt = build_prompt(&context, &instruction, &tone, &samples);

    let client = reqwest::Client::new();

    if provider == "openrouter" {
        // OpenAI-compatible chat completions (streaming)
        if api_key.trim().is_empty() {
            return Err("OpenRouter API key is required. Add it in Settings.".to_string());
        }

        let res = client
            .post("https://openrouter.ai/api/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", api_key.trim()))
            .header("HTTP-Referer", "https://github.com/ohkariku-boop/Echodot")
            .header("X-Title", "echodot")
            .json(&serde_json::json!({
                "model": model_name,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "stream": true,
                "temperature": 0.7,
                "max_tokens": 512
            }))
            .send()
            .await
            .map_err(|e| format!("Failed to reach OpenRouter: {}", e))?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            return Err(format!("OpenRouter error {}: {}", status, body));
        }

        let mut stream = res.bytes_stream();
        let mut buffer = String::new();

        while let Some(item) = stream.next().await {
            let chunk = item.map_err(|e| e.to_string())?;
            buffer.push_str(&String::from_utf8_lossy(&chunk));

            while let Some(pos) = buffer.find('\n') {
                let line = buffer[..pos].trim().to_string();
                buffer = buffer[pos + 1..].to_string();

                if line.is_empty() || line == "data: [DONE]" {
                    if line == "data: [DONE]" {
                        let _ = app.emit("reply-stream", StreamEvent { token: String::new(), done: true });
                        return Ok(());
                    }
                    continue;
                }

                let json_str = line.strip_prefix("data: ").unwrap_or(&line);
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(json_str) {
                    if let Some(content) = json["choices"][0]["delta"]["content"].as_str() {
                        let _ = app.emit("reply-stream", StreamEvent {
                            token: content.to_string(),
                            done: false,
                        });
                    }
                    if json["choices"][0]["finish_reason"].is_string() {
                        let _ = app.emit("reply-stream", StreamEvent { token: String::new(), done: true });
                        return Ok(());
                    }
                }
            }
        }

        let _ = app.emit("reply-stream", StreamEvent { token: String::new(), done: true });
        return Ok(());
    }

    // ---- Ollama path (default) ----
    let res = client
        .post("http://localhost:11434/api/generate")
        .json(&serde_json::json!({
            "model": model_name,
            "prompt": prompt,
            "stream": true,
            "options": {
                "temperature": 0.7,
                "num_predict": 512
            }
        }))
        .send()
        .await
        .map_err(|e| {
            format!(
                "Failed to reach Ollama at http://localhost:11434. Is Ollama running?\n\nError: {}",
                e
            )
        })?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        return Err(format!("Ollama returned {}: {}", status, body));
    }

    let mut stream = res.bytes_stream();
    let mut buffer = String::new();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| e.to_string())?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].trim().to_string();
            buffer = buffer[pos + 1..].to_string();

            if line.is_empty() {
                continue;
            }

            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                if let Some(token) = json["response"].as_str() {
                    let done = json["done"].as_bool().unwrap_or(false);
                    let _ = app.emit("reply-stream", StreamEvent {
                        token: token.to_string(),
                        done,
                    });
                    if done {
                        return Ok(());
                    }
                }
            }
        }
    }

    let _ = app.emit("reply-stream", StreamEvent { token: String::new(), done: true });
    Ok(())
}

#[tauri::command]
async fn list_ollama_models() -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();
    let res = client
        .get("http://localhost:11434/api/tags")
        .send()
        .await
        .map_err(|e| format!("Cannot reach Ollama: {}", e))?;

    if !res.status().is_success() {
        return Err("Failed to list models".to_string());
    }

    let body: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let models = body["models"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|m| m["name"].as_str().map(|s| s.to_string()))
        .collect();

    Ok(models)
}

#[tauri::command]
fn hide_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.unminimize();
                        }
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            generate_reply_stream,
            list_ollama_models,
            hide_window
        ])
        .setup(|app| {
            #[cfg(desktop)]
            {
                let shortcut = if cfg!(target_os = "macos") {
                    Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyE)
                } else {
                    Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyE)
                };
                app.global_shortcut().register(shortcut)?;
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running echodot");
}
