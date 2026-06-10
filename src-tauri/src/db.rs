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

        conn.execute(
            "CREATE TABLE IF NOT EXISTS words (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT NOT NULL UNIQUE,
                chinese TEXT NOT NULL,
                grade TEXT NOT NULL,
                difficulty INTEGER NOT NULL DEFAULT 1
            )", [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS quiz_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                grade TEXT NOT NULL,
                quiz_type TEXT NOT NULL,
                total INTEGER NOT NULL,
                correct INTEGER NOT NULL,
                score INTEGER NOT NULL
            )", [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS quiz_details (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                history_id INTEGER NOT NULL,
                word TEXT NOT NULL,
                chinese TEXT NOT NULL,
                correct INTEGER NOT NULL,
                hint_used INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (history_id) REFERENCES quiz_history(id)
            )", [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS wrong_words (
                word TEXT PRIMARY KEY,
                chinese TEXT NOT NULL,
                count INTEGER NOT NULL DEFAULT 1,
                last_wrong TEXT NOT NULL
            )", [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS progress (
                date TEXT PRIMARY KEY,
                completed INTEGER NOT NULL DEFAULT 0,
                target INTEGER NOT NULL DEFAULT 10
            )", [],
        )?;

        Ok(Database { conn: Mutex::new(conn) })
    }

    pub fn seed_words(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM words", [], |r| r.get(0))?;
        if count > 0 { return Ok(()); }

        let words = vec![
            ("cat","猫","grade1",1),("dog","狗","grade1",1),("sun","太阳","grade1",1),
            ("egg","鸡蛋","grade1",1),("red","红色","grade1",1),("big","大的","grade1",1),
            ("hat","帽子","grade1",1),("cup","杯子","grade1",1),("pen","钢笔","grade1",1),
            ("bed","床","grade1",1),("fish","鱼","grade1",1),("bird","鸟","grade1",1),
            ("book","书","grade1",1),("milk","牛奶","grade1",1),("star","星星","grade1",1),
            ("moon","月亮","grade1",1),("tree","树","grade1",1),("door","门","grade1",1),
            ("king","国王","grade1",2),("jump","跳","grade1",1),("lion","狮子","grade1",2),
            ("rain","雨","grade1",1),("foot","脚","grade1",1),("hand","手","grade1",1),
            ("head","头","grade1",1),("ball","球","grade1",1),("cake","蛋糕","grade1",1),
            ("duck","鸭子","grade1",1),("frog","青蛙","grade1",1),("gift","礼物","grade1",1),

            ("apple","苹果","grade2",2),("happy","开心的","grade2",2),("tiger","老虎","grade2",2),
            ("panda","熊猫","grade2",2),("house","房子","grade2",2),("water","水","grade2",2),
            ("green","绿色","grade2",2),("grape","葡萄","grade2",2),("zebra","斑马","grade2",2),
            ("queen","女王","grade2",2),("robot","机器人","grade2",2),("pencil","铅笔","grade2",2),
            ("noodle","面条","grade2",2),("monkey","猴子","grade2",2),("night","夜晚","grade2",2),
            ("garden","花园","grade2",2),("voice","声音","grade2",2),("yellow","黄色","grade2",2),
            ("island","岛屿","grade2",2),("flower","花","grade2",2),("candy","糖果","grade2",2),
            ("dance","跳舞","grade2",2),("snake","蛇","grade2",2),("sheep","绵羊","grade2",2),
            ("cloud","云","grade2",2),("dream","梦","grade2",2),("bread","面包","grade2",2),
            ("chair","椅子","grade2",2),("clock","钟","grade2",2),("dress","连衣裙","grade2",2),

            ("banana","香蕉","grade3",3),("school","学校","grade3",3),("rabbit","兔子","grade3",3),
            ("orange","橙子","grade3",3),("elephant","大象","grade3",3),("umbrella","雨伞","grade3",3),
            ("purple","紫色","grade3",3),("window","窗户","grade3",3),("guitar","吉他","grade3",3),
            ("family","家庭","grade3",3),("planet","行星","grade3",3),("bridge","桥","grade3",3),
            ("castle","城堡","grade3",3),("dragon","龙","grade3",3),("forest","森林","grade3",3),
            ("giraffe","长颈鹿","grade3",3),("animal","动物","grade3",3),("bottle","瓶子","grade3",3),
            ("candle","蜡烛","grade3",3),("cotton","棉花","grade3",3),("silver","银色的","grade3",3),
            ("kitten","小猫","grade3",3),("ladder","梯子","grade3",3),("matter","事情","grade3",3),
            ("number","数字","grade3",3),("puzzle","拼图","grade3",3),("sister","姐妹","grade3",3),
            ("turtle","乌龟","grade3",3),("winter","冬天","grade3",3),("summer","夏天","grade3",3),

            ("beautiful","美丽的","grade4",4),("strawberry","草莓","grade4",4),
            ("chocolate","巧克力","grade4",4),("dinosaur","恐龙","grade4",4),
            ("festival","节日","grade4",4),("mountain","山","grade4",4),
            ("painting","绘画","grade4",4),("rainbow","彩虹","grade4",4),
            ("butterfly","蝴蝶","grade4",4),("calendar","日历","grade4",4),
            ("champion","冠军","grade4",4),("discover","发现","grade4",4),
            ("friendly","友好的","grade4",4),("hospital","医院","grade4",4),
            ("important","重要的","grade4",4),("knowledge","知识","grade4",4),
            ("language","语言","grade4",4),("medicine","药","grade4",4),
            ("adventure","冒险","grade4",4),("celebrate","庆祝","grade4",4),
            ("dangerous","危险的","grade4",4),("exercise","锻炼","grade4",4),
            ("wonderful","精彩的","grade4",4),("different","不同的","grade4",4),
            ("together","一起","grade4",4),("tomorrow","明天","grade4",4),
            ("yesterday","昨天","grade4",4),("computer","电脑","grade4",4),
            ("daughter","女儿","grade4",4),("question","问题","grade4",4),
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

    pub fn get_words_by_grade(&self, grade: &str, limit: i32) -> Result<Vec<crate::models::Word>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, word, chinese, grade, difficulty FROM words WHERE grade = ?1 ORDER BY RANDOM() LIMIT ?2"
        )?;
        let rows = stmt.query_map(params![grade, limit], |r| {
            Ok(crate::models::Word {
                id: r.get(0)?, word: r.get(1)?, chinese: r.get(2)?,
                grade: r.get(3)?, difficulty: r.get(4)?,
            })
        })?;
        let mut words = Vec::new();
        for row in rows { words.push(row?); }
        Ok(words)
    }

    pub fn get_wrong_words_for_review(&self, limit: i32) -> Result<Vec<crate::models::Word>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT w.id, w.word, w.chinese, w.grade, w.difficulty
             FROM words w INNER JOIN wrong_words ww ON w.word = ww.word
             ORDER BY ww.count DESC LIMIT ?1"
        )?;
        let rows = stmt.query_map(params![limit], |r| {
            Ok(crate::models::Word {
                id: r.get(0)?, word: r.get(1)?, chinese: r.get(2)?,
                grade: r.get(3)?, difficulty: r.get(4)?,
            })
        })?;
        let mut words = Vec::new();
        for row in rows { words.push(row?); }
        Ok(words)
    }

    pub fn save_quiz_result(&self, submission: &crate::models::QuizSubmission) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();

        conn.execute(
            "INSERT INTO quiz_history (date, grade, quiz_type, total, correct, score) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![today, submission.grade, submission.quiz_type, submission.total, submission.correct, submission.score],
        )?;
        let history_id = conn.last_insert_rowid();

        for detail in &submission.details {
            conn.execute(
                "INSERT INTO quiz_details (history_id, word, chinese, correct, hint_used) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![history_id, detail.word, detail.chinese, detail.correct as i32, detail.hint_used as i32],
            )?;
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

        let affected = conn.execute(
            "UPDATE progress SET completed = completed + ?1 WHERE date = ?2",
            params![submission.total, today],
        )?;
        if affected == 0 {
            conn.execute("INSERT INTO progress (date, completed, target) VALUES (?1, ?2, 10)", params![today, submission.total])?;
        }

        Ok(history_id)
    }

    pub fn get_quiz_history(&self) -> Result<Vec<crate::models::QuizHistory>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, date, grade, quiz_type, total, correct, score FROM quiz_history ORDER BY id DESC LIMIT 50"
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(crate::models::QuizHistory {
                id: r.get(0)?, date: r.get(1)?, grade: r.get(2)?,
                quiz_type: r.get(3)?, total: r.get(4)?, correct: r.get(5)?, score: r.get(6)?,
            })
        })?;
        let mut history = Vec::new();
        for row in rows { history.push(row?); }
        Ok(history)
    }

    pub fn get_wrong_words(&self) -> Result<Vec<crate::models::WrongWord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT word, chinese, count, last_wrong FROM wrong_words ORDER BY count DESC, last_wrong DESC"
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(crate::models::WrongWord {
                word: r.get(0)?, chinese: r.get(1)?, count: r.get(2)?, last_wrong: r.get(3)?,
            })
        })?;
        let mut words = Vec::new();
        for row in rows { words.push(row?); }
        Ok(words)
    }

    pub fn get_home_stats(&self) -> Result<crate::models::HomeStats> {
        let conn = self.conn.lock().unwrap();
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();

        let (completed, target): (i32, i32) = conn.query_row(
            "SELECT COALESCE(completed,0), COALESCE(target,10) FROM progress WHERE date = ?1",
            params![today], |r| Ok((r.get(0)?, r.get(1)?)),
        ).unwrap_or((0, 10));

        let checkin_days: i64 = conn.query_row(
            "SELECT COUNT(*) FROM progress WHERE completed > 0", [], |r| r.get(0)
        ).unwrap_or(0);

        let wrong_count: i64 = conn.query_row(
            "SELECT COALESCE(SUM(count), 0) FROM wrong_words", [], |r| r.get(0)
        ).unwrap_or(0);

        Ok(crate::models::HomeStats {
            today_completed: completed,
            today_target: target,
            checkin_days: checkin_days as i32,
            wrong_count: wrong_count as i32,
        })
    }
}
