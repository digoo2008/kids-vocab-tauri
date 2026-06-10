# 🐣 快乐背单词 — Tauri 桌面版完整实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-subagent-driven-development (recommended) or superpowers-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有的 Web 原型填空/拖拽测验，整合为一个完整的 Tauri 桌面应用：Rust 后端 (rusqlite+SQLite) + 前端 SPA (4个页面)，窗口 1920×1080，花园童话风 UI。

**Architecture:**
- **Rust 后端** (`src-tauri/src/`): `db.rs` 管理 SQLite 建表+CRUD；`commands.rs` 暴露 Tauri commands；`models.rs` 定义序列化结构体；`lib.rs` 注册 commands + 初始化 DB。
- **前端 SPA** (`src/`): 纯 HTML/CSS/JS 单页应用，通过 `window.__TAURI__.invoke()` 调用后端；4 个视图 (首页 / 填空测验 / 拖拽测验 / 结果页 / 历史错题页) 通过 hash 路由切换。
- **数据库** (`{app_data_dir}/kids-vocab.db`): 5 张表 — `words` (单词库)、`quiz_history` (测验记录)、`quiz_details` (每题明细)、`wrong_words` (错题集)、`progress` (每日进度/打卡)。

**Tech Stack:** Tauri 2.x, Rust, rusqlite, serde, HTML5/CSS3/ES6, Tauri invoke IPC

---

## 文件结构变更清单

```
src-tauri/Cargo.toml              # [修改] 添加 rusqlite 依赖
src-tauri/src/main.rs              # [不变] 无变更
src-tauri/src/lib.rs               # [修改] 注册 commands + 初始化 DB
src-tauri/src/models.rs            # [新建] 数据模型结构体
src-tauri/src/db.rs                # [新建] 数据库初始化和操作
src-tauri/src/commands.rs          # [新建] Tauri commands 定义
src-tauri/capabilities/default.json # [修改] 允许 invoke 所有命令
src/index.html                     # [新建] SPA 入口（替代现有重定向页）
src/css/style.css                  # [新建] 花园童话风全局样式
src/js/app.js                      # [新建] SPA 路由 + 全局状态
src/js/home.js                     # [新建] 首页逻辑
src/js/quiz-fill.js                # [新建] 填空测验逻辑
src/js/quiz-drag.js               # [新建] 拖拽测验逻辑
src/js/result.js                   # [新建] 结果页逻辑
src/js/history.js                  # [新建] 历史/错题页逻辑

# 删除（不再需要）
src/garden-theme-*.html            # 原型文件保留在 design/ 中
```

---

### Task 1: Cargo 依赖 + 数据库模型

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/models.rs`

- [ ] **Step 1.1: 添加 rusqlite 和 serde 依赖到 Cargo.toml**

```toml
[dependencies]
serde_json = "1.0"
serde = { version = "1.0", features = ["derive"] }
log = "0.4"
tauri = { version = "2.11.2" }
tauri-plugin-log = "2"
rusqlite = { version = "0.31", features = ["bundled"] }
chrono = { version = "0.4", features = ["serde"] }
```

- [ ] **Step 1.2: 创建 `src-tauri/src/models.rs` — 定义所有数据模型**

```rust
use serde::{Deserialize, Serialize};

/// 单词条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Word {
    pub id: i64,
    pub word: String,
    pub chinese: String,
    pub grade: String,       // "grade1" ~ "grade6"
    pub difficulty: i32,     // 1-4
}

/// 测验记录（一次测验）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuizHistory {
    pub id: i64,
    pub date: String,        // "2026-06-10"
    pub grade: String,
    pub quiz_type: String,   // "fill", "drag", "mixed"
    pub total: i32,
    pub correct: i32,
    pub score: i32,
}

/// 测验明细（每题结果）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuizDetail {
    pub id: i64,
    pub history_id: i64,
    pub word: String,
    pub chinese: String,
    pub correct: bool,
    pub hint_used: bool,
}

/// 错题
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WrongWord {
    pub word: String,
    pub chinese: String,
    pub count: i32,          // 出错次数
    pub last_wrong: String,  // 最近出错日期
}

/// 每日进度
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Progress {
    pub date: String,
    pub completed: i32,
    pub target: i32,
}

/// 用户设置（用于前端）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    pub grade: String,       // "grade1" ~ "grade6"
    pub word_count: i32,     // 默认 10
    pub quiz_type: String,   // "fill", "drag", "mixed"
}

/// 测验结果（提交用）
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

/// 首页统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HomeStats {
    pub today_completed: i32,
    pub today_target: i32,
    pub checkin_days: i32,
    pub wrong_count: i32,
}
```

- [ ] **Step 1.3: 验证编译通过**

Run: `cargo check`
Expected: `Checking app v0.1.0` — 编译成功

- [ ] **Step 1.4: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/src/models.rs
git commit -m "feat: add rusqlite dep + data models"
```

---

### Task 2: SQLite 数据库初始化 + 种子数据

**Files:**
- Create: `src-tauri/src/db.rs`

- [ ] **Step 2.1: 创建 `src-tauri/src/db.rs` — 数据库初始化（建表）**

```rust
use rusqlite::{Connection, Result, params};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(app_data_dir: PathBuf) -> Result<Self> {
        std::fs::create_dir_all(&app_data_dir).ok();
        let db_path = app_data_dir.join("kids-vocab.db");
        let conn = Connection::open(&db_path)?;

        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

        // 单词表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS words (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT NOT NULL UNIQUE,
                chinese TEXT NOT NULL,
                grade TEXT NOT NULL,
                difficulty INTEGER NOT NULL DEFAULT 1
            )",
            [],
        )?;

        // 测验历史
        conn.execute(
            "CREATE TABLE IF NOT EXISTS quiz_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                grade TEXT NOT NULL,
                quiz_type TEXT NOT NULL,
                total INTEGER NOT NULL,
                correct INTEGER NOT NULL,
                score INTEGER NOT NULL
            )",
            [],
        )?;

        // 测验明细
        conn.execute(
            "CREATE TABLE IF NOT EXISTS quiz_details (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                history_id INTEGER NOT NULL,
                word TEXT NOT NULL,
                chinese TEXT NOT NULL,
                correct INTEGER NOT NULL,
                hint_used INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (history_id) REFERENCES quiz_history(id)
            )",
            [],
        )?;

        // 错题本
        conn.execute(
            "CREATE TABLE IF NOT EXISTS wrong_words (
                word TEXT PRIMARY KEY,
                chinese TEXT NOT NULL,
                count INTEGER NOT NULL DEFAULT 1,
                last_wrong TEXT NOT NULL
            )",
            [],
        )?;

        // 进度表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS progress (
                date TEXT PRIMARY KEY,
                completed INTEGER NOT NULL DEFAULT 0,
                target INTEGER NOT NULL DEFAULT 10
            )",
            [],
        )?;

        Ok(Database { conn: Mutex::new(conn) })
    }
}
```

- [ ] **Step 2.2: 在 `db.rs` 中添加种子数据方法**

```rust
impl Database {
    /// 插入默认单词库（如果表为空）
    pub fn seed_words(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM words", [], |r| r.get(0))?;
        if count > 0 {
            return Ok(()); // 已有数据，跳过
        }

        let words = vec![
            // 一年级 (3-4字母，简单)
            ("cat", "猫", "grade1", 1), ("dog", "狗", "grade1", 1),
            ("sun", "太阳", "grade1", 1), ("egg", "鸡蛋", "grade1", 1),
            ("red", "红色", "grade1", 1), ("big", "大的", "grade1", 1),
            ("hat", "帽子", "grade1", 1), ("cup", "杯子", "grade1", 1),
            ("pen", "钢笔", "grade1", 1), ("bed", "床", "grade1", 1),
            ("fish", "鱼", "grade1", 1), ("bird", "鸟", "grade1", 1),
            ("book", "书", "grade1", 1), ("milk", "牛奶", "grade1", 1),
            ("star", "星星", "grade1", 1), ("moon", "月亮", "grade1", 1),
            ("tree", "树", "grade1", 1), ("door", "门", "grade1", 1),
            ("king", "国王", "grade1", 2), ("jump", "跳", "grade1", 1),
            ("lion", "狮子", "grade1", 2), ("rain", "雨", "grade1", 1),
            ("foot", "脚", "grade1", 1), ("hand", "手", "grade1", 1),
            ("head", "头", "grade1", 1), ("ball", "球", "grade1", 1),
            ("cake", "蛋糕", "grade1", 1), ("duck", "鸭子", "grade1", 1),
            ("frog", "青蛙", "grade1", 1), ("gift", "礼物", "grade1", 1),

            // 二年级 (4-5字母)
            ("apple", "苹果", "grade2", 2), ("happy", "开心的", "grade2", 2),
            ("tiger", "老虎", "grade2", 2), ("panda", "熊猫", "grade2", 2),
            ("house", "房子", "grade2", 2), ("water", "水", "grade2", 2),
            ("green", "绿色", "grade2", 2), ("grape", "葡萄", "grade2", 2),
            ("zebra", "斑马", "grade2", 2), ("queen", "女王", "grade2", 2),
            ("robot", "机器人", "grade2", 2), ("pencil", "铅笔", "grade2", 2),
            ("noodle", "面条", "grade2", 2), ("monkey", "猴子", "grade2", 2),
            ("night", "夜晚", "grade2", 2), ("garden", "花园", "grade2", 2),
            ("voice", "声音", "grade2", 2), ("yellow", "黄色", "grade2", 2),
            ("island", "岛屿", "grade2", 2), ("flower", "花", "grade2", 2),
            ("candy", "糖果", "grade2", 2), ("dance", "跳舞", "grade2", 2),
            ("snake", "蛇", "grade2", 2), ("sheep", "绵羊", "grade2", 2),
            ("cloud", "云", "grade2", 2), ("dream", "梦", "grade2", 2),
            ("bread", "面包", "grade2", 2), ("chair", "椅子", "grade2", 2),
            ("clock", "钟", "grade2", 2), ("dress", "连衣裙", "grade2", 2),

            // 三年级 (5-6字母)
            ("banana", "香蕉", "grade3", 3), ("school", "学校", "grade3", 3),
            ("rabbit", "兔子", "grade3", 3), ("orange", "橙子", "grade3", 3),
            ("elephant", "大象", "grade3", 3), ("umbrella", "雨伞", "grade3", 3),
            ("purple", "紫色", "grade3", 3), ("window", "窗户", "grade3", 3),
            ("guitar", "吉他", "grade3", 3), ("family", "家庭", "grade3", 3),
            ("planet", "行星", "grade3", 3), ("bridge", "桥", "grade3", 3),
            ("castle", "城堡", "grade3", 3), ("dragon", "龙", "grade3", 3),
            ("forest", "森林", "grade3", 3), ("giraffe", "长颈鹿", "grade3", 3),
            ("animal", "动物", "grade3", 3), ("bottle", "瓶子", "grade3", 3),
            ("candle", "蜡烛", "grade3", 3), ("cotton", "棉花", "grade3", 3),
            ("silver", "银色的", "grade3", 3), ("garden", "花园", "grade3", 3),
            ("kitten", "小猫", "grade3", 3), ("ladder", "梯子", "grade3", 3),
            ("matter", "事情", "grade3", 3), ("number", "数字", "grade3", 3),
            ("puzzle", "拼图", "grade3", 3), ("sister", "姐妹", "grade3", 3),
            ("turtle", "乌龟", "grade3", 3), ("winter", "冬天", "grade3", 3),

            // 四~六年级 (6+字母)
            ("beautiful", "美丽的", "grade4", 4), ("strawberry", "草莓", "grade4", 4),
            ("chocolate", "巧克力", "grade4", 4), ("dinosaur", "恐龙", "grade4", 4),
            ("festival", "节日", "grade4", 4), ("mountain", "山", "grade4", 4),
            ("painting", "绘画", "grade4", 4), ("rainbow", "彩虹", "grade4", 4),
            ("butterfly", "蝴蝶", "grade4", 4), ("calendar", "日历", "grade4", 4),
            ("champion", "冠军", "grade4", 4), ("discover", "发现", "grade4", 4),
            ("elephant", "大象", "grade4", 4), ("friendly", "友好的", "grade4", 4),
            ("governor", "统治者", "grade4", 4), ("hospital", "医院", "grade4", 4),
            ("important", "重要的", "grade4", 4), ("knowledge", "知识", "grade4", 4),
            ("language", "语言", "grade4", 4), ("medicine", "药", "grade4", 4),
            ("newspaper", "报纸", "grade4", 4), ("umbrella", "雨伞", "grade4", 4),
            ("violinist", "小提琴家", "grade4", 4), ("wonderful", "精彩的", "grade4", 4),
            ("adventure", "冒险", "grade4", 4), ("celebrate", "庆祝", "grade4", 4),
            ("dangerous", "危险的", "grade4", 4), ("exercise", "锻炼", "grade4", 4),
            ("beautiful", "美丽的", "grade4", 4), ("gorgeous", "华丽的", "grade4", 4),
        ];

        for (word, chinese, grade, difficulty) in words {
            conn.execute(
                "INSERT OR IGNORE INTO words (word, chinese, grade, difficulty) VALUES (?1, ?2, ?3, ?4)",
                params![word, chinese, grade, difficulty],
            )?;
        }
        log::info!("Seeded {} words", conn.changes());
        Ok(())
    }
}
```

