CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  password_hash TEXT NOT NULL,
  mbti TEXT,
  avatar TEXT,
  email TEXT,
  deleted INTEGER DEFAULT 0,
  banned_until INTEGER DEFAULT 0,
  ban_count INTEGER DEFAULT 0,
  friends_count INTEGER DEFAULT 0,
  is_vpn INTEGER DEFAULT 0,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS friends (
  id TEXT PRIMARY KEY,
  user_a TEXT,
  user_b TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  from_user TEXT,
  to_user TEXT,
  status TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter TEXT,
  reported TEXT,
  reporter_ip TEXT,
  created_at INTEGER,
  UNIQUE(reporter, reported)
);

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  user_a TEXT,
  user_b TEXT,
  message TEXT,
  created_at INTEGER
);
