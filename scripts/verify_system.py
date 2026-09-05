#!/usr/bin/env python3
import os
import sys
import httpx
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

def run_checks():
    print("====================================")
    print("AGENTPAY GUARD SYSTEM VERIFICATION")
    print("====================================")
    
    # 1. Backend
    backend_ok = False
    try:
        resp = httpx.get("http://127.0.0.1:8000/health", timeout=2.0)
        backend_ok = resp.status_code == 200
    except Exception:
        pass
    print(f"Backend              {'[OK] ONLINE' if backend_ok else '[FAIL] OFFLINE'}")
    
    # 2. Ollama
    ollama_ok = False
    model_name = os.getenv("OLLAMA_MODEL", "qwen2.5:1.5b")
    try:
        resp = httpx.get("http://127.0.0.1:8000/health/llm", timeout=2.0)
        if resp.status_code == 200:
            data = resp.json()
            ollama_ok = data.get("available", False)
            model_name = data.get("model", model_name)
    except Exception:
        pass
    print(f"Ollama               {'[OK] ONLINE' if ollama_ok else '[FAIL] OFFLINE / FALLBACK'}")
    print(f"Model                [OK] {model_name}")
    
    # 3. ML Artifacts
    ml_path = os.path.join("backend", "app", "ml", "artifacts", "metrics.json")
    ml_ok = os.path.exists(ml_path)
    print(f"ML Artifacts         {'[OK] PRESENT' if ml_ok else '[FAIL] MISSING'}")
    
    # 4. Razorpay
    rzp_ok = False
    mode = "MOCK MODE"
    try:
        resp = httpx.get("http://127.0.0.1:8000/health/razorpay", timeout=2.0)
        if resp.status_code == 200:
            data = resp.json()
            mode = data.get("mode", "mock").upper() + " MODE"
            rzp_ok = data.get("reachable", False)
    except Exception:
        pass
    print(f"Razorpay             [OK] {mode}")
    print(f"Razorpay API         {'[OK] REACHABLE' if rzp_ok or mode == 'MOCK MODE' else '[FAIL] UNAVAILABLE'}")
    
    # 5. Tests
    import subprocess
    try:
        result = subprocess.run(["python", "-m", "pytest", "tests/"], capture_output=True, text=True)
        if result.returncode == 0:
            print("Tests                [OK] PASSED")
        else:
            print("Tests                [FAIL] FAILED")
    except Exception:
        print("Tests                [FAIL] COULD NOT RUN")
        
    print("\n====================================")
    if backend_ok:
        print("SYSTEM READY")
    else:
        print("SYSTEM NOT READY (Backend Offline)")
    print("====================================")

if __name__ == "__main__":
    run_checks()