- [ ] **Step 2.3: 添加数据库查询方法**

在 `db.rs` 中追加：

```rust
impl Database {
    /// 按年级获取单词
    pub fn get_words_by_grade(&self, grade: &str, limit: i32) -> Result<Vec<super::models::Word>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, word, chinese, grade, difficulty FROM words WHERE grade = ?1 ORDER BY RANDOM() LIMIT ?2"
        )?;
        let rows = stmt.query_map(params![grade, limit], |r| {
            Ok(super::models::Word {
                id: r.get(0)?,
                word: r.get(1)?,
                chinese: r.get(2)?,
                grade: r.get(3)?,
                difficulty: r.get(4)?,
            })
        })?;
        let mut words = Vec::new();
        for row in rows {
            words.push(row?);
        }
        Ok(words)
    }

    /// 获取所有年级列表及其单词数
    pub fn get_grade_stats(&self) -> Result<Vec<(String, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT grade, COUNT(*) as cnt FROM words GROUP BY grade ORDER BY grade"
        )?;
        let rows = stmt.query_map([], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?))
        })?;
        let mut stats = Vec::new();
        for row in rows {
            stats.push(row?);
        }
        Ok(stats)
    }

    /// 保存测验结果
    pub fn save_quiz_result(&self, submission: &super::models::QuizSubmission) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();

        conn.execute(
            "INSERT INTO quiz_history (date, grade, quiz_type, total, correct, score) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![today, submission.grade, submission.quiz_type, submission.total, submission.correct, submission.score],
        )?;
        let history_id = conn.last_insert_rowid();

        // 插入明细
        for detail in &submission.details {
            conn.execute(
                "INSERT INTO quiz_details (history_id, word, chinese, correct, hint_used) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![history_id, detail.word, detail.chinese, detail.correct as i32, detail.hint_used as i32],
            )?;

            // 更新错题本
            if !detail.correct {
                let affected = conn.execute(
                    "UPDATE wrong_words SET count = count + 1, last_wrong = ?1 WHERE word = ?2",
                    params![today, detail.word],
                )?;
                if affected == 0 {
                    conn.execute(
                        "INSERT INTO wrong_words (word, chinese, count, last_wrong) VALUES (?1, ?2, 1, ?3)",
                        params![detail.word, detail.chinese, today],
                    )?;
                }
            }
        }

        // 更新进度
        let affected = conn.execute(
            "UPDATE progress SET completed = completed + ?1 WHERE date = ?2",
            params![submission.total, today],
        )?;
        if affected == 0 {
            conn.execute(
                "INSERT INTO progress (date, completed, target) VALUES (?1, ?2, 10)",
                params![today, submission.total],
            )?;
        }

        Ok(history_id)
    }

    /// 获取测验历史
    pub fn get_quiz_history(&self) -> Result<Vec<super::models::QuizHistory>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, date, grade, quiz_type, total, correct, score FROM quiz_history ORDER BY id DESC LIMIT 50"
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(super::models::QuizHistory {
                id: r.get(0)?,
                date: r.get(1)?,
                grade: r.get(2)?,
                quiz_type: r.get(3)?,
                total: r.get(4)?,
                correct: r.get(5)?,
                score: r.get(6)?,
            })
        })?;
        let mut history = Vec::new();
        for row in rows {
            history.push(row?);
        }
        Ok(history)
    }

    /// 获取错题列表
    pub fn get_wrong_words(&self) -> Result<Vec<super::models::WrongWord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT word, chinese, count, last_wrong FROM wrong_words ORDER BY count DESC, last_wrong DESC"
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(super::models::WrongWord {
                word: r.get(0)?,
                chinese: r.get(1)?,
                count: r.get(2)?,
                last_wrong: r.get(3)?,
            })
        })?;
        let mut words = Vec::new();
        for row in rows {
            words.push(row?);
        }
        Ok(words)
    }

    /// 获取首页统计
    pub fn get_home_stats(&self) -> Result<super::models::HomeStats> {
        let conn = self.conn.lock().unwrap();
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();

        // 今日进度
        let (completed, target): (i32, i32) = conn.query_row(
            "SELECT COALESCE(completed,0), COALESCE(target,10) FROM progress WHERE date = ?1",
            params![today],
            |r| Ok((r.get(0)?, r.get(1)?)),
        ).unwrap_or((0, 10));

        // 连续打卡天数
        let mut checkin_days = 0;
        let mut cursor = chrono::Local::now().naive_local().date();
        loop {
            let d = cursor.format("%Y-%m-%d").to_string();
            let exists: bool = conn.query_row(
                "SELECT COUNT(*) > 0 FROM progress WHERE date = ?1 AND completed > 0",
                params![d],
                |r| r.get(0),
            ).unwrap_or(false);
            if exists {
                checkin_days += 1;
                cursor = cursor.pred_opt().unwrap();
            } else {
                break;
            }
        }

        // 错题数
        let wrong_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM wrong_words", [], |r| r.get(0)
        ).unwrap_or(0);

        Ok(super::models::HomeStats {
            today_completed: completed,
            today_target: target,
            checkin_days,
            wrong_count,
        })
    }

    /// 删除某条测验历史
    pub fn delete_history(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM quiz_details WHERE history_id = ?1", params![id])?;
        conn.execute("DELETE FROM quiz_history WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// 从错题本中移除单词（复习正确后）
    pub fn remove_wrong_word(&self, word: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM wrong_words WHERE word = ?1", params![word])?;
        Ok(())
    }
}
```

- [ ] **Step 2.4: 验证编译**

Run: `cargo check`
Expected: 编译成功

- [ ] **Step 2.5: Commit**

```bash
git add src-tauri/src/db.rs
git commit -m "feat: SQLite database with seed data and queries"
```

---

### Task 3: Tauri Commands — 后端 API

**Files:**
- Create: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`

- [ ] **Step 3.1: 创建 `src-tauri/src/commands.rs` — 所有 Tauri commands**

```rust
use crate::db::Database;
use crate::models;
use tauri::State;

