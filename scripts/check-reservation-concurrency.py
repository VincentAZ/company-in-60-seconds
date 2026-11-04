"""Integration check against an isolated PostgreSQL container with the migration applied.
Usage: python3 scripts/check-reservation-concurrency.py company60-postgres-check
Never target a hosted database: this resets only this test container's application tables.
"""
import concurrent.futures
import json
import subprocess
import sys
import uuid

container = sys.argv[1] if len(sys.argv) == 2 else 'company60-postgres-check'
if not container.startswith('company60-postgres-check'):
    raise SystemExit('Use a dedicated company60-postgres-check container')

def sql(query):
    return subprocess.run(['docker','exec',container,'psql','-U','postgres','-tA','-v','ON_ERROR_STOP=1','-c',query],text=True,capture_output=True)

def reserve(index, request=None, ip=None):
    request = request or str(uuid.uuid4())
    ip = ip or f'ip-{index}'
    query = f"select reserve_build('{uuid.uuid4()}','An independent test bakery','{ip}','{request}','{'a'*64}')"
    return sql(query)

assert sql('truncate build_events,builds; update build_limits set enabled=true,daily_cap=20,ip_daily_cap=3,concurrency_cap=2,daily_budget_cents=10000').returncode == 0
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
    results = list(pool.map(reserve, range(12)))
assert sum(r.returncode == 0 for r in results) == 2, [r.stderr for r in results]
assert all(r.returncode == 0 or 'BUILD_LIMIT_REACHED' in r.stderr for r in results)
assert sql("select count(*) from builds where status='running'").stdout.strip() == '2'
print('12 concurrent admissions: exactly 2 accepted, 10 capped')

assert sql('truncate build_events,builds').returncode == 0
request = str(uuid.uuid4())
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
    results = list(pool.map(lambda i: reserve(i,request,'shared-ip'),range(12)))
assert all(r.returncode == 0 for r in results), [r.stderr for r in results]
values = [json.loads(r.stdout) for r in results]
assert sum(v['created'] for v in values) == 1
assert len({v['record']['id'] for v in values}) == 1
print('12 concurrent identical requests: one reservation and one build ID')
assert sql('truncate build_events,builds; update build_limits set enabled=false,daily_budget_cents=0').returncode == 0
