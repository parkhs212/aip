-- 관리자 계정 (비밀번호: admin1234, bcrypt 해시)
INSERT INTO users (email, name, password_hash, role) VALUES
  ('admin@aip.com', '관리자', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGIGDgbFkTvHVXlWpkJZqW8Ky4O', 'admin')
ON CONFLICT DO NOTHING;

-- 샘플 문제
INSERT INTO problems (title, content, category, difficulty, created_by) VALUES
  ('Python 기초', 'Python에서 리스트를 복사할 때 얕은 복사와 깊은 복사의 차이는?', 'Python', '중', 1),
  ('SQL 기초', 'SELECT와 WHERE의 실행 순서는?', 'SQL', '하', 1)
ON CONFLICT DO NOTHING;

-- 샘플 선택지 (문제 1)
INSERT INTO choices (problem_id, content, is_correct, order_num) VALUES
  (1, '얕은 복사는 참조를 복사하고, 깊은 복사는 값을 복사한다', TRUE, 1),
  (1, '차이 없다', FALSE, 2),
  (1, '깊은 복사가 더 빠르다', FALSE, 3),
  (1, '얕은 복사는 불변 객체에만 사용한다', FALSE, 4);

-- 샘플 선택지 (문제 2)
INSERT INTO choices (problem_id, content, is_correct, order_num) VALUES
  (2, 'FROM → WHERE → SELECT', TRUE, 1),
  (2, 'SELECT → FROM → WHERE', FALSE, 2),
  (2, 'WHERE → FROM → SELECT', FALSE, 3),
  (2, 'SELECT → WHERE → FROM', FALSE, 4);
