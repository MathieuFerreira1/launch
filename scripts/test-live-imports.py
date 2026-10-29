#!/usr/bin/env python3
"""Synthetic integration test against pinned Launch dev. No email is sent.
An administrative key is used only in this server-side process to create/delete
its own synthetic users. Keys and sessions are never printed or saved.
"""
import base64
import hashlib
import json
import os
import secrets
import uuid
import urllib.request
import urllib.error

REF = 'kephzbvcbmjzqqvqgtav'
BASE = f'https://{REF}.supabase.co'
step = 'initialization'

def request(url, key, token=None, body=None, method=None, raw=None, expected=(200,201,204)):
    headers = {'apikey': key, 'Authorization': 'Bearer ' + (token or key)} if key else {}
    headers['Content-Type'] = 'application/octet-stream' if raw is not None else 'application/json'
    data = raw if raw is not None else json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers, method=method), timeout=30) as response:
            payload = response.read()
            assert response.status in expected, step
            return json.loads(payload) if payload else None
    except urllib.error.HTTPError as error:
        if error.code in expected:
            return {'denied': error.code}
        payload = error.read().decode(errors='replace')
        reason = 'RLS_POLICY' if 'row-level security' in payload.lower() else 'HTTP_FAILURE'
        raise AssertionError(f'{step}: HTTP {error.code} ({reason})') from None

