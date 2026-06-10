pub mod models;
pub mod db;
pub mod commands;

use db::Database;
use std::path::PathBuf;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Initialize database in app data directory
            let app_data_dir: PathBuf = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| PathBuf::from("."));

            let database = Database::new(app_data_dir)
                .expect("Failed to initialize database");
            database.seed_words()
                .expect("Failed to seed words");

            app.manage(database);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_words,
            commands::get_wrong_words_review,
            commands::submit_quiz,
            commands::get_history,
            commands::get_wrong_list,
            commands::get_home_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
