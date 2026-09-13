use tauri::{Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[tauri::command]
async fn generate_reply(
    context: String,
    instruction: String,
    tone: String,
    model: String,
) -> Result<String, String> {
    let model_name = if model.trim().is_empty() {
        "llama3.2".to_string()
    } else {
        model.trim().to_string()
    };

    let prompt = format!(
        r#"You are a skilled writing assistant. Your job is to write a reply that sounds natural and matches the requested tone.

Tone: {tone}

Message the user wants to reply to:
\"\"\"
{context}
\"\"\"

User instruction: {instruction}

Rules:
- Write only the reply text
- Sound human, not robotic
- Match the requested tone closely
- Keep it concise unless the instruction asks otherwise
- Do not include quotes, explanations, or extra commentary"#,
        tone = tone,
        context = context,
        instruction = instruction
    );

    let client = reqwest::Client::new();
    let res = client
        .post("http://localhost:11434/api/generate")
        .json(&serde_json::json!({
            "model": model_name,
            "prompt": prompt,
            "stream": false,
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

    let body: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let reply = body["response"]
        .as_str()
        .unwrap_or("No response from model")
        .trim()
        .to_string();

    if reply.is_empty() {
        return Err("Model returned an empty response".to_string());
    }

    Ok(reply)
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
        .invoke_handler(tauri::generate_handler![generate_reply, list_ollama_models])
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
        .run(tauri::generate_context!())
        .expect("error while running echodot");
}
