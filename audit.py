import requests
import json

base = 'http://localhost:8000'

print('--- HEALTH ---')
try: print(json.dumps(requests.get(f'{base}/health').json(), indent=2))
except Exception as e: print(e)

print('\n--- HEALTH LLM ---')
try: print(json.dumps(requests.get(f'{base}/health/llm').json(), indent=2))
except Exception as e: print(e)

print('\n--- HEALTH RAZORPAY ---')
try: print(json.dumps(requests.get(f'{base}/health/razorpay').json(), indent=2))
except Exception as e: print(e)

print('\n--- METRICS ---')
try: print(json.dumps(requests.get(f'{base}/metrics').json(), indent=2)[:500] + '...')
except Exception as e: print(e)

print('\n--- POLICIES ---')
try: print(json.dumps(requests.get(f'{base}/policies').json(), indent=2))
except Exception as e: print(e)

print('\n--- AUDIT VERIFY ---')
try: print(json.dumps(requests.get(f'{base}/guard/audit/verify').json(), indent=2))
except Exception as e: print(e)

print('\n--- TRANSACTIONS ---')
try: print(json.dumps(requests.get(f'{base}/transactions').json(), indent=2)[:500] + '...')
except Exception as e: print(e)

scenarios = ['legitimate', 'amount_manipulation', 'quantity_velocity', 'replay', 'llm_manipulation', 'merchant_substitution']
for s in scenarios:
    print(f'\n--- SCENARIO: {s.upper()} ---')
    try: 
        res = requests.post(f'{base}/simulation/{s}').json()
        print(f"Outcome: {res.get('outcome')}")
        print(f"ML Risk: {res.get('audit', {}).get('ml_result', {}).get('risk_score')}")
        print(f"Policy Violations: {[v.get('message') for v in res.get('audit', {}).get('policy_violations', [])]}")
        print(f"Razorpay called: {res.get('razorpay') is not None}")
        print(f"LLM Success: {res.get('extraction', {}).get('success')}")
        print(f"Extraction Method: {res.get('extraction', {}).get('extraction_method')}")
        if s == 'legitimate':
            print('Razorpay Data:', json.dumps(res.get('razorpay'), indent=2))
            print('Extraction Data:', json.dumps(res.get('extraction'), indent=2))
    except Exception as e: print(e)
