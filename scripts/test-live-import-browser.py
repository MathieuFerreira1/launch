#!/usr/bin/env python3
"""Real browser import on launch-dev, using only a newly-created synthetic user.
Admin credentials stay in this server process. No traces, session dumps or email.
"""
import importlib.util
import json
import os
from pathlib import Path
import secrets
import subprocess
import time
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('live_imports', ROOT / 'scripts/test-live-imports.py')
live = importlib.util.module_from_spec(spec)
spec.loader.exec_module(live)

def manage(path):
    req = urllib.request.Request('https://api.supabase.com/v1/' + path,
        headers={'Authorization': 'Bearer ' + os.environ['SUPABASE_ACCESS_TOKEN']})
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)

def main():
    assert any(p['id'] == live.REF and p['name'].lower().replace(' ', '-') == 'launch-dev' for p in manage('projects'))
    keys = manage(f'projects/{live.REF}/api-keys')
    public = next(k['api_key'] for k in keys if k['name'] == 'anon')
    admin = next(k['api_key'] for k in keys if k['name'] == 'service_role')
    user = session = None
    try:
        password = secrets.token_urlsafe(32)
        email = f'launch-import-{uuid.uuid4().hex}-browser@example.test'
        user = live.request(live.BASE + '/auth/v1/admin/users', admin,
            body={'email': email, 'password': password, 'email_confirm': True})
        session = live.request(live.BASE + '/auth/v1/token?grant_type=password', public,
            body={'email': email, 'password': password})
        session['expires_at'] = int(time.time()) + session['expires_in']
        env = os.environ.copy()
        for name in ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY']:
            env.pop(name, None)
        env.update({'LAUNCH_LIVE_IMPORT_TEST': '1', 'LAUNCH_LIVE_SESSION': json.dumps(session),
            'VITE_SUPABASE_URL': live.BASE, 'VITE_SUPABASE_PUBLISHABLE_KEY': public})
        result = subprocess.run(['npx', 'playwright', 'test', '--config', 'playwright.live.config.ts'], cwd=ROOT, env=env)
        if result.returncode:
            raise SystemExit(result.returncode)
    finally:
        if user:
            # Ordinary JWT sees only this synthetic user's own reservations.
            if session:
                rows = live.request(live.BASE + '/rest/v1/activity_files?select=storage_path', public, session['access_token'])
                paths = [r['storage_path'] for r in rows]
                assert all(p.startswith(user['id'] + '/') for p in paths)
                if paths:
                    live.request(live.BASE + '/storage/v1/object/sport-sources', public, session['access_token'],
                        {'prefixes': paths}, method='DELETE')
            live.request(live.BASE + '/auth/v1/admin/users/' + user['id'], admin, method='DELETE')
            print('Cleanup: only the generated browser fixture account and its sources removed.')

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Never print HTTP response payloads or child session environments.
        print('Live browser test failed:', type(error).__name__)
        raise SystemExit(1) from None
