use tauri::State;
use crate::db::Database;
use crate::models::*;

#[tauri::command]
pub fn get_words(db: State<Database>, grade: String, count: i32) -> Result<Vec<Word>, String> {
    let limit = count.max(5).min(50);
    db.get_words_by_grade(&grade, limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_wrong_words_review(db: State<Database>, count: i32) -> Result<Vec<Word>, String> {
    db.get_wrong_words_for_review(count).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn submit_quiz(db: State<Database>, submission: QuizSubmission) -> Result<i64, String> {
    db.save_quiz_result(&submission).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_history(db: State<Database>) -> Result<Vec<QuizHistory>, String> {
    db.get_quiz_history().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_wrong_list(db: State<Database>) -> Result<Vec<WrongWord>, String> {
    db.get_wrong_words().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_home_stats(db: State<Database>) -> Result<HomeStats, String> {
    db.get_home_stats().map_err(|e| e.to_string())
}
