"""
Hash-chained audit log.

Honesty note (put this in interviews too): this is TAMPER-EVIDENT, not
tamper-PROOF, and it is not a blockchain. Each record stores sha256(previous
hash + this record's canonical JSON). If any past record is altered, every
subsequent hash fails to recompute, so tampering is detectable on
verification — but the log still lives in a normal database the operator
controls, so it does not protect against a privileged operator rewriting the
whole chain. True tamper-proofing would need an external anchor (e.g.
periodic hash publication) which is out of scope for the MVP.
"""
from __future__ import annotations
import hashlib
import json
import sqlite3
import time
import contextlib
from typing import Optional

GENESIS_HASH = "0" * 64


class AuditChain:
    def __init__(self, db_path: str = "backend/app/db/agentpay.db"):
        self.db_path = db_path
        self._init_table()

    def _conn(self):
        return sqlite3.connect(self.db_path)

    def _init_table(self):
        with contextlib.closing(self._conn()) as conn:
            with conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS audit_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        prev_hash TEXT NOT NULL,
                        this_hash TEXT NOT NULL,
                        payload_json TEXT NOT NULL,
                        created_at REAL NOT NULL
                    )
                """)

    def _last_hash(self) -> str:
        with contextlib.closing(self._conn()) as conn:
            row = conn.execute("SELECT this_hash FROM audit_log ORDER BY id DESC LIMIT 1").fetchone()
            return row[0] if row else GENESIS_HASH

    def append(self, payload: dict) -> dict:
        prev_hash = self._last_hash()
        canonical = json.dumps(payload, sort_keys=True, default=str)
        this_hash = hashlib.sha256((prev_hash + canonical).encode("utf-8")).hexdigest()
        created_at = time.time()
        with contextlib.closing(self._conn()) as conn:
            with conn:
                conn.execute(
                    "INSERT INTO audit_log (prev_hash, this_hash, payload_json, created_at) VALUES (?, ?, ?, ?)",
                    (prev_hash, this_hash, canonical, created_at),
                )
        return {"prev_hash": prev_hash, "this_hash": this_hash, "created_at": created_at}

    def verify_chain(self) -> dict:
        """Recomputes every hash from scratch; returns whether the chain is intact."""
        with contextlib.closing(self._conn()) as conn:
            rows = conn.execute(
                "SELECT id, prev_hash, this_hash, payload_json FROM audit_log ORDER BY id ASC"
            ).fetchall()
        expected_prev = GENESIS_HASH
        for row_id, prev_hash, this_hash, payload_json in rows:
            if prev_hash != expected_prev:
                return {"valid": False, "broken_at_id": row_id, "reason": "prev_hash mismatch"}
            recomputed = hashlib.sha256((prev_hash + payload_json).encode("utf-8")).hexdigest()
            if recomputed != this_hash:
                return {"valid": False, "broken_at_id": row_id, "reason": "hash mismatch (tampering detected)"}
            expected_prev = this_hash
        return {"valid": True, "records_checked": len(rows)}

    def all_records(self, limit: int = 200):
        with contextlib.closing(self._conn()) as conn:
            rows = conn.execute(
                "SELECT id, prev_hash, this_hash, payload_json, created_at FROM audit_log ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [
            {"id": r[0], "prev_hash": r[1], "this_hash": r[2], "payload": json.loads(r[3]), "created_at": r[4]}
            for r in rows
        ]
