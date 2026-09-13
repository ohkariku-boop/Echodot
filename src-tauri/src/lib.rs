use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[tauri::command]
async fn generate_reply(context: String, instruction: String, tone: String) -> Result<String, String> {
    // Simple Ollama call (default local)
    let prompt = format!(
        r#"You are a helpful writing assistant that rewrites text in the user's personal style.

User's preferred tone: {}

Context (the message they are replying to):
---
{}
---

Instruction from user: {}

Write a natural reply that matches the requested tone. Keep it concise and human. Output only the reply text, nothing else."#,
        tone, context, instruction
    );

    let client = reqwest::Client::new();
    let res = client
        .post("http://localhost:11434/api/generate")
        .json(&serde_json::json!({
            "model": "llama3.2",          // change to whatever model the user has
            "prompt": prompt,
            "stream": false
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to reach Ollama: {}. Is Ollama running?", e))?;

    if !res.status().is_success() {
        return Err(format!("Ollama error: {}", res.status()));
    }

    let body: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let reply = body["response"]
        .as_str()
        .unwrap_or("No response from model")
        .to_string();

    Ok(reply.trim().to_string())
}

#[tauri::command]
fn get_clipboard() -> Result<String, String> {
    // Placeholder - real implementation uses the clipboard plugin from frontend
    Ok("".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        // For now just show the main window when hotkey is pressed
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![generate_reply, get_clipboard])
        .setup(|app| {
            // Register a default global shortcut: Cmd/Ctrl + Shift + E
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
