from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic_settings import BaseSettings
from typing import Optional
import databases
import os
from pathlib import Path

class Settings(BaseSettings):
    database_url: str = "postgresql://aip_user:aip_pass@db:5432/aip_db"
    secret_key: str = "dev-secret-key"
    cors_origins: str = "http://localhost:3001"

settings = Settings()
database = databases.Database(settings.database_url)

app = FastAPI(title="AIP API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

async def init_db():
    base = Path(__file__).resolve()
    candidates = [
        base.parent.parent.parent / "db",   # repo root / db  (Render, local)
        base.parent.parent / "db",           # backend / db
    ]
    db_dir = next((p for p in candidates if p.exists()), None)
    if db_dir is None:
        return
    for fname in ["schema.sql", "questions_data.sql"]:
        sql_file = db_dir / fname
        if sql_file.exists():
            sql = sql_file.read_text(encoding="utf-8")
            for stmt in sql.split(";"):
                stmt = stmt.strip()
                if stmt and not stmt.startswith("--") and not stmt.startswith("SET") and not stmt.startswith("SELECT"):
                    try:
                        await database.execute(stmt)
                    except Exception:
                        pass

@app.on_event("startup")
async def startup():
    await database.connect()
    await init_db()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


# ── 스키마 ──────────────────────────────────────────────
class ChoiceIn(BaseModel):
    content: str
    is_correct: bool
    order_num: int = 0

class ProblemCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = None
    difficulty: str = "중"
    choices: list[ChoiceIn]

class AnswerSubmit(BaseModel):
    user_id: int
    problem_id: int
    selected_choice_id: int


# ── 문제 ─────────────────────────────────────────────────
@app.get("/api/v1/problems")
async def list_problems(category: Optional[str] = None, difficulty: Optional[str] = None):
    query = "SELECT * FROM problems WHERE 1=1"
    values = {}
    if category:
        query += " AND category = :category"
        values["category"] = category
    if difficulty:
        query += " AND difficulty = :difficulty"
        values["difficulty"] = difficulty
    query += " ORDER BY created_at DESC"
    return await database.fetch_all(query=query, values=values)

@app.get("/api/v1/problems/all")
async def list_all_problems_with_choices():
    rows = await database.fetch_all("""
        SELECT p.id, p.title, p.content, p.category,
               c.id as cid, c.content as ccontent, c.is_correct, c.order_num
        FROM problems p
        JOIN choices c ON c.problem_id = p.id
        WHERE p.category = 'AWS AIP-C01'
        ORDER BY p.id, c.order_num
    """)
    problems: dict = {}
    for r in rows:
        pid = r['id']
        if pid not in problems:
            problems[pid] = {
                'id': pid,
                'title': r['title'],
                'content': r['content'],
                'category': r['category'],
                'choices': [],
            }
        problems[pid]['choices'].append({
            'id': r['cid'],
            'problem_id': pid,
            'content': r['ccontent'],
            'is_correct': r['is_correct'],
            'order_num': r['order_num'],
        })
    return list(problems.values())


@app.get("/api/v1/problems/{problem_id}")
async def get_problem(problem_id: int):
    problem = await database.fetch_one(
        "SELECT * FROM problems WHERE id = :id", {"id": problem_id}
    )
    if not problem:
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다")
    choices = await database.fetch_all(
        "SELECT * FROM choices WHERE problem_id = :pid ORDER BY order_num", {"pid": problem_id}
    )
    return {**dict(problem), "choices": [dict(c) for c in choices]}

@app.post("/api/v1/problems", status_code=201)
async def create_problem(body: ProblemCreate):
    problem_id = await database.execute(
        """INSERT INTO problems (title, content, category, difficulty)
           VALUES (:title, :content, :category, :difficulty) RETURNING id""",
        {"title": body.title, "content": body.content,
         "category": body.category, "difficulty": body.difficulty}
    )
    for c in body.choices:
        await database.execute(
            """INSERT INTO choices (problem_id, content, is_correct, order_num)
               VALUES (:pid, :content, :is_correct, :order_num)""",
            {"pid": problem_id, "content": c.content,
             "is_correct": c.is_correct, "order_num": c.order_num}
        )
    return {"id": problem_id}

@app.delete("/api/v1/problems/{problem_id}", status_code=204)
async def delete_problem(problem_id: int):
    await database.execute("DELETE FROM problems WHERE id = :id", {"id": problem_id})


# ── 정답 확인 & 답변 저장 ──────────────────────────────
@app.post("/api/v1/answers")
async def submit_answer(body: AnswerSubmit):
    choice = await database.fetch_one(
        "SELECT is_correct FROM choices WHERE id = :id AND problem_id = :pid",
        {"id": body.selected_choice_id, "pid": body.problem_id}
    )
    if not choice:
        raise HTTPException(status_code=400, detail="잘못된 선택지입니다")
    is_correct = choice["is_correct"]
    await database.execute(
        """INSERT INTO user_answers (user_id, problem_id, selected_choice_id, is_correct)
           VALUES (:uid, :pid, :cid, :correct)""",
        {"uid": body.user_id, "pid": body.problem_id,
         "cid": body.selected_choice_id, "correct": is_correct}
    )
    return {"is_correct": is_correct}

@app.get("/api/v1/users/{user_id}/stats")
async def user_stats(user_id: int):
    row = await database.fetch_one(
        """SELECT COUNT(*) AS total,
                  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS correct
           FROM user_answers WHERE user_id = :uid""",
        {"uid": user_id}
    )
    total = row["total"] or 0
    correct = row["correct"] or 0
    return {"total": total, "correct": correct,
            "rate": round(correct / total * 100, 1) if total else 0}


# ── 카테고리 목록 ─────────────────────────────────────
@app.get("/api/v1/categories")
async def list_categories():
    rows = await database.fetch_all(
        "SELECT DISTINCT category FROM problems WHERE category IS NOT NULL ORDER BY category"
    )
    return [r["category"] for r in rows]


@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}
