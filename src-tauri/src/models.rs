use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Word {
    pub id: i64,
    pub word: String,
    pub chinese: String,
    pub grade: String,
    pub difficulty: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuizHistory {
    pub id: i64,
    pub date: String,
    pub grade: String,
    pub quiz_type: String,
    pub total: i32,
    pub correct: i32,
    pub score: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuizDetail {
    pub id: i64,
    pub history_id: i64,
    pub word: String,
    pub chinese: String,
    pub correct: bool,
    pub hint_used: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WrongWord {
    pub word: String,
    pub chinese: String,
    pub count: i32,
    pub last_wrong: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Progress {
    pub date: String,
    pub completed: i32,
    pub target: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    pub grade: String,
    pub word_count: i32,
    pub quiz_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuizSubmission {
    pub grade: String,
    pub quiz_type: String,
    pub total: i32,
    pub correct: i32,
    pub score: i32,
    pub details: Vec<QuizDetailInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuizDetailInput {
    pub word: String,
    pub chinese: String,
    pub correct: bool,
    pub hint_used: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HomeStats {
    pub today_completed: i32,
    pub today_target: i32,
    pub checkin_days: i32,
    pub wrong_count: i32,
}