def main():
    global step
    management = os.environ['SUPABASE_ACCESS_TOKEN']
    def manage(path):
        r = urllib.request.Request('https://api.supabase.com/v1/' + path, headers={'Authorization':'Bearer '+management})
        with urllib.request.urlopen(r, timeout=30) as response:
            return json.load(response)
    projects = manage('projects')
    assert any(p['id']==REF and p['name'].lower().replace(' ','-')=='launch-dev' for p in projects)
    keys = manage(f'projects/{REF}/api-keys')
    public = next(k['api_key'] for k in keys if k.get('name')=='anon')
    admin = next(k['api_key'] for k in keys if k.get('name')=='service_role')
    users = []
    paths = []
    def rpc(token,name,args,expected=(200,201,204)):
        return request(BASE+'/rest/v1/rpc/'+name,public,token,args,expected=expected)
    try:
        step='create isolated synthetic accounts'
        for suffix in ['a','b']:
            email=f'launch-import-{uuid.uuid4().hex}-{suffix}@example.test';password=secrets.token_urlsafe(32)
            user=request(BASE+'/auth/v1/admin/users',admin,body={'email':email,'password':password,'email_confirm':True})
            users.append({'id':user['id']})
            login=request(BASE+'/auth/v1/token?grant_type=password',public,body={'email':email,'password':password})
            users[-1]['token']=login['access_token']
        a,b=users
        batch=str(uuid.uuid4());rpc(a['token'],'begin_activity_import',{'p_id':batch,'p_total':2,'p_retain':True})
        sources=[]
        for index in range(2):
            step='reserve and upload private synthetic source'
            content=f'<gpx version="1.1"><metadata><name>synthetic-{index}</name></metadata></gpx>'.encode()
            digest=hashlib.sha256(content).hexdigest()
            source=rpc(a['token'],'reserve_activity_file',{'p_hash':digest,'p_name':f'synthetic-{index}.gpx','p_format':'gpx','p_bytes':len(content),'p_batch':batch})
            path=source['storage_path'];paths.append(path)
            request(BASE+'/storage/v1/object/sport-sources/'+path,public,a['token'],raw=content,method='POST')
            sources.append((digest,path))
        step='TUS resumable upload of a 7 MiB synthetic source'
        content=b'<gpx><!--'+b'x'*(7*1024*1024)+b'--></gpx>'
        digest=hashlib.sha256(content).hexdigest()
        source=rpc(a['token'],'reserve_activity_file',{'p_hash':digest,'p_name':'large-synthetic.gpx','p_format':'gpx','p_bytes':len(content),'p_batch':batch})
        path=source['storage_path'];paths.append(path)
        metadata={'bucketName':'sport-sources','objectName':path,'contentType':'application/octet-stream','cacheControl':'0'}
        headers={'apikey':public,'Authorization':'Bearer '+a['token'],'Tus-Resumable':'1.0.0','Upload-Length':str(len(content)),'Upload-Metadata':','.join(k+' '+base64.b64encode(v.encode()).decode() for k,v in metadata.items()),'Content-Type':'application/offset+octet-stream'}
        first=6*1024*1024
        r=urllib.request.Request(BASE+'/storage/v1/upload/resumable',data=content[:first],headers=headers,method='POST')
        with urllib.request.urlopen(r,timeout=60) as response:
            assert response.status==201
            location=response.headers['Location']
        if location.startswith('/'):location=BASE+location
        with urllib.request.urlopen(urllib.request.Request(location,headers={'apikey':public,'Authorization':'Bearer '+a['token'],'Tus-Resumable':'1.0.0'},method='HEAD'),timeout=30) as response:
            offset=int(response.headers['Upload-Offset'])
        while offset<len(content):
            chunk=content[offset:offset+first]
            r=urllib.request.Request(location,data=chunk,headers={'apikey':public,'Authorization':'Bearer '+a['token'],'Tus-Resumable':'1.0.0','Upload-Offset':str(offset),'Content-Type':'application/offset+octet-stream'},method='PATCH')
            with urllib.request.urlopen(r,timeout=60) as response:
                assert response.status==204
                offset=int(response.headers['Upload-Offset'])
        print('PASS: TUS resumable 7 MiB source upload.')
        candidate={'key':sources[0][0]+':0','fileHash':sources[0][0],'title':'Synthetic run','original_sport':'Running','category':'running','started_at_utc':'2026-01-02T08:00:00Z','distance_m':5000,'duration_s':1800}
        step='commit partial batch and retry same request'
        rpc(a['token'],'commit_activity_import',{'p_batch':batch,'p_items':[candidate]})
        assert rpc(a['token'],'finish_activity_import',{'p_batch':batch})=='partial'
        rpc(a['token'],'commit_activity_import',{'p_batch':batch,'p_items':[candidate]})
        rows=request(BASE+'/rest/v1/activities?select=id',public,a['token']);assert len(rows)==1
        activity=rows[0]['id']
        second={**candidate,'key':sources[1][0]+':0','fileHash':sources[1][0]}
        step='require probable duplicate decision, link source and resume'
        assert request(BASE+'/rest/v1/rpc/commit_activity_import',public,a['token'],{'p_batch':batch,'p_items':[second]},expected=(400,)).get('denied')==400
        second['linkId']=activity
        rpc(a['token'],'commit_activity_import',{'p_batch':batch,'p_items':[second]})
        assert rpc(a['token'],'finish_activity_import',{'p_batch':batch})=='completed'
        assert len(request(BASE+'/rest/v1/activities?select=id',public,a['token']))==1
        assert len(request(BASE+'/rest/v1/activity_file_links?select=file_id',public,a['token']))==2
        step='read isolation for B and anonymous'
        for table in ['activities','activity_files','activity_file_links','import_batches','import_items','import_errors','reward_activity_inputs']:
            assert request(BASE+'/rest/v1/'+table+'?select=*',public,b['token'])==[]
        assert request(BASE+'/rest/v1/activities?select=id',public,expected=(401,403)).get('denied') in (401,403)
        step='private source download and forbidden cross-user download'
        # Download is binary, so inspect it without JSON decoding.
        def download(token,path):
            req=urllib.request.Request(BASE+'/storage/v1/object/authenticated/sport-sources/'+path,headers={'apikey':public,'Authorization':'Bearer '+token})
            with urllib.request.urlopen(req,timeout=30) as response:return response.read()
        assert b'synthetic' in download(a['token'],sources[0][1])
        try:
            download(b['token'],sources[0][1]);raise AssertionError('cross-user source read')
        except urllib.error.HTTPError as error:
            assert error.code in (400,401,403,404)
        step='forbidden cross-user source deletion'
        removed=request(BASE+'/storage/v1/object/sport-sources',public,b['token'],{'prefixes':paths},method='DELETE')
        assert removed==[]
        assert b'synthetic' in download(a['token'],sources[0][1])
        step='manual evidence and stable request id'
        manual_id=str(uuid.uuid4());manual={'title':'Synthetic ski','category':'unsupported','original_sport':'Ski','started_at_utc':'2026-01-04T08:00:00Z','distance_m':0,'duration_s':1800}
        saved=rpc(b['token'],'save_manual_activity',{'p_id':manual_id,'p_activity':manual,'p_keep_duplicate':False})
        assert rpc(b['token'],'save_manual_activity',{'p_id':manual_id,'p_activity':manual,'p_keep_duplicate':False})==saved
        row=request(BASE+'/rest/v1/activities?select=evidence_level,category',public,b['token']);assert row==[{'evidence_level':'self_reported','category':'unsupported'}]
        print('PASS: real Auth login, private upload/download, resume, exact/probable duplicates, source linking, manual evidence, REST/Storage isolation A/B and anonymous.')
    except Exception as error:
        print(f'FAIL at {step}: {str(error) if isinstance(error, AssertionError) else type(error).__name__}')
        raise SystemExit(1) from None
    finally:
        cleanup_failed=False
        if users and paths and users[0].get('token'):
            try:request(BASE+'/storage/v1/object/sport-sources',public,users[0]['token'],{'prefixes':paths},method='DELETE')
            except Exception:cleanup_failed=True
        for user in users:
            try:request(BASE+'/auth/v1/admin/users/'+user['id'],admin,method='DELETE')
            except Exception:cleanup_failed=True
        if cleanup_failed:
            print('Cleanup incomplete; inspect synthetic test accounts before re-running.')
            raise SystemExit(1)
        else:print('Cleanup: synthetic sources and accounts removed.')

if __name__=='__main__':
    main()
