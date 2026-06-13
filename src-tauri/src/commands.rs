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

// ====== 豆包 TTS 代理（SSE 单向流式，绕过浏览器 CORS） ======
#[tauri::command]
pub async fn fetch_tts_audio(text: String, api_key: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let resp = client
        .post("https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse")
        .header("Content-Type", "application/json")
        .header("X-Api-Key", &api_key)
        .header("X-Api-Resource-Id", "seed-tts-2.0")
        .json(&serde_json::json!({
            "user": {"uid": "kids-vocab"},
            "req_params": {
                "text": text,
                "speaker": "en_female_dacey_uranus_bigtts",
                "audio_params": {
                    "format": "mp3",
                    "sample_rate": 24000
                }
            }
        }))
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("HTTP {} — {}", status.as_u16(), body.chars().take(300).collect::<String>()));
    }

    // 提取 content-type 用于后续 fallback 判断
    let content_type = resp.headers().get("content-type")
        .and_then(|v| v.to_str().ok()).unwrap_or("").to_string();

    // 解析 SSE 流式响应，收集并合并音频数据
    let raw_bytes = resp.bytes().await.map_err(|e| format!("读取响应失败: {}", e))?;
    let sse_text = String::from_utf8_lossy(&raw_bytes);

    use base64::Engine;
    let mut audio_bytes: Vec<u8> = Vec::new();

    // 兼容 \n\n 和 \r\n\r\n 分隔
    let events: Vec<&str> = if sse_text.contains("\r\n\r\n") {
        sse_text.split("\r\n\r\n").collect()
    } else {
        sse_text.split("\n\n").collect()
    };

    for event in &events {
        let event = event.trim();
        if event.is_empty() {
            continue;
        }
        for line in event.lines() {
            let line = line.trim();
            if let Some(data) = line.strip_prefix("data:") {
                let data = data.trim();
                if data.is_empty() || data == "[DONE]" {
                    continue;
                }
                // 尝试 JSON → 提取音频字段（V3 使用 "data" 字段）
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    let audio_val = json.get("data")
                        .or_else(|| json.get("audio"))
                        .or_else(|| json.get("payload").and_then(|p| p.get("data")))
                        .or_else(|| json.get("payload_msg").and_then(|p| p.get("data")));
                    if let Some(audio) = audio_val.and_then(|v| v.as_str()) {
                        if let Ok(decoded) = base64::engine::general_purpose::STANDARD.decode(audio) {
                            audio_bytes.extend_from_slice(&decoded);
                        }
                    }
                } else if let Ok(decoded) = base64::engine::general_purpose::STANDARD.decode(data) {
                    // 纯 base64 音频数据
                    audio_bytes.extend_from_slice(&decoded);
                }
            }
        }
    }

    if audio_bytes.is_empty() {
        // 可能返回的是原始二进制音频，非 SSE 包装
        if content_type.contains("audio/") || content_type.contains("octet-stream") {
            return Ok(base64::engine::general_purpose::STANDARD.encode(&raw_bytes));
        }
        let preview: String = sse_text.chars().take(300).collect();
        return Err(format!("未收到音频数据，响应: {}", preview));
    }

    Ok(base64::engine::general_purpose::STANDARD.encode(&audio_bytes))
}

// ====== LLM 通用代理（绕过浏览器 CORS） ======
#[tauri::command]
pub async fn fetch_llm_chat(url: String, api_key: String, body_json: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .body(body_json)
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("HTTP {} — {}", status.as_u16(), body.chars().take(200).collect::<String>()));
    }

    resp.text().await.map_err(|e| format!("读取响应失败: {}", e))
}
