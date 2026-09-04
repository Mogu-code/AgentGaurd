import sys, os, sqlite3, json
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.audit.hash_chain import AuditChain

TEST_DB = "tests/_test_audit.db"


def setup_function():
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)


def teardown_function():
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)


def test_chain_valid_after_appends():
    chain = AuditChain(db_path=TEST_DB)
    chain.append({"a": 1})
    chain.append({"a": 2})
    chain.append({"a": 3})
    result = chain.verify_chain()
    assert result["valid"] is True
    assert result["records_checked"] == 3


def test_tampering_detected():
    chain = AuditChain(db_path=TEST_DB)
    chain.append({"a": 1})
    chain.append({"a": 2})

    # tamper directly with the underlying row
    conn = sqlite3.connect(TEST_DB)
    conn.execute("UPDATE audit_log SET payload_json = ? WHERE id = 1", (json.dumps({"a": 999}),))
    conn.commit()
    conn.close()

    result = chain.verify_chain()
    assert result["valid"] is False
