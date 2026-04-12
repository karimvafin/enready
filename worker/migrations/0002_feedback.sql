CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER,
  rating INTEGER NOT NULL,
  text TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
