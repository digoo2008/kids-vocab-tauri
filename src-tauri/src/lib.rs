use serde::{Deserialize, Serialize};
use tauri::Manager;

mod commands;
mod db;
mod models;

#[derive(Debug, Serialize, Deserialize)]
pub struct Word {
    pub english: String,
    pub chinese: String,
    pub pronunciation: String,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Kids Vocab App!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("failed to get app data dir");
            let database = db::Database::new(app_data_dir)
                .expect("failed to initialize database");
            database.seed_words().ok();
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::get_words,
            commands::get_wrong_words_review,
            commands::submit_quiz,
            commands::get_history,
            commands::get_wrong_list,
            commands::get_home_stats,
            commands::fetch_tts_audio,
            commands::fetch_llm_chat,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
