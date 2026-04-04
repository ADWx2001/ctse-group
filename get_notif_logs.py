"""Get notification-service events and debug info"""
import subprocess
import json

def run(args, timeout=20):
    r = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    return r.stdout.strip(), r.stderr.strip(), r.returncode

# Get system events for notification-service
print("=== System events ===")
out, err, rc = run([
    'az.cmd', 'containerapp', 'show', '-n', 'notification-service', 
    '-g', 'rg-food-ordering',
    '--query', 'properties.latestRevisionName',
    '-o', 'tsv'
])
revision = out.strip()
print(f"Revision: {revision}")

# Get events
out, err, rc = run([
    'az.cmd', 'monitor', 'activity-log', 'list',
    '--resource-group', 'rg-food-ordering',
    '--max-events', '10',
    '-o', 'json'
], timeout=25)
if out:
    events = json.loads(out) if out.startswith('[') else []
    for e in events[:5]:
        print(f"  {e.get('eventTimestamp','')} - {e.get('operationName',{}).get('localizedValue','')} - {e.get('level','')}")

# Check the actual secret value set  
print("\n=== Secrets (names only) ===")
out, err, rc = run([
    'az.cmd', 'containerapp', 'secret', 'list',
    '-n', 'notification-service',
    '-g', 'rg-food-ordering',
    '-o', 'json'
], timeout=20)
if out:
    secrets = json.loads(out)
    for s in secrets:
        print(f"  {s.get('name','')}: {s.get('value','[hidden/empty]')[:50] if s.get('value') else '[ref or null]'}")
