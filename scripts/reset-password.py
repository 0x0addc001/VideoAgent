#!/usr/bin/env python3
"""Reset a local VideoAgent password (or create the account) from the terminal.

The API only exposes locale updates on PATCH /me, so a forgotten local password
would otherwise require hand-editing SQLite. Passwords are hashed with the same
pwdlib/argon2 helper the API uses, so this stays compatible with normal login.

Usage (from the repository root):

    uv run --project services/api python scripts/reset-password.py --email you@example.com
    uv run --project services/api python scripts/reset-password.py --email you@example.com --create --password 'new-secret'

Without --password the script prompts, so the secret never lands in shell history.
"""

from __future__ import annotations

import argparse
import getpass
import sqlite3
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
API_ROOT = REPO_ROOT / "services" / "api"
sys.path.insert(0, str(API_ROOT / "src"))

from videoagent.security import hash_password  # noqa: E402

DEFAULT_DATABASE_URL = "sqlite+aiosqlite:///./.data/videoagent.db"


def read_database_url() -> str:
    """Prefer .env (the API's own source of truth) over the built-in default."""
    env_file = API_ROOT / ".env"
    if env_file.is_file():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if stripped.startswith("VIDEOAGENT_DATABASE_URL="):
                return stripped.split("=", 1)[1].strip().strip('"').strip("'")
    return DEFAULT_DATABASE_URL


def sqlite_path(database_url: str) -> Path:
    if not database_url.startswith("sqlite"):
        raise SystemExit(
            "Only SQLite is supported by this helper; reset the password directly in "
            f"your database for {database_url!r}."
        )
    raw = database_url.removeprefix("sqlite+aiosqlite:///").removeprefix("sqlite:///")
    if raw == ":memory:":
        raise SystemExit("Cannot reset a password on an in-memory database.")
    path = Path(raw).expanduser()
    return path if path.is_absolute() else (API_ROOT / path).resolve()


def main() -> int:
    parser = argparse.ArgumentParser(description="Reset or create a VideoAgent account.")
    parser.add_argument("--email", required=True, help="account email")
    parser.add_argument("--password", help="new password (prompted when omitted)")
    parser.add_argument("--create", action="store_true", help="create the account if missing")
    parser.add_argument("--locale", default="en", help="locale for a created account")
    parser.add_argument("--database", help="override the database URL")
    args = parser.parse_args()

    path = sqlite_path(args.database or read_database_url())
    if not path.exists():
        raise SystemExit(f"Database not found: {path}\nStart the API once to create it.")

    email = args.email.strip().lower()
    password = args.password or getpass.getpass("New password: ")
    if len(password) < 8:
        raise SystemExit("Password must be at least 8 characters.")
    password_hash = hash_password(password)
    now = datetime.now(UTC).isoformat(sep=" ")

    with sqlite3.connect(path) as conn:
        row = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if row is None:
            if not args.create:
                raise SystemExit(
                    f"No account for {email}. Re-run with --create to add it."
                )
            user_id = uuid.uuid4().hex
            conn.execute(
                "INSERT INTO users (id, email, password_hash, locale, status, created_at, updated_at)"
                " VALUES (?, ?, ?, ?, 'active', ?, ?)",
                (user_id, email, password_hash, args.locale, now, now),
            )
            conn.execute(
                "INSERT INTO credit_accounts (id, user_id, balance, created_at, updated_at)"
                " VALUES (?, ?, 0, ?, ?)",
                (uuid.uuid4().hex, user_id, now, now),
            )
            conn.commit()
            print(f"Created {email} (id {user_id}) in {path}")
        else:
            conn.execute(
                "UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ?",
                (password_hash, now, email),
            )
            conn.commit()
            print(f"Password updated for {email} in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
