CREATE TABLE IF NOT EXISTS users (
  id        SERIAL PRIMARY KEY,
  email     VARCHAR(255) UNIQUE NOT NULL,
  name      VARCHAR(100) NOT NULL,
  password_hash TEXT NOT NULL,
  role      VARCHAR(20) NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS problems (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  category    VARCHAR(100),
  difficulty  VARCHAR(10) DEFAULT '중',  -- '하' | '중' | '상'
  created_by  INT REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS choices (
  id          SERIAL PRIMARY KEY,
  problem_id  INT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_correct  BOOLEAN NOT NULL DEFAULT FALSE,
  order_num   INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_answers (
  id               SERIAL PRIMARY KEY,
  user_id          INT NOT NULL REFERENCES users(id),
  problem_id       INT NOT NULL REFERENCES problems(id),
  selected_choice_id INT REFERENCES choices(id),
  is_correct       BOOLEAN,
  answered_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id),
  problem_id INT NOT NULL REFERENCES problems(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, problem_id)
);

CREATE INDEX IF NOT EXISTS idx_problems_category ON problems(category);
CREATE INDEX IF NOT EXISTS idx_user_answers_user ON user_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_problem ON user_answers(problem_id);
