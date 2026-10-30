#!/usr/bin/env python3
"""Pinned Launch dev management API runner. Never prints credentials or user rows."""
import argparse
import json
import os
from pathlib import Path
import urllib.request
import urllib.error

REF = 'kephzbvcbmjzqqvqgtav'
VERSION = '20261029000100'
ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / 'supabase/migrations/20261029000100_profiles_and_sports.sql'
TESTS = ROOT / 'supabase/tests/auth_profiles.sql'

def api(path, body=None, method=None):
    token = os.environ.get('SUPABASE_ACCESS_TOKEN')
    if not token:
        raise SystemExit('SUPABASE_ACCESS_TOKEN requis dans les secrets de l’environnement.')
    request = urllib.request.Request('https://api.supabase.com/v1/' + path,
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'},
        data=json.dumps(body).encode() if body is not None else None, method=method)
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = response.read()
            return json.loads(payload) if payload else None
    except urllib.error.HTTPError as error:
        # Print only safe PostgreSQL diagnostics; never dump response/credentials.
        try:
            data = json.loads(error.read())
            message = data.get('message', 'Erreur API')
        except (ValueError, AttributeError):
            message = 'Erreur API'
        raise SystemExit(f'Supabase HTTP {error.code}: {message}') from None

def sql(query):
    return api(f'projects/{REF}/database/query', {'query': query})

def verify_project():
    matches = [p for p in api('projects') if p['id'] == REF]
    if len(matches) != 1 or matches[0]['name'].lower().replace(' ', '-') != 'launch-dev':
        raise SystemExit('Projet de développement non confirmé ; arrêt.')
    print(f'Projet confirmé : Launch dev ({REF}).')

def main():
    global VERSION, MIGRATION, TESTS
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['validate', 'test', 'apply'])
    parser.add_argument('--mission', choices=['auth', 'imports', 'storage', 'lifecycle', 'classification', 'rewards', 'reward_proofs'], default='auth')
    args = parser.parse_args()
    if args.mission == 'imports':
        VERSION = '20261029000200'
        MIGRATION = ROOT / 'supabase/migrations/20261029000200_activity_imports.sql'
        TESTS = ROOT / 'supabase/tests/activity_imports.sql'
    if args.mission == 'storage':
        VERSION = '20261029000300'
        MIGRATION = ROOT / 'supabase/migrations/20261029000300_storage_upload_preflight.sql'
        TESTS = ROOT / 'supabase/tests/activity_imports.sql'
    if args.mission == 'lifecycle':
        VERSION = '20261029000400'
        MIGRATION = ROOT / 'supabase/migrations/20261029000400_import_deletion_lifecycle.sql'
        TESTS = ROOT / 'supabase/tests/activity_imports.sql'
    if args.mission == 'classification':
        VERSION = '20261029000500'
        MIGRATION = ROOT / 'supabase/migrations/20261029000500_classification_review_guards.sql'
        TESTS = ROOT / 'supabase/tests/activity_imports.sql'
    if args.mission == 'rewards':
        VERSION = '20261030000100'
        MIGRATION = ROOT / 'supabase/migrations/20261030000100_cards_collections_rewards.sql'
        TESTS = ROOT / 'supabase/tests/card_rewards.sql'
    if args.mission == 'reward_proofs':
        VERSION = '20261030000200'
        MIGRATION = ROOT / 'supabase/migrations/20261030000200_reward_proof_reconciliation.sql'
        TESTS = ROOT / 'supabase/tests/card_reward_proofs.sql'
    verify_project()
    migration = MIGRATION.read_text()
    if args.action == 'validate':
        # The integration suite owns BEGIN/ROLLBACK; prepend migration inside it.
        suite = TESTS.read_text().replace('begin;\n', 'begin;\n' + migration + '\n', 1)
        sql(suite)
        print('Migration et assertions RLS validées sur Launch dev ; transaction annulée.')
    elif args.action == 'test':
        sql(TESTS.read_text())
        print('Assertions RLS sur Launch dev réussies ; fixtures annulées.')
    else:
        history = api(f'projects/{REF}/database/migrations')
        if any(m.get('version') == VERSION for m in history):
            raise SystemExit('Version déjà appliquée ; aucune réapplication.')
        # Explicit transaction and conventional Supabase CLI migration history.
        # Values are SQL literals escaped as data, never shell interpolation.
        literal = "'" + migration.replace("'", "''") + "'"
        history_sql = f"""
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations
(version text not null primary key, statements text[], name text);
insert into supabase_migrations.schema_migrations(version,statements,name)
values ('{VERSION}',array[{literal}],'{MIGRATION.stem.split('_', 1)[1]}');
"""
        sql('begin;\n' + migration + '\n' + history_sql + '\ncommit;')
        print('Migration additive appliquée et enregistrée dans l’historique Supabase.')

if __name__ == '__main__':
    main()
