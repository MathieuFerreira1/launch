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
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['validate', 'test', 'apply'])
    args = parser.parse_args()
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
values ('{VERSION}',array[{literal}],'profiles_and_sports');
"""
        sql('begin;\n' + migration + '\n' + history_sql + '\ncommit;')
        print('Migration additive appliquée et enregistrée dans l’historique Supabase.')

if __name__ == '__main__':
    main()
