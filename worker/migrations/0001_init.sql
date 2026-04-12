CREATE TABLE users (
  chat_id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE generations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER,
  topic TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