#[tauri::command]
pub fn get_words(grade: String, count: i32, state: State<'_, Database>) -> Result<Vec<models::Word>, String> {
    state.get_words_by_grade(&grade, count).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_grade_stats(state: State<'_, Database>) -> Result<Vec<(String, i64)>, String> {
    state.get_grade_stats().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn submit_quiz(submission: models::QuizSubmission, state: State<'_, Database>) -> Result<i64, String> {
    state.save_quiz_result(&submission).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_history(state: State<'_, Database>) -> Result<Vec<models::QuizHistory>, String> {
    state.get_quiz_history().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_wrong_words(state: State<'_, Database>) -> Result<Vec<models::WrongWord>, String> {
    state.get_wrong_words().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_home_stats(state: State<'_, Database>) -> Result<models::HomeStats, String> {
    state.get_home_stats().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_history(id: i64, state: State<'_, Database>) -> Result<(), String> {
    state.delete_history(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_wrong_word(word: String, state: State<'_, Database>) -> Result<(), String> {
    state.remove_wrong_word(&word).map_err(|e| e.to_string())
}
```

- [ ] **Step 3.2: 更新 `src-tauri/src/lib.rs` — 注册 commands + 初始化 DB**

```rust
mod commands;
mod db;
mod models;

use db::Database;
use tauri::Manager;

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

            // 初始化数据库
            let app_data_dir = app.path().app_data_dir().expect("failed to get app data dir");
            let database = Database::new(app_data_dir).expect("failed to init database");
            database.seed_words().expect("failed to seed words");
            app.manage(database);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_words,
            commands::get_grade_stats,
            commands::submit_quiz,
            commands::get_history,
            commands::get_wrong_words,
            commands::get_home_stats,
            commands::delete_history,
            commands::remove_wrong_word,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3.3: 更新 `src-tauri/capabilities/default.json` — 开放权限**

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "enables the default permissions",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:app:default"
  ]
}
```

- [ ] **Step 3.4: 验证编译**

Run: `cargo check`
Expected: 编译成功，无错误

- [ ] **Step 3.5: Commit**

```bash
git add src-tauri/src/commands.rs src-tauri/src/lib.rs src-tauri/capabilities/default.json
git commit -m "feat: Tauri commands for word quiz backend"
```

---

### Task 4: 前端 SPA 入口 + 全局样式

**Files:**
- Create: `src/index.html` (SPA 入口)
- Create: `src/css/style.css`
- Create: `src/js/app.js`

- [ ] **Step 4.1: 创建 `src/index.html` — SPA 主入口**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1920, height=1080, initial-scale=1.0">
<title>🐣 快乐背单词</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>

<!-- 花园背景 -->
<div class="garden-layer">
  <div class="cloud cloud-1"></div>
  <div class="cloud cloud-2"></div>
  <div class="sun"></div>
  <div class="grass-ground"></div>
</div>

<!-- SPA 容器 -->
<div id="app"></div>

<!-- 提示气泡 -->
<div class="hint-word-bubble" id="hint-bubble" style="display:none"></div>

<script src="js/app.js"></script>
<script src="js/home.js"></script>
<script src="js/quiz-fill.js"></script>
<script src="js/quiz-drag.js"></script>
<script src="js/result.js"></script>
<script src="js/history.js"></script>
</body>
</html>
```

- [ ] **Step 4.2: 创建 `src/css/style.css` — 完整花园童话风样式**

```css
/* ====== Design System: Garden Fairy Tale ====== */
:root {
  --mint: #66bb6a;
  --mint-light: #a5d6a7;
  --mint-pale: #c8e6c9;
  --blush: #f48fb1;
  --sunshine: #fff176;
  --sunshine-light: #fff9c4;
  --cream: #fffde7;
  --brown: #8d6e63;
  --brown-text: #5d4037;
  --white-card: #fffff9;
  --shadow-card: 0 8px 40px rgba(102, 187, 106, 0.15), 0 2px 8px rgba(0,0,0,0.06);
  --radius-sm: 12px;
  --radius-md: 20px;
  --radius-lg: 28px;
  --radius-xl: 56px;
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  width: 1920px; height: 1080px; overflow: hidden;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: linear-gradient(180deg, #e8f8e0 0%, #d4edc9 28%, #c8e6c9 55%, #a5d6a7 100%);
  display: flex; align-items: center; justify-content: center;
  user-select: none; position: relative;
}

/* ====== 花园背景 ====== */
.garden-layer { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.cloud {
  position: absolute; background: white; border-radius: 50%; opacity: 0.65;
  animation: cloud-drift 28s linear infinite;
}
.cloud::before, .cloud::after { content: ''; position: absolute; background: white; border-radius: 50%; }
.cloud-1 { width: 150px; height: 54px; top: 35px; left: 6%; border-radius: 54px; }
.cloud-1::before { width: 65px; height: 65px; top: -32px; left: 28px; }
.cloud-1::after  { width: 85px; height: 85px; top: -42px; left: 60px; }
.cloud-2 { width: 100px; height: 34px; top: 22px; left: 74%; border-radius: 34px; animation-delay: -14s; }
.cloud-2::before { width: 44px; height: 44px; top: -21px; left: 16px; }
.cloud-2::after  { width: 56px; height: 56px; top: -28px; left: 40px; }
@keyframes cloud-drift { 0% { transform: translateX(0); } 100% { transform: translateX(36px); } }
.sun {
  position: absolute; width: 80px; height: 80px; top: 28px; right: 10%;
  background: radial-gradient(circle, #fff9c4 0%, #fff176 40%, #ffee58 100%);
  border-radius: 50%;
  box-shadow: 0 0 50px rgba(255,241,118,0.5), 0 0 100px rgba(255,241,118,0.2);
  animation: sun-glow 4s ease-in-out infinite;
}
@keyframes sun-glow {
  0%,100% { box-shadow: 0 0 50px rgba(255,241,118,0.5),0 0 100px rgba(255,241,118,0.2); }
  50% { box-shadow: 0 0 70px rgba(255,241,118,0.7),0 0 140px rgba(255,241,118,0.35); }
}
.grass-ground {
  position: absolute; bottom: 0; left: 0; width: 100%; height: 70px;
  background: linear-gradient(180deg, #81c784 0%, #66bb6a 50%, #4caf50 100%);
  border-radius: 50% 50% 0 0 / 28px 28px 0 0;
}

/* ====== 提示单词气泡 ====== */
.hint-word-bubble {
  position: fixed; top: 24px; right: 24px; z-index: 30;
  background: white; border-radius: 24px; padding: 16px 28px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  font-size: 42px; font-weight: 800; color: #e65100;
  letter-spacing: 6px; border: 4px solid #ffcc80;
  animation: bubble-in 0.4s var(--ease-bounce);
  pointer-events: none;
}
.hint-word-bubble.fade-out { animation: bubble-out 0.5s ease forwards; }
@keyframes bubble-in { 0% { transform: scale(0.3); opacity:0; } 100% { transform: scale(1); opacity:1; } }
@keyframes bubble-out { 0% { transform: scale(1); opacity:1; } 100% { transform: scale(0.5); opacity:0; } }

/* ====== SPA 容器 ====== */
#app {
  position: relative; z-index: 2;
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%;
}

/* ====== 主卡片 ====== */
.main-card {
  position: relative;
  width: 720px;
  background: var(--white-card);
  border-radius: 44px;
  padding: 32px 44px 28px;
  box-shadow: var(--shadow-card);
  text-align: center;
  border: 3px solid var(--mint-pale);
}

/* 卡片顶部花环 */
.card-garland {
  position: absolute; top: -24px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 3px;
}
.garland-flower {
  width: 22px; height: 22px; border-radius: 50%;
  animation: garland-bounce 2s ease-in-out infinite;
}
.garland-flower:nth-child(1) { background:#f48fb1; animation-delay:0s; }
.garland-flower:nth-child(2) { background:#fff176; animation-delay:0.2s; }
.garland-flower:nth-child(3) { background:#81c784; animation-delay:0.4s; }
.garland-flower:nth-child(4) { background:#90caf9; animation-delay:0.6s; }
.garland-flower:nth-child(5) { background:#ce93d8; animation-delay:0.8s; }
.garland-flower:nth-child(6) { background:#ffab91; animation-delay:1.0s; }
.garland-flower:nth-child(7) { background:#f48fb1; animation-delay:1.2s; }
@keyframes garland-bounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-5px); } }

/* 卡片底部小草 */
.card-grass {
  position: absolute; bottom: -1px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 12px; pointer-events: none;
}
.grass-blade { width: 3px; background: #a5d6a7; border-radius: 50% 50% 0 0; animation: grass-sway 3s ease-in-out infinite; }
.grass-blade:nth-child(1) { height:22px; }
.grass-blade:nth-child(2) { height:28px; animation-delay:0.3s; }
.grass-blade:nth-child(3) { height:18px; animation-delay:0.6s; }
.grass-blade:nth-child(4) { height:25px; animation-delay:0.9s; }
.grass-blade:nth-child(5) { height:20px; animation-delay:1.2s; }
@keyframes grass-sway { 0%,100% { transform:rotate(-4deg); } 50% { transform:rotate(4deg); } }

/* ====== 顶部栏 ====== */
.top-bar {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px;
}
.score-badge {
  font-size: 18px; font-weight: 700; color: var(--brown-text);
  background: var(--cream); padding: 6px 18px;
  border-radius: 28px; border: 2px solid var(--sunshine-light);
}
.streak-badge {
  font-size: 17px; font-weight: 700; color: #e65100;
  background: #fff3e0; padding: 6px 16px;
  border-radius: 28px; border: 2px solid #ffe0b2;
}
.progress-dots {
  display: flex; gap: 6px; align-items: center;
}
.dot {
  width: 14px; height: 14px; border-radius: 50%;
  background: #e0e0e0; transition: all 0.4s ease;
}
.dot.done { background: #66bb6a; }
.dot.current { background: #fff176; box-shadow: 0 0 12px rgba(255,241,118,0.6); }

/* ====== 标题 ====== */
.title-area { margin-bottom: 8px; }
.app-icon { font-size: 42px; display: inline-block; animation: chick-bounce 2s ease-in-out infinite; }
@keyframes chick-bounce { 0%,100% { transform:translateY(0); } 30% { transform:translateY(-8px); } 50% { transform:translateY(0); } 70% { transform:translateY(-4px); } }
.title { font-size: 26px; font-weight: 800; color: var(--mint); letter-spacing: 3px; }

/* ====== 中文翻译 ====== */
.chinese-area { margin: 8px 0 12px; }
.chinese-badge {
  display: inline-block;
  font-size: 26px; font-weight: 800;
  color: #5d4037;
  background: linear-gradient(135deg, #fffde7, #fff9c4);
  padding: 8px 32px;
  border-radius: 32px;
  border: 3px solid #fff176;
  box-shadow: 0 3px 12px rgba(255,241,118,0.3);
}

/* ====== 单词展示 ====== */
.word-display {
  display: flex; justify-content: center; align-items: center;
  gap: 12px; margin: 12px 0 16px; flex-wrap: wrap;
}
.letter-box {
  width: 90px; height: 120px;
  display: flex; align-items: center; justify-content: center;
  font-size: 60px; font-weight: 800;
  border-radius: 24px;
  transition: all 0.3s var(--ease-bounce);
  position: relative;
}
.letter-shown {
  background: linear-gradient(180deg, #fffde7 0%, #fff9c4 100%);
  color: #5d4037;
  box-shadow: 0 6px 24px rgba(102,187,106,0.3);
  border: 3px solid #fff176;
}
.letter-blank {
  background: #f5f5f5;
  border: 3px dashed #a5d6a7;
  box-shadow: inset 0 3px 8px rgba(0,0,0,0.05);
  animation: pulse-blank 2.5s ease-in-out infinite;
  cursor: pointer;
}
.letter-blank::after {
  content: '?'; font-size: 44px; color: #c8e6c9; font-weight: 400;
}
.letter-blank.active {
  border-color: #ff7043; border-style: solid;
  box-shadow: 0 0 24px rgba(255,112,67,0.45);
  animation: none;
}
@keyframes pulse-blank { 0%,100% { border-color: #a5d6a7; } 50% { border-color: #66bb6a; } }
.letter-blank.filled {
  border: 3px solid #66bb6a;
  animation: none;
  color: #2e7d32;
  font-size: 60px;
  font-weight: 800;
  cursor: pointer;
}
.letter-blank.filled::after { content: ''; }
.letter-blank.filled.correct-fill {
  background: linear-gradient(180deg, #e8f5e9 0%, #c8e6c9 100%);
  box-shadow: 0 6px 20px rgba(102,187,106,0.5);
}
.letter-blank.filled.wrong-fill {
  border-color: #e53935;
  background: linear-gradient(180deg, #ffebee 0%, #ffcdd2 100%);
  color: #c62828;
}
/* 拖拽 hover */
.letter-blank.drag-over {
  border-color: #ff7043;
  border-style: solid;
  box-shadow: 0 0 28px rgba(255,112,67,0.5);
  animation: none;
  background: #fff3e0;
  transform: scale(1.08);
}

/* ====== 选项按钮 ====== */
.options-area { margin: 8px 0 4px; }
.options-label { font-size: 14px; color: #a5d6a7; margin-bottom: 8px; }
.options-row { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }
.option-btn {
  width: 70px; height: 70px;
  font-size: 36px; font-weight: 800;
  border: 3px solid #c8e6c9;
  border-radius: 20px;
  cursor: pointer;
  background: white;
  color: #5d4037;
  transition: all 0.2s var(--ease-bounce);
  box-shadow: 0 4px 14px rgba(0,0,0,0.06);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Segoe UI', 'PingFang SC', sans-serif;
}
.option-btn:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(102,187,106,0.25);
  border-color: var(--mint);
  background: #f1f8e9;
}
.option-btn:active { transform: scale(0.9); }
.option-btn.used {
  opacity: 0.3; pointer-events: none; transform: scale(0.85);
  border-color: #e0e0e0;
}

/* ====== 拖拽字母方块 ====== */
.drag-source-area { margin: 6px 0 4px; }
.drag-label { font-size: 14px; color: #a5d6a7; margin-bottom: 10px; }
.drag-tiles {
  display: flex; justify-content: center; gap: 14px; flex-wrap: wrap;
  min-height: 82px;
}
.drag-tile {
  width: 75px; height: 75px;
  display: flex; align-items: center; justify-content: center;
  font-size: 40px; font-weight: 800;
  border-radius: 20px;
  cursor: grab;
  background: linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%);
  color: #5d4037;
  border: 3px solid #c8e6c9;
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  transition: all 0.2s var(--ease-bounce);
  font-family: 'Segoe UI', 'PingFang SC', sans-serif;
}
.drag-tile:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(102,187,106,0.25);
  border-color: var(--mint);
}
.drag-tile:active { cursor: grabbing; }
.drag-tile.dragging { opacity: 0.4; transform: scale(0.85); }
.drag-tile.used { opacity: 0.2; pointer-events: none; transform: scale(0.8); }

/* ====== 控制按钮 ====== */
.controls-row {
  display: flex; justify-content: center; gap: 12px; margin-top: 12px;
}
.btn {
  height: 52px; padding: 0 26px;
  font-size: 18px; font-weight: 700;
  border: none; border-radius: 32px;
  cursor: pointer; outline: none;
  transition: all 0.2s var(--ease-bounce);
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.btn:active { transform: scale(0.94); }
.btn-hint {
  background: linear-gradient(135deg, #f48fb1, #ec407a);
  color: white;
  box-shadow: 0 4px 16px rgba(244,143,177,0.35);
}
.btn-hint:hover { box-shadow: 0 6px 24px rgba(244,143,177,0.5); transform: translateY(-2px); }
.btn-check {
  background: linear-gradient(135deg, #66bb6a, #43a047);
  color: white;
  box-shadow: 0 4px 16px rgba(102,187,106,0.35);
}
.btn-check:hover { box-shadow: 0 6px 24px rgba(102,187,106,0.5); transform: translateY(-2px); }
.btn-check:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
.btn-clear {
  background: white; color: #8d6e63;
  border: 2px solid #e0e0e0;
}
.btn-clear:hover { border-color: #a5d6a7; }
.btn-next {
  background: linear-gradient(135deg, #ffab91, #ff7043);
  color: white;
  box-shadow: 0 4px 16px rgba(255,171,145,0.35);
}
.btn-next:hover { box-shadow: 0 6px 24px rgba(255,171,145,0.5); transform: translateY(-2px); }
.btn-primary {
  background: linear-gradient(135deg, #66bb6a, #43a047);
  color: white;
  box-shadow: 0 4px 16px rgba(102,187,106,0.35);
  padding: 0 36px;
}
.btn-primary:hover { box-shadow: 0 6px 24px rgba(102,187,106,0.5); transform: translateY(-2px); }
.btn-secondary {
  background: white; color: #5d4037;
  border: 2px solid #a5d6a7;
}
.btn-secondary:hover { background: #f1f8e9; }

/* ====== 反馈 ====== */
.feedback {
  margin-top: 8px; min-height: 36px;
  font-size: 20px; font-weight: 700;
}
.feedback.correct { color: #43a047; }
.feedback.wrong { color: #e53935; animation: shake 0.5s ease; }
@keyframes shake { 0%,100% { transform:translateX(0); } 25% { transform:translateX(-8px); } 75% { transform:translateX(8px); } }

/* ====== 撒花 ====== */
.confetti-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 20; }
.petal-piece {
  position: absolute; border-radius: 50% 0 50% 0;
  animation: petal-fall 2s ease-out forwards;
}
@keyframes petal-fall {
  0%   { transform: translateY(-60px) rotate(0deg) scale(0.5); opacity:1; }
  100% { transform: translateY(850px) rotate(400deg) scale(0.3); opacity:0; }
}
.score-popup {
  position: fixed; z-index: 21; pointer-events: none;
  font-size: 48px; font-weight: 800; color: #43a047;
  animation: pop-up 1s ease-out forwards;
  text-shadow: 0 2px 8px rgba(67,160,71,0.3);
}
@keyframes pop-up { 0% { transform:translateY(0) scale(0.3); opacity:1; } 100% { transform:translateY(-150px) scale(1.5); opacity:0; } }

/* ====== 首页专属 ====== */
.home-card { width: 780px; }
.home-stats {
  display: flex; justify-content: center; gap: 24px; margin: 16px 0;
}
.stat-item {
  background: var(--cream); padding: 12px 20px;
  border-radius: 20px; border: 2px solid var(--sunshine-light);
  font-size: 16px; font-weight: 600; color: var(--brown-text);
  min-width: 120px;
}
.stat-item .stat-value { font-size: 28px; color: var(--mint); display: block; }
.settings-group {
  display: flex; flex-direction: column; gap: 12px; margin: 16px 0; text-align: left;
}
.setting-row {
  display: flex; align-items: center; gap: 16px;
}
.setting-row label {
  width: 100px; font-size: 18px; font-weight: 600; color: var(--brown-text); text-align: right;
}
.setting-row select, .setting-row input {
  padding: 10px 16px; font-size: 18px;
  border: 2px solid var(--mint-pale); border-radius: 16px;
  background: white; color: var(--brown-text);
  font-family: inherit;
  flex: 1; max-width: 240px;
}
.setting-row select:focus, .setting-row input:focus {
  outline: none; border-color: var(--mint); box-shadow: 0 0 0 3px rgba(102,187,106,0.2);
}
.home-buttons {
  display: flex; justify-content: center; gap: 16px; margin-top: 20px;
}

/* ====== 结果页 ====== */
.result-score {
  font-size: 72px; font-weight: 800; color: var(--mint);
  margin: 16px 0;
}
.result-detail { font-size: 22px; color: var(--brown-text); margin-bottom: 12px; }
.result-list {
  text-align: left; margin: 12px 0;
  max-height: 240px; overflow-y: auto;
}
.result-item {
  padding: 8px 16px; margin: 4px 0;
  border-radius: 12px; font-size: 18px;
}
.result-item.correct { background: #e8f5e9; color: #2e7d32; }
.result-item.wrong { background: #ffebee; color: #c62828; }
.result-buttons { display: flex; justify-content: center; gap: 16px; margin-top: 12px; }

/* ====== 历史/错题页 ====== */
.history-card { width: 840px; max-height: 760px; overflow-y: auto; }
.page-title { font-size: 24px; font-weight: 800; color: var(--mint); margin-bottom: 12px; }
.history-table { width: 100%; border-collapse: collapse; margin: 12px 0; }
.history-table th {
  background: var(--mint-pale); color: var(--brown-text); padding: 10px 12px;
  font-size: 16px; text-align: left;
}
.history-table td {
  padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-size: 16px;
}
.wrong-list { text-align: left; margin: 8px 0; }
.wrong-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 16px; margin: 4px 0;
  background: #fff3e0; border-radius: 12px; border-left: 4px solid #ff9800;
  font-size: 18px;
}
.wrong-item .word-info { font-weight: 700; color: var(--brown-text); }
.wrong-item .word-count { color: #e65100; font-size: 14px; }

/* ====== 页面切换 ====== */
.page-view { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
.page-view.hidden { display: none; }
```

- [ ] **Step 4.3: 创建 `src/js/app.js` — SPA 路由和全局状态**

```js
// ====== SPA Router ======
const App = {
  settings: {
    grade: 'grade1',
    wordCount: 10,
    quizType: 'mixed',
  },
  quizState: null, // { words, currentIndex, score, streak, results, ... }

  // 页面引用
  pages: {},

  init() {
    // 加载默认设置
    const saved = localStorage.getItem('vocab_settings');
    if (saved) Object.assign(this.settings, JSON.parse(saved));

    this.bindNavigation();
    this.navigate('home');
  },

  saveSettings() {
    localStorage.setItem('vocab_settings', JSON.stringify(this.settings));
  },

  // 显示隐藏页面
  navigate(page, data) {
    document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
    let target = document.getElementById(`page-${page}`);
    if (!target) {
      console.error(`Page ${page} not found`);
      return;
    }
    target.classList.remove('hidden');
    // 触发页面的 onShow 回调
    if (this.pages[page] && this.pages[page].onShow) {
      this.pages[page].onShow(data);
    }
  },

  // 用 Tauri invoke 包装器
  async invoke(cmd, args = {}) {
    if (window.__TAURI__) {
      const { invoke } = window.__TAURI__.core;
      return await invoke(cmd, args);
    }
    // 回退：非 Tauri 环境返回空数据
    console.warn('Tauri not available, returning mock data');
    return null;
  },

  // 语音播报
  speak(text) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US'; utter.rate = 0.85; utter.pitch = 1.1;
    speechSynthesis.speak(utter);
  },

  // 提示气泡
  showHintBubble(word, duration = 3000) {
    const bubble = document.getElementById('hint-bubble');
    if (!bubble) return;
    clearTimeout(this._hintTimer);
    bubble.textContent = word.toUpperCase();
    bubble.style.display = 'block';
    bubble.classList.remove('fade-out');
    this._hintTimer = setTimeout(() => {
      bubble.classList.add('fade-out');
      setTimeout(() => { bubble.style.display = 'none'; }, 500);
    }, duration);
  },

  // 撒花
  spawnPetals() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    const colors = ['#f48fb1','#ce93d8','#fff176','#81c784','#90caf9','#ffab91'];
    for (let i = 0; i < 30; i++) {
      const petal = document.createElement('div');
      petal.className = 'petal-piece';
      petal.style.left = Math.random() * 100 + '%';
      petal.style.top = -(Math.random() * 60) + 'px';
      petal.style.width = (10 + Math.random() * 16) + 'px';
      petal.style.height = (10 + Math.random() * 16) + 'px';
      petal.style.background = colors[Math.floor(Math.random() * colors.length)];
      petal.style.animationDelay = Math.random() * 0.8 + 's';
      petal.style.animationDuration = (1.4 + Math.random() * 2) + 's';
      container.appendChild(petal);
    }
    document.body.appendChild(container);
    setTimeout(() => container.remove(), 3000);
  },

  // 分数弹出
  showScorePopup(text) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = text;
    popup.style.left = (35 + Math.random() * 30) + '%';
    popup.style.top = '40%';
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1200);
  },

  bindNavigation() {
    document.addEventListener('click', (e) => {
      // 导航链接 data-nav="pageName"
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        e.preventDefault();
        this.navigate(nav.dataset.nav);
      }
    });
  },

  // 生成字母选项
  generateOptions(word, blanks) {
    const missing = blanks.map(i => word.word[i].toUpperCase());
    const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let options = [...missing];
    const target = Math.max(6, missing.length + 2);
    while (options.length < target) {
      const rnd = allLetters[Math.floor(Math.random() * 26)];
      if (!options.includes(rnd)) options.push(rnd);
    }
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return options;
  },
};

// 启动
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
```

- [ ] **Step 4.4: Commit**

```bash
git add src/index.html src/css/style.css src/js/app.js
git commit -m "feat: SPA shell with router, global styles, garden theme"
```

---

### Task 5: 首页界面和逻辑

**Files:**
- Create: `src/js/home.js`

- [ ] **Step 5.1: 在 `src/js/home.js` 中实现首页**

首页内容动态渲染到 `#page-home` 中，包含：
- 年级选择 (grade1~grade6)
- 单词数量设置 (5/10/15/20)
- 题型选择 (填空/拖拽/混合)
- 首页统计（今日背了多少、连对天数、待复习错题数）
- 三个按钮：开始测验 / 历史记录 / 复习错题

```js
// ====== 首页 ======
(function() {
  const pageId = 'home';

  function render() {
    const settings = App.settings;
    const gradeNames = {
      grade1: '一年级', grade2: '二年级', grade3: '三年级',
      grade4: '四年级', grade5: '五年级', grade6: '六年级'
    };

    App.pages[pageId] = {
      onShow: async () => {
        // 加载统计
        const stats = await App.invoke('get_home_stats');
        const container = document.getElementById('page-home');
        if (!container) return;

        container.innerHTML = `
          <div class="main-card home-card">
            <div class="card-garland">
              ${'<div class="garland-flower"></div>'.repeat(7)}
            </div>
            <div class="card-grass">
              ${'<div class="grass-blade"></div>'.repeat(5)}
            </div>

            <!-- 标题 -->
            <div class="title-area">
              <span class="app-icon">🐣</span>
              <span class="title">快乐背单词</span>
            </div>

            <!-- 统计 -->
            <div class="home-stats">
              <div class="stat-item">
                今日完成 <span class="stat-value">${stats ? stats.today_completed + '/' + stats.today_target : '-'}</span>
              </div>
              <div class="stat-item">
                连续打卡 <span class="stat-value">🔥 ${stats ? stats.checkin_days : '-'} 天</span>
              </div>
              <div class="stat-item">
                待复习 <span class="stat-value">📝 ${stats ? stats.wrong_count : '-'} 个</span>
              </div>
            </div>

            <!-- 设置 -->
            <div class="settings-group">
              <div class="setting-row">
                <label>年 级</label>
                <select id="sel-grade">
                  ${Object.entries(gradeNames).map(([k, v]) =>
                    `<option value="${k}" ${settings.grade === k ? 'selected' : ''}>${v}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="setting-row">
                <label>单词数量</label>
                <select id="sel-count">
                  ${[5, 10, 15, 20].map(n =>
                    `<option value="${n}" ${settings.wordCount === n ? 'selected' : ''}>每天 ${n} 个</option>`
                  ).join('')}
                </select>
              </div>
              <div class="setting-row">
                <label>题 型</label>
                <select id="sel-type">
                  <option value="fill" ${settings.quizType === 'fill' ? 'selected' : ''}>填空模式</option>
                  <option value="drag" ${settings.quizType === 'drag' ? 'selected' : ''}>拖拽模式</option>
                  <option value="mixed" ${settings.quizType === 'mixed' ? 'selected' : ''}>混合模式（推荐）</option>
                </select>
              </div>
            </div>

            <!-- 按钮 -->
            <div class="home-buttons">
              <button class="btn btn-primary" id="btn-start">🌸 开始测验</button>
              <button class="btn btn-secondary" data-nav="history">📖 历史记录</button>
              <button class="btn btn-secondary" data-nav="history" id="btn-review-wrong">📕 复习错题</button>
            </div>
          </div>
        `;

        // 保存设置事件
        document.getElementById('sel-grade').onchange = (e) => {
          App.settings.grade = e.target.value;
          App.saveSettings();
        };
        document.getElementById('sel-count').onchange = (e) => {
          App.settings.wordCount = parseInt(e.target.value);
          App.saveSettings();
        };
        document.getElementById('sel-type').onchange = (e) => {
          App.settings.quizType = e.target.value;
          App.saveSettings();
        };

        // 开始测验
        document.getElementById('btn-start').onclick = async () => {
          const grade = App.settings.grade;
          const count = App.settings.wordCount;
          const words = await App.invoke('get_words', { grade, count });
          if (!words || words.length === 0) {
            alert('该年级还没有单词，请选择其他年级');
            return;
          }
          App.quizState = {
            words,
            currentIndex: 0,
            score: 0,
            streak: 0,
            hintUsed: false,
            results: [],
            totalQuestions: words.length,
          };
          // 确定题型
          App.quizState.mode = App.settings.quizType;
          App.navigate('quiz-fill');
        };

        // 复习错题
        document.getElementById('btn-review-wrong').onclick = () => {
          App.navigate('history', { tab: 'wrong' });
        };
      }
    };

    // 首次渲染
    const container = document.createElement('div');
    container.id = `page-${pageId}`;
    container.className = 'page-view';
    document.getElementById('app').appendChild(container);
    App.pages[pageId].onShow();
  }

  // 等 DOM 就绪
  if (document.getElementById('app')) {
    render();
  } else {
    document.addEventListener('DOMContentLoaded', render);
  }
})();
```

- [ ] **Step 5.2: Commit**

```bash
git add src/js/home.js
git commit -m "feat: home page with grade/type/count settings and stats"
```

---

### Task 6: 填空测验页面

**Files:**
- Create: `src/js/quiz-fill.js`

- [ ] **Step 6.1: 创建 `src/js/quiz-fill.js` — 填空模式测验**

此页面改编自 `design/garden-theme-v3.html`，改为使用 `App.quizState` 中的单词数据，通过 Tauri IPC 取词，测验完成后自动导航到结果页。

```js
// ====== 填空测验页 ======
(function() {
  const pageId = 'quiz-fill';

  const pageHTML = `
    <div class="main-card">
      <div class="card-garland">${'<div class="garland-flower"></div>'.repeat(7)}</div>
      <div class="card-grass">${'<div class="grass-blade"></div>'.repeat(5)}</div>

      <div class="top-bar">
        <div class="score-badge">⭐ 得分 <span id="q-score">0</span></div>
        <div class="progress-dots" id="q-progress"></div>
        <div class="streak-badge" style="display:none" id="q-streak-badge">🔥 连对 <span id="q-streak">0</span></div>
      </div>

      <div class="title-area">
        <span class="app-icon">🐣</span>
        <span class="title">快乐背单词 — 填空</span>
      </div>

      <div class="chinese-area">
        <div class="chinese-badge" id="q-chinese">💬 单词</div>
      </div>

      <div class="word-display" id="q-word-display"></div>
      <div class="feedback" id="q-feedback"></div>

      <div class="options-area">
        <div class="options-label">👇 点击下方字母填入空白处（点击已填字母可撤回）</div>
        <div class="options-row" id="q-options-row"></div>
      </div>

      <div class="controls-row" id="q-controls">
        <button class="btn btn-clear" onclick="QuizFill.clearBlanks()">🔄 清空</button>
        <button class="btn btn-hint" id="q-btn-hint" onclick="QuizFill.showHint()">🔊 提示</button>
        <button class="btn btn-check" id="q-btn-check" onclick="QuizFill.checkAnswer()" disabled>✅ 检查</button>
      </div>
    </div>
  `;

  const QuizFill = {
    blankPositions: [],
    blankValues: [],
    optionLetters: [],
    answered: false,
    hintUsed: false,
    autoNextTimer: null,

    onShow() {
      const container = document.getElementById(`page-${pageId}`);
      if (!container) return;
      container.innerHTML = pageHTML;

      // 如果不是填空模式，看是否需要切换到拖拽
      if (App.quizState && App.quizState.mode === 'drag') {
        App.navigate('quiz-drag');
        return;
      }
      if (App.quizState && App.quizState.mode === 'mixed') {
        // 混合：奇数题填空，偶数题拖拽
        if (App.quizState.currentIndex % 2 === 1) {
          App.navigate('quiz-drag');
          return;
        }
      }

      this.updateScore();
      this.renderWord();
    },

    getCurrentWord() {
      return App.quizState.words[App.quizState.currentIndex];
    },

    renderWord() {
      this.answered = false;
      this.hintUsed = false;
      this.blankValues = [];
      clearTimeout(this.autoNextTimer);
      document.getElementById('hint-bubble').style.display = 'none';
      document.getElementById('q-feedback').textContent = '';
      document.getElementById('q-feedback').className = 'feedback';
      document.getElementById('q-btn-check').disabled = true;
      document.getElementById('q-btn-hint').disabled = false;

      const oldNext = document.getElementById('q-next-btn');
      if (oldNext) oldNext.remove();

      // 恢复选项按钮样式
      document.querySelectorAll('#q-options-row .option-btn').forEach(b => {
        b.style.pointerEvents = ''; b.style.opacity = '';
      });

      const wordObj = this.getCurrentWord();
      if (!wordObj) return;
      const word = wordObj.word;
      const len = word.length;

      // 生成空位 (随机约1/3的字母)
      let numBlanks = Math.min(Math.max(1, Math.ceil(len * 0.35)), 3, len - 1);
      let allPos = Array.from({length: len}, (_, i) => i);
      for (let i = allPos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allPos[i], allPos[j]] = [allPos[j], allPos[i]];
      }
      this.blankPositions = allPos.slice(0, numBlanks).sort((a, b) => a - b);
      this.blankValues = new Array(this.blankPositions.length).fill(null);

      // 渲染单词字母
      const display = document.getElementById('q-word-display');
      display.innerHTML = '';
      for (let i = 0; i < len; i++) {
        const box = document.createElement('div');
        box.className = 'letter-box';
        const blankIdx = this.blankPositions.indexOf(i);
        if (blankIdx >= 0) {
          box.className += ' letter-blank';
          box.dataset.blankIdx = blankIdx;
        } else {
          box.className += ' letter-shown';
          box.textContent = word[i].toUpperCase();
        }
        display.appendChild(box);
      }

      // 中文
      document.getElementById('q-chinese').textContent = '💬 ' + wordObj.chinese;

      // 生成选项
      this.optionLetters = App.generateOptions(wordObj, this.blankPositions);
      this.renderOptions();

      // 高亮第一个空位
      if (this.blankPositions.length > 0) this.focusBlank(0);

      this.updateProgress();
    },

    renderOptions() {
      const row = document.getElementById('q-options-row');
      row.innerHTML = '';
      this.optionLetters.forEach((letter) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.dataset.letter = letter;
        btn.textContent = letter;
        row.appendChild(btn);
      });
    },

    focusBlank(idx) {
      if (this.answered) return;
      document.querySelectorAll('#q-word-display .letter-blank').forEach(b => b.classList.remove('active'));
      const blanks = document.querySelectorAll('#q-word-display .letter-blank');
      if (blanks[idx]) blanks[idx].classList.add('active');
    },

    firstUnfilledIdx() {
      for (let i = 0; i < this.blankValues.length; i++) {
        if (this.blankValues[i] === null) return i;
      }
      return -1;
    },

    handleBlankClick(blankIdx) {
      if (this.answered) return;
      if (this.blankValues[blankIdx] !== null) {
        const letter = this.blankValues[blankIdx];
        this.blankValues[blankIdx] = null;
        const blanks = document.querySelectorAll('#q-word-display .letter-blank');
        blanks[blankIdx].classList.remove('filled', 'correct-fill', 'wrong-fill');
        blanks[blankIdx].textContent = '';
        blanks[blankIdx].classList.add('active');
        // 恢复选项
        const optBtns = document.querySelectorAll('#q-options-row .option-btn');
        for (const btn of optBtns) {
          if (btn.dataset.letter === letter && btn.classList.contains('used')) {
            btn.classList.remove('used');
            break;
          }
        }
        this.focusBlank(blankIdx);
        if (this.firstUnfilledIdx() !== -1) {
          document.getElementById('q-btn-check').disabled = true;
        }
      } else {
        this.focusBlank(blankIdx);
      }
    },

    selectOption(letter) {
      if (this.answered) return;
      const targetIdx = this.firstUnfilledIdx();
      if (targetIdx === -1) return;

      this.blankValues[targetIdx] = letter;
      const blanks = document.querySelectorAll('#q-word-display .letter-blank');
      blanks[targetIdx].classList.add('filled');
      blanks[targetIdx].textContent = letter;
      blanks[targetIdx].classList.remove('active');

      // 标记选项
      const optBtns = document.querySelectorAll('#q-options-row .option-btn');
      for (const btn of optBtns) {
        if (btn.dataset.letter === letter && !btn.classList.contains('used')) {
          btn.classList.add('used');
          break;
        }
      }

      const next = this.firstUnfilledIdx();
      if (next !== -1) {
        this.focusBlank(next);
      } else {
        document.getElementById('q-btn-check').disabled = false;
      }
    },

    clearBlanks() {
      if (this.answered) return;
      this.blankValues = this.blankValues.map(() => null);
      const blanks = document.querySelectorAll('#q-word-display .letter-blank');
      blanks.forEach(b => {
        b.classList.remove('filled', 'correct-fill', 'wrong-fill', 'active');
        b.textContent = '';
      });
      document.querySelectorAll('#q-options-row .option-btn').forEach(b => b.classList.remove('used'));
      document.getElementById('q-btn-check').disabled = true;
      this.focusBlank(0);
    },

    showHint() {
      if (this.answered) return;
      this.hintUsed = true;
      document.getElementById('q-btn-hint').disabled = true;

      const wordObj = this.getCurrentWord();
      App.speak(wordObj.word);
      App.showHintBubble(wordObj.word);

      const targetIdx = this.firstUnfilledIdx();
      if (targetIdx === -1) return;

      const correctLetter = wordObj.word[this.blankPositions[targetIdx]].toUpperCase();
      this.blankValues[targetIdx] = correctLetter;

      const blanks = document.querySelectorAll('#q-word-display .letter-blank');
      blanks[targetIdx].classList.add('filled');
      blanks[targetIdx].textContent = correctLetter;

      const optBtns = document.querySelectorAll('#q-options-row .option-btn');
      for (const btn of optBtns) {
        if (btn.dataset.letter === correctLetter && !btn.classList.contains('used')) {
          btn.classList.add('used');
          break;
        }
      }

      const next = this.firstUnfilledIdx();
      if (next !== -1) {
        this.focusBlank(next);
      } else {
        document.getElementById('q-btn-check').disabled = false;
      }
    },

    checkAnswer() {
      if (this.answered) return;
      this.answered = true;
      clearTimeout(this.autoNextTimer);

      const wordObj = this.getCurrentWord();
      const correctWord = wordObj.word.toUpperCase();
      const feedback = document.getElementById('q-feedback');

      let userWordArr = wordObj.word.toUpperCase().split('');
      this.blankPositions.forEach((pos, i) => {
        userWordArr[pos] = this.blankValues[i] || '';
      });
      const userWord = userWordArr.join('');
      const blanks = document.querySelectorAll('#q-word-display .letter-blank');

      // 禁用交互
      document.querySelectorAll('#q-options-row .option-btn').forEach(b => {
        b.style.pointerEvents = 'none'; b.style.opacity = '0.5';
      });
      document.getElementById('q-btn-check').disabled = true;
      document.getElementById('q-btn-hint').disabled = true;

      const isCorrect = userWord === correctWord;
      const bonus = isCorrect ? (this.hintUsed ? 5 : 10) : 0;
      const streak = App.quizState.streak;

      if (isCorrect) {
        feedback.className = 'feedback correct';
        let totalBonus = bonus;
        if (streak >= 3) totalBonus += 5;
        App.quizState.score += totalBonus;
        App.quizState.streak++;
        feedback.innerHTML = `🎉 太棒了！+${totalBonus}分 正确答案：<strong>${correctWord}</strong>`;
        blanks.forEach(b => b.classList.add('correct-fill'));
        App.spawnPetals();
        App.showScorePopup('+' + totalBonus);
      } else {
        feedback.className = 'feedback wrong';
        feedback.innerHTML = `😢 再试试哦~ 正确答案：<strong>${correctWord}</strong>`;
        App.quizState.streak = 0;
        this.blankPositions.forEach((pos, i) => {
          const c = correctWord[pos];
          blanks[i].textContent = c;
          blanks[i].classList.add(this.blankValues[i] === c ? 'correct-fill' : 'wrong-fill');
        });
      }

      // 记录结果
      App.quizState.results.push({
        word: wordObj.word,
        chinese: wordObj.chinese,
        correct: isCorrect,
        hintUsed: this.hintUsed,
      });

      // 更新得分显示
      this.updateScore();
      this.updateProgress();

      // 下一题按钮
      const ctrl = document.getElementById('q-controls');
      const nextBtn = document.createElement('button');
      nextBtn.id = 'q-next-btn';
      nextBtn.className = 'btn btn-next';
      nextBtn.textContent = '🌸 下一题';
      nextBtn.onclick = () => this.nextWord();
      ctrl.appendChild(nextBtn);

      if (isCorrect) {
        this.autoNextTimer = setTimeout(() => this.nextWord(), 1500);
      }
    },

    nextWord() {
      clearTimeout(this.autoNextTimer);
      const nb = document.getElementById('q-next-btn');
      if (nb) nb.remove();

      App.quizState.currentIndex++;
      if (App.quizState.currentIndex >= App.quizState.totalQuestions) {
        // 测验结束，导航到结果页
        App.navigate('result');
        return;
      }

      // 重入 onShow（以处理混合模式切换）
      this.onShow();
    },

    updateScore() {
      document.getElementById('q-score').textContent = App.quizState.score;
      const streak = App.quizState.streak;
      if (streak >= 2) {
        const sb = document.getElementById('q-streak-badge');
        if (sb) {
          sb.style.display = 'block';
          document.getElementById('q-streak').textContent = streak;
        }
      } else {
        const sb = document.getElementById('q-streak-badge');
        if (sb) sb.style.display = 'none';
      }
    },

    updateProgress() {
      const container = document.getElementById('q-progress');
      if (!container) return;
      container.innerHTML = '';
      for (let i = 0; i < App.quizState.totalQuestions; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        if (i < App.quizState.currentIndex) dot.classList.add('done');
        if (i === App.quizState.currentIndex) dot.classList.add('current');
        container.appendChild(dot);
      }
    },
  };

  // 事件委托
  document.addEventListener('click', (e) => {
    const page = document.getElementById(`page-${pageId}`);
    if (!page || page.classList.contains('hidden')) return;

    // 选项按钮点击
    const optBtn = e.target.closest('#q-options-row .option-btn');
    if (optBtn && !optBtn.classList.contains('used')) {
      QuizFill.selectOption(optBtn.dataset.letter);
      return;
    }
    // 空白格点击
    const blankBox = e.target.closest('#q-word-display .letter-blank');
    if (blankBox && blankBox.dataset.blankIdx !== undefined) {
      QuizFill.handleBlankClick(parseInt(blankBox.dataset.blankIdx));
      return;
    }
  });

  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    const page = document.getElementById(`page-${pageId}`);
    if (!page || page.classList.contains('hidden')) return;
    if (e.key === 'Enter') {
      const nb = document.getElementById('q-next-btn');
      if (nb) {
        clearTimeout(QuizFill.autoNextTimer);
        QuizFill.nextWord();
      } else if (!QuizFill.answered && QuizFill.firstUnfilledIdx() === -1) {
        QuizFill.checkAnswer();
      }
    }
    if (!QuizFill.answered && e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key) - 1;
      const allBtns = document.querySelectorAll('#q-options-row .option-btn');
      if (idx < allBtns.length && !allBtns[idx].classList.contains('used')) {
        QuizFill.selectOption(allBtns[idx].dataset.letter);
      }
    }
  });

  // 暴露给 HTML onclick
  window.QuizFill = QuizFill;

  // 创建页面容器
  const container = document.createElement('div');
  container.id = `page-${pageId}`;
  container.className = 'page-view hidden';
  document.getElementById('app').appendChild(container);
  App.pages[pageId] = QuizFill;
})();
```

- [ ] **Step 6.2: Commit**

```bash
git add src/js/quiz-fill.js
git commit -m "feat: fill-in-the-blank quiz page"
```

---

### Task 7: 拖拽测验页面

**Files:**
- Create: `src/js/quiz-drag.js`

- [ ] **Step 7.1: 创建 `src/js/quiz-drag.js` — 拖拽拼词模式**

改编自 `design/garden-theme-drag.html`，对齐填空页的接口。

```js
// ====== 拖拽测验页 ======
(function() {
  const pageId = 'quiz-drag';

  const QuizDrag = {
    blankPositions: [],
    blankValues: [],
    optionLetters: [],
    answered: false,
    hintUsed: false,
    autoNextTimer: null,

    onShow() {
      const container = document.getElementById(`page-${pageId}`);
      if (!container) return;

      // 如果不是 drag 模式且不是 mixed，跳过
      if (App.quizState && App.quizState.mode === 'fill') {
        App.navigate('quiz-fill');
        return;
      }
      if (App.quizState && App.quizState.mode === 'mixed') {
        if (App.quizState.currentIndex % 2 === 0) {
          App.navigate('quiz-fill');
          return;
        }
      }

      container.innerHTML = `
        <div class="main-card">
          <div class="card-garland">${'<div class="garland-flower"></div>'.repeat(7)}</div>
          <div class="card-grass">${'<div class="grass-blade"></div>'.repeat(5)}</div>

          <div class="top-bar">
            <div class="score-badge">⭐ 得分 <span id="qd-score">0</span></div>
            <div class="progress-dots" id="qd-progress"></div>
            <div class="streak-badge" style="display:none" id="qd-streak-badge">🔥 连对 <span id="qd-streak">0</span></div>
          </div>

          <div class="title-area">
            <span class="app-icon">🐣</span>
            <span class="title">快乐背单词 — 拖拽拼写</span>
          </div>

          <div class="chinese-area">
            <div class="chinese-badge" id="qd-chinese">💬 单词</div>
          </div>

          <div class="word-display" id="qd-word-display"></div>
          <div class="feedback" id="qd-feedback"></div>

          <div class="drag-source-area">
            <div class="drag-label">🖐️ 把下方字母拖到单词空白处（点击已填字母可撤回）</div>
            <div class="drag-tiles" id="qd-drag-tiles"></div>
          </div>

          <div class="controls-row" id="qd-controls">
            <button class="btn btn-clear" onclick="QuizDrag.clearBlanks()">🔄 清空</button>
            <button class="btn btn-hint" id="qd-btn-hint" onclick="QuizDrag.showHint()">🔊 提示</button>
            <button class="btn btn-check" id="qd-btn-check" onclick="QuizDrag.checkAnswer()" disabled>✅ 检查</button>
          </div>
        </div>
      `;

      this.updateScore();
      this.renderWord();
    },

    getCurrentWord() {
      return App.quizState.words[App.quizState.currentIndex];
    },

    renderWord() {
      this.answered = false;
      this.hintUsed = false;
      this.blankValues = [];
      clearTimeout(this.autoNextTimer);
      document.getElementById('hint-bubble').style.display = 'none';
      document.getElementById('qd-feedback').textContent = '';
      document.getElementById('qd-feedback').className = 'feedback';
      document.getElementById('qd-btn-check').disabled = true;
      document.getElementById('qd-btn-hint').disabled = false;

      const oldNext = document.getElementById('qd-next-btn');
      if (oldNext) oldNext.remove();

      const wordObj = this.getCurrentWord();
      if (!wordObj) return;
      const word = wordObj.word;
      const len = word.length;

      let numBlanks = Math.min(Math.max(1, Math.ceil(len * 0.35)), 3, len - 1);
      let allPos = Array.from({length: len}, (_, i) => i);
      for (let i = allPos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allPos[i], allPos[j]] = [allPos[j], allPos[i]];
      }
      this.blankPositions = allPos.slice(0, numBlanks).sort((a, b) => a - b);
      this.blankValues = new Array(this.blankPositions.length).fill(null);

      // 单词展示
      const display = document.getElementById('qd-word-display');
      display.innerHTML = '';
      for (let i = 0; i < len; i++) {
        const box = document.createElement('div');
        box.className = 'letter-box';
        const blankIdx = this.blankPositions.indexOf(i);
        if (blankIdx >= 0) {
          box.className += ' letter-blank';
          box.dataset.blankIdx = blankIdx;
          // 拖拽事件
          box.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (this.answered || this.blankValues[blankIdx] !== null) return;
            box.classList.add('drag-over');
          });
          box.addEventListener('dragleave', () => box.classList.remove('drag-over'));
          box.addEventListener('drop', (e) => {
            e.preventDefault();
            box.classList.remove('drag-over');
            if (this.answered || this.blankValues[blankIdx] !== null) return;
            const letter = e.dataTransfer.getData('text/plain');
            if (letter) this.fillBlankViaDrag(blankIdx, letter);
          });
          box.addEventListener('click', () => this.handleBlankClick(blankIdx));
        } else {
          box.className += ' letter-shown';
          box.textContent = word[i].toUpperCase();
        }
        display.appendChild(box);
      }

      document.getElementById('qd-chinese').textContent = '💬 ' + wordObj.chinese;

      this.optionLetters = App.generateOptions(wordObj, this.blankPositions);
      this.renderDragTiles();
      this.updateProgress();
    },

    renderDragTiles() {
      const container = document.getElementById('qd-drag-tiles');
      container.innerHTML = '';
      this.optionLetters.forEach((letter) => {
        const tile = document.createElement('div');
        tile.className = 'drag-tile';
        tile.textContent = letter;
        tile.draggable = true;
        tile.dataset.letter = letter;
        tile.addEventListener('dragstart', (e) => {
          if (this.answered || tile.classList.contains('used')) {
            e.preventDefault();
            return;
          }
          tile.classList.add('dragging');
          e.dataTransfer.setData('text/plain', letter);
          e.dataTransfer.effectAllowed = 'move';
        });
        tile.addEventListener('dragend', () => tile.classList.remove('dragging'));
        container.appendChild(tile);
      });
    },

    fillBlankViaDrag(blankIdx, letter) {
      if (this.answered) return;
      const tiles = document.querySelectorAll('#qd-drag-tiles .drag-tile');
      let foundTile = null;
      for (const tile of tiles) {
        if (tile.dataset.letter === letter && !tile.classList.contains('used')) {
          foundTile = tile;
          break;
        }
      }
      if (!foundTile) return;

      this.blankValues[blankIdx] = letter;
      const blanks = document.querySelectorAll('#qd-word-display .letter-blank');
      blanks[blankIdx].classList.add('filled');
      blanks[blankIdx].textContent = letter;
      foundTile.classList.add('used');

      if (this.blankValues.every(v => v !== null)) {
        document.getElementById('qd-btn-check').disabled = false;
      }
    },

    handleBlankClick(blankIdx) {
      if (this.answered) return;
      if (this.blankValues[blankIdx] === null) return;
      const letter = this.blankValues[blankIdx];
      this.blankValues[blankIdx] = null;
      const blanks = document.querySelectorAll('#qd-word-display .letter-blank');
      blanks[blankIdx].classList.remove('filled', 'correct-fill', 'wrong-fill');
      blanks[blankIdx].textContent = '';
      const tiles = document.querySelectorAll('#qd-drag-tiles .drag-tile');
      for (const tile of tiles) {
        if (tile.dataset.letter === letter && tile.classList.contains('used')) {
          tile.classList.remove('used');
          break;
        }
      }
      document.getElementById('qd-btn-check').disabled = true;
    },

    clearBlanks() {
      if (this.answered) return;
      this.blankValues = this.blankValues.map(() => null);
      document.querySelectorAll('#qd-word-display .letter-blank').forEach(b => {
        b.classList.remove('filled', 'correct-fill', 'wrong-fill');
        b.textContent = '';
      });
      document.querySelectorAll('#qd-drag-tiles .drag-tile').forEach(t => t.classList.remove('used'));
      document.getElementById('qd-btn-check').disabled = true;
    },

    showHint() {
      if (this.answered) return;
      this.hintUsed = true;
      document.getElementById('qd-btn-hint').disabled = true;

      const wordObj = this.getCurrentWord();
      App.speak(wordObj.word);
      App.showHintBubble(wordObj.word);

      const targetIdx = this.blankValues.findIndex(v => v === null);
      if (targetIdx === -1) return;

      const correctLetter = wordObj.word[this.blankPositions[targetIdx]].toUpperCase();
      this.blankValues[targetIdx] = correctLetter;
      const blanks = document.querySelectorAll('#qd-word-display .letter-blank');
      blanks[targetIdx].classList.add('filled');
      blanks[targetIdx].textContent = correctLetter;
      const tiles = document.querySelectorAll('#qd-drag-tiles .drag-tile');
      for (const tile of tiles) {
        if (tile.dataset.letter === correctLetter && !tile.classList.contains('used')) {
          tile.classList.add('used');
          break;
        }
      }
      if (this.blankValues.every(v => v !== null)) {
        document.getElementById('qd-btn-check').disabled = false;
      }
    },

    checkAnswer() {
      if (this.answered) return;
      this.answered = true;
      clearTimeout(this.autoNextTimer);

      const wordObj = this.getCurrentWord();
      const correctWord = wordObj.word.toUpperCase();
      const feedback = document.getElementById('qd-feedback');

      let userWordArr = wordObj.word.toUpperCase().split('');
      this.blankPositions.forEach((pos, i) => { userWordArr[pos] = this.blankValues[i] || ''; });
      const userWord = userWordArr.join('');
      const blanks = document.querySelectorAll('#qd-word-display .letter-blank');

      document.querySelectorAll('#qd-drag-tiles .drag-tile').forEach(t => {
        t.style.pointerEvents = 'none'; t.style.opacity = '0.4';
      });
      document.getElementById('qd-btn-check').disabled = true;
      document.getElementById('qd-btn-hint').disabled = true;

      const isCorrect = userWord === correctWord;
      // 拖拽模式：用提示则0分
      const bonus = isCorrect ? (this.hintUsed ? 0 : 10) : 0;

      if (isCorrect) {
        feedback.className = 'feedback correct';
        let totalBonus = bonus;
        if (App.quizState.streak >= 3) totalBonus += 5;
        App.quizState.score += totalBonus;
        App.quizState.streak++;
        feedback.innerHTML = `🎉 太棒了！${this.hintUsed ? '(提示不计分)' : '+' + totalBonus + '分'}<br>正确答案：<strong>${correctWord}</strong>`;
        blanks.forEach(b => b.classList.add('correct-fill'));
        if (!this.hintUsed) { App.spawnPetals(); App.showScorePopup('+' + totalBonus); }
      } else {
        feedback.className = 'feedback wrong';
        feedback.innerHTML = `😢 再试试哦~ 正确答案：<strong>${correctWord}</strong>`;
        App.quizState.streak = 0;
        this.blankPositions.forEach((pos, i) => {
          const c = correctWord[pos];
          blanks[i].textContent = c;
          blanks[i].classList.add(this.blankValues[i] === c ? 'correct-fill' : 'wrong-fill');
        });
      }

      App.quizState.results.push({
        word: wordObj.word,
        chinese: wordObj.chinese,
        correct: isCorrect,
        hintUsed: this.hintUsed,
      });

      this.updateScore();
      this.updateProgress();

      const ctrl = document.getElementById('qd-controls');
      const nextBtn = document.createElement('button');
      nextBtn.id = 'qd-next-btn';
      nextBtn.className = 'btn btn-next';
      nextBtn.textContent = '🌸 下一题';
      nextBtn.onclick = () => this.nextWord();
      ctrl.appendChild(nextBtn);

      if (isCorrect) {
        this.autoNextTimer = setTimeout(() => this.nextWord(), 1500);
      }
    },

    nextWord() {
      clearTimeout(this.autoNextTimer);
      const nb = document.getElementById('qd-next-btn');
      if (nb) nb.remove();

      App.quizState.currentIndex++;
      if (App.quizState.currentIndex >= App.quizState.totalQuestions) {
        App.navigate('result');
        return;
      }
      this.onShow();
    },

    updateScore() {
      document.getElementById('qd-score').textContent = App.quizState.score;
      if (App.quizState.streak >= 2) {
        const sb = document.getElementById('qd-streak-badge');
        if (sb) {
          sb.style.display = 'block';
          document.getElementById('qd-streak').textContent = App.quizState.streak;
        }
      } else {
        const sb = document.getElementById('qd-streak-badge');
        if (sb) sb.style.display = 'none';
      }
    },

    updateProgress() {
      const container = document.getElementById('qd-progress');
      if (!container) return;
      container.innerHTML = '';
      for (let i = 0; i < App.quizState.totalQuestions; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        if (i < App.quizState.currentIndex) dot.classList.add('done');
        if (i === App.quizState.currentIndex) dot.classList.add('current');
        container.appendChild(dot);
      }
    },
  };

  // 键盘
  document.addEventListener('keydown', (e) => {
    const page = document.getElementById(`page-${pageId}`);
    if (!page || page.classList.contains('hidden')) return;
    if (e.key === 'Enter') {
      const nb = document.getElementById('qd-next-btn');
      if (nb) { clearTimeout(QuizDrag.autoNextTimer); QuizDrag.nextWord(); }
      else if (!QuizDrag.answered && QuizDrag.blankValues.every(v => v !== null)) QuizDrag.checkAnswer();
    }
  });

  window.QuizDrag = QuizDrag;

  const container = document.createElement('div');
  container.id = `page-${pageId}`;
  container.className = 'page-view hidden';
  document.getElementById('app').appendChild(container);
  App.pages[pageId] = QuizDrag;
})();
```

- [ ] **Step 7.2: Commit**

```bash
git add src/js/quiz-drag.js
git commit -m "feat: drag-and-drop spelling quiz page"
```

---

### Task 8: 结果页

**Files:**
- Create: `src/js/result.js`

- [ ] **Step 8.1: 创建 `src/js/result.js` — 测验结果页**

```js
// ====== 结果页 ======
(function() {
  const pageId = 'result';

  const ResultPage = {
    onShow() {
      const container = document.getElementById(`page-${pageId}`);
      if (!container) return;

      const state = App.quizState;
      if (!state || state.results.length === 0) {
        container.innerHTML = `<div class="main-card"><p>没有测验数据</p>
          <button class="btn btn-primary" data-nav="home">返回首页</button></div>`;
        return;
      }

      const correct = state.results.filter(r => r.correct).length;
      const total = state.results.length;
      const wrongList = state.results.filter(r => !r.correct);

      container.innerHTML = `
        <div class="main-card">
          <div class="card-garland">${'<div class="garland-flower"></div>'.repeat(7)}</div>
          <div class="card-grass">${'<div class="grass-blade"></div>'.repeat(5)}</div>

          <div class="title-area">
            <span class="app-icon">${correct === total ? '🎉' : '🐣'}</span>
            <span class="title">测验完成！</span>
          </div>

          <div class="result-score">${state.score}</div>
          <div class="result-detail">
            ✅ ${correct}/${total} 正确
            ${correct < total ? `，😢 ${total - correct} 个错误` : ''}
          </div>

          <div class="result-list" id="result-list">
            ${state.results.map(r => `
              <div class="result-item ${r.correct ? 'correct' : 'wrong'}">
                <strong>${r.word}</strong> — ${r.chinese}
                ${r.correct ? '✅' : '❌'}
                ${r.hintUsed ? '(提示)' : ''}
              </div>
            `).join('')}
          </div>

          <div class="result-buttons">
            <button class="btn btn-primary" data-nav="home">🏠 返回首页</button>
            ${wrongList.length > 0 ? `
              <button class="btn btn-secondary" id="btn-review-wrong-result">📕 复习错题</button>
            ` : ''}
          </div>
        </div>
      `;

      // 复习错题
      const reviewBtn = document.getElementById('btn-review-wrong-result');
      if (reviewBtn) {
        reviewBtn.onclick = () => App.navigate('history', { tab: 'wrong' });
      }

      // 提交到后端（异步，不影响本地体验）
      this.submitResult(state);
    },

    async submitResult(state) {
      try {
        await App.invoke('submit_quiz', {
          submission: {
            grade: App.settings.grade,
            quiz_type: App.settings.quizType,
            total: state.totalQuestions,
            correct: state.results.filter(r => r.correct).length,
            score: state.score,
            details: state.results.map(r => ({
              word: r.word,
              chinese: r.chinese,
              correct: r.correct,
              hint_used: r.hintUsed,
            })),
          }
        });
        console.log('Quiz result saved');
      } catch (e) {
        console.error('Failed to save quiz result:', e);
      }
    }
  };

  const container = document.createElement('div');
  container.id = `page-${pageId}`;
  container.className = 'page-view hidden';
  document.getElementById('app').appendChild(container);
  App.pages[pageId] = ResultPage;
})();
```

- [ ] **Step 8.2: Commit**

```bash
git add src/js/result.js
git commit -m "feat: quiz result page with score and wrong word list"
```

---

### Task 9: 历史/错题页

**Files:**
- Create: `src/js/history.js`

- [ ] **Step 9.1: 创建 `src/js/history.js` — 历史记录和错题本页面**

```js
// ====== 历史/错题页 ======
(function() {
  const pageId = 'history';

  const HistoryPage = {
    currentTab: 'history',

    onShow(data) {
      if (data && data.tab) this.currentTab = data.tab;
      const container = document.getElementById(`page-${pageId}`);
      if (!container) return;

      container.innerHTML = `
        <div class="main-card history-card">
          <div class="card-garland">${'<div class="garland-flower"></div>'.repeat(7)}</div>
          <div class="card-grass">${'<div class="grass-blade"></div>'.repeat(5)}</div>

          <div class="top-bar" style="justify-content:center;gap:24px;">
            <button class="btn ${this.currentTab === 'history' ? 'btn-primary' : 'btn-secondary'}" id="tab-history-btn">📖 历史记录</button>
            <button class="btn ${this.currentTab === 'wrong' ? 'btn-primary' : 'btn-secondary'}" id="tab-wrong-btn">📕 错题本</button>
          </div>

          <div id="history-tab-content"></div>
        </div>
      `;

      document.getElementById('tab-history-btn').onclick = () => {
        this.currentTab = 'history';
        this.loadHistory();
      };
      document.getElementById('tab-wrong-btn').onclick = () => {
        this.currentTab = 'wrong';
        this.loadWrongWords();
      };

      if (this.currentTab === 'wrong') {
        this.loadWrongWords();
      } else {
        this.loadHistory();
      }
    },

    async loadHistory() {
      const content = document.getElementById('history-tab-content');
      content.innerHTML = '<p style="color:#a5d6a7;margin:20px;">加载中...</p>';

      const history = await App.invoke('get_history');
      const gradeNames = {
        grade1: '一年级', grade2: '二年级', grade3: '三年级',
        grade4: '四年级', grade5: '五年级', grade6: '六年级',
      };
      const typeNames = { fill: '填空', drag: '拖拽', mixed: '混合' };

      if (!history || history.length === 0) {
        content.innerHTML = '<p style="color:#a5d6a7;margin:20px;">暂无历史记录<br>去做几道题吧！🐣</p>';
        return;
      }

      content.innerHTML = `
        <div class="page-title">📖 历史记录</div>
        <table class="history-table">
          <thead><tr>
            <th>日期</th><th>年级</th><th>题型</th><th>正确率</th><th>得分</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${history.map(h => `
              <tr>
                <td>${h.date}</td>
                <td>${gradeNames[h.grade] || h.grade}</td>
                <td>${typeNames[h.quiz_type] || h.quiz_type}</td>
                <td>${h.correct}/${h.total} (${Math.round(h.correct/h.total*100)}%)</td>
                <td>${h.score}</td>
                <td><button class="btn btn-clear" style="height:32px;padding:0 12px;font-size:14px;" data-del-id="${h.id}">删除</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      // 删除
      content.querySelectorAll('[data-del-id]').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('确定删除这条记录？')) return;
          await App.invoke('delete_history', { id: parseInt(btn.dataset.delId) });
          this.loadHistory();
        };
      });
    },

    async loadWrongWords() {
      const content = document.getElementById('history-tab-content');
      content.innerHTML = '<p style="color:#a5d6a7;margin:20px;">加载中...</p>';

      const words = await App.invoke('get_wrong_words');

      if (!words || words.length === 0) {
        content.innerHTML = '<p style="color:#a5d6a7;margin:20px;">🎉 暂无错题！<br>你太棒了！</p>';
        return;
      }

      content.innerHTML = `
        <div class="page-title">📕 错题本（${words.length} 个待复习）</div>
        <div class="wrong-list">
          ${words.map(w => `
            <div class="wrong-item" data-word="${w.word}">
              <div>
                <span class="word-info">${w.word}</span>
                <span style="color:#8d6e63;margin-left:12px;">${w.chinese}</span>
              </div>
              <div>
                <span class="word-count">出错 ${w.count} 次</span>
                <button class="btn btn-clear" style="height:32px;padding:0 12px;font-size:14px;margin-left:8px;" data-remove-word="${w.word}">已掌握 ✓</button>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:12px;">
          <button class="btn btn-primary" id="btn-review-all-wrong">🔄 复习全部错题</button>
        </div>
      `;

      // 已掌握
      content.querySelectorAll('[data-remove-word]').forEach(btn => {
        btn.onclick = async () => {
          await App.invoke('remove_wrong_word', { word: btn.dataset.removeWord });
          this.loadWrongWords();
        };
      });

      // 复习全部
      document.getElementById('btn-review-all-wrong').onclick = async () => {
        // 将错题作为测验单词列表
        const quizWords = words.map(w => ({
          word: w.word,
          chinese: w.chinese,
          grade: '',
          difficulty: 0,
          id: 0,
        }));
        if (quizWords.length === 0) return;
        App.quizState = {
          words: quizWords,
          currentIndex: 0,
          score: 0,
          streak: 0,
          hintUsed: false,
          results: [],
          totalQuestions: quizWords.length,
          mode: App.settings.quizType,
        };
        App.navigate('quiz-fill');
      };
    },
  };

  const container = document.createElement('div');
  container.id = `page-${pageId}`;
  container.className = 'page-view hidden';
  document.getElementById('app').appendChild(container);
  App.pages[pageId] = HistoryPage;
})();
```

- [ ] **Step 9.2: Commit**

```bash
git add src/js/history.js
git commit -m "feat: history and wrong words review page"
```

---

### Task 10: 构建验证

**Files:** 无变更

- [ ] **Step 10.1: Rust 编译检查**

```bash
cargo check
```
Expected: `Finished` 无错误

- [ ] **Step 10.2: Tauri 构建**

```bash
npx tauri build 2>&1 | tail -30
```
Expected: 构建成功，生成可执行文件

- [ ] **Step 10.3: 确认窗口尺寸**

检查 `tauri.conf.json` 中 `width: 1920, height: 1080, center: true`

- [ ] **Step 10.4: 最终 commit**

```bash
git add -A
git status
git commit -m "chore: finalize full app build"
```

---

## 验证清单

| # | 检查项 | 预期 |
|---|--------|------|
| 1 | `cargo check` 通过 | 无编译错误 |
| 2 | 首页加载 | 年级选择、数量设置、题型选择正常 |
| 3 | 填空测验 | 字母选项可点击/撤回，提示按钮工作 |
| 4 | 拖拽测验 | 字母方块可拖拽/点击撤回 |
| 5 | 混合模式 | 奇偶数题正确切换填空/拖拽 |
| 6 | 结果页 | 得分、正确率、错误清单正确 |
| 7 | 历史记录 | 显示所有测验记录，支持删除 |
| 8 | 错题本 | 显示错题列表，支持"已掌握"和"复习全部" |
| 9 | 数据持久化 | 重启应用后历史/错题数据仍在 |
| 10 | 窗口尺寸 | 1920×1080，居中 |
