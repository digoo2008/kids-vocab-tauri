use serde::{Deserialize, Serialize};

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

#[tauri::command]
fn get_words() -> Vec<Word> {
    vec![
        Word {
            english: "apple".to_string(),
            chinese: "苹果".to_string(),
            pronunciation: "ˈæp.əl".to_string(),
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet, get_words])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
