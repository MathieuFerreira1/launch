#!/usr/bin/env python3
"""Concurrent reward/reveal/RLS integration on pinned launch-dev, synthetic users only."""
import concurrent.futures
import importlib.util
import json
import os
from pathlib import Path
import secrets
import time
import urllib.request
import uuid

spec=importlib.util.spec_from_file_location('live',Path(__file__).with_name('test-live-imports.py'))
live=importlib.util.module_from_spec(spec)
spec.loader.exec_module(live)
def manage(path):
    with urllib.request.urlopen(urllib.request.Request('https://api.supabase.com/v1/'+path,headers={'Authorization':'Bearer '+os.environ['SUPABASE_ACCESS_TOKEN']}),timeout=30) as response:return json.load(response)
def main():
    assert any(p['id']==live.REF and p['name'].lower().replace(' ','-')=='launch-dev' for p in manage('projects'))
    keys=manage(f'projects/{live.REF}/api-keys')
    public=next(k['api_key'] for k in keys if k['name']=='anon');admin=next(k['api_key'] for k in keys if k['name']=='service_role')
    users=[]
    def rpc(token,name,args=None,expected=(200,201,204)):
        return live.request(live.BASE+'/rest/v1/rpc/'+name,public,token,args or {},expected=expected)
    try:
        for suffix in ['a','b']:
            email=f'launch-rewards-{uuid.uuid4().hex}-{suffix}@example.test';pwd=secrets.token_urlsafe(32)
            user=live.request(live.BASE+'/auth/v1/admin/users',admin,body={'email':email,'password':pwd,'email_confirm':True})
            users.append({'id':user['id']})
            users[-1]['token']=live.request(live.BASE+'/auth/v1/token?grant_type=password',public,body={'email':email,'password':pwd})['access_token']
        a,b=users
        source_ids={}
        for sport,dist,duration,gain in [('running',42195,15000,0),('cycling',200000,30000,2000),('swimming',5000,8000,0)]:
            source_ids[sport]=rpc(a['token'],'save_manual_activity',{'p_id':str(uuid.uuid4()),'p_activity':{'title':'Synthetic training','original_sport':sport,'category':sport,'started_at_utc':'2026-01-02T08:00:00Z','distance_m':dist,'duration_s':duration,'elevation_gain_m':gain},'p_keep_duplicate':True})
        started=time.perf_counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(lambda _:rpc(a['token'],'process_reward_batch',{'p_limit':1}),range(2)))
        assert {r['processed'] for r in results}=={1,2}
        assert len({r['job_id'] for r in results})==1
        rpc(a['token'],'process_reward_batch',{'p_limit':250})
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(lambda _:rpc(a['token'],'process_reward_batch',{'p_limit':250,'p_replay':True}),range(2)))
        data=rpc(a['token'],'get_collection_data')
        assert len(data['owned'])==21 and len(data['pending'])==1 and data['pending'][0]['card_count']==21
        assert all(x['scope']=='personal' and not x['competitive_eligible'] for x in data['owned'])
        print('PASS: two simultaneous batches share one resumable cursor; concurrent replays keep 21 cards and one initial reveal. Elapsed ms:',round((time.perf_counter()-started)*1000))
        for table in ['user_cards','achievement_events','reveal_sessions','reveal_items','reward_jobs','reward_processing_state','reward_proof_history']:
            assert live.request(live.BASE+'/rest/v1/'+table+'?select=*',public,b['token'])==[]
        assert rpc(b['token'],'get_collection_data')['owned']==[]
        sid=data['pending'][0]['id']
        assert rpc(b['token'],'advance_reveal',{'p_session':sid,'p_finish':True},expected=(400,))['denied']==400
        assert live.request(live.BASE+'/rest/v1/user_cards',public,b['token'],{'user_id':b['id'],'card_id':'RUN_MARATHON','engine_version':'spoof','catalogue_revision':1,'evidence_level':'self_reported','rule_snapshot':{},'evidence_snapshot':{}},expected=(401,403)).get('denied') in (401,403)
        rpc(a['token'],'advance_reveal',{'p_session':sid,'p_position':2})
        resumed=rpc(a['token'],'advance_reveal',{'p_session':sid,'p_position':1})
        assert resumed['position']==2 and resumed['status']=='viewing'
        rpc(a['token'],'advance_reveal',{'p_session':sid,'p_finish':True})
        new_id=str(uuid.uuid4());activity={'title':'Synthetic trail','original_sport':'Trail','category':'trail','started_at_utc':'2026-01-04T08:00:00Z','distance_m':20000,'duration_s':12000,'elevation_gain_m':3000}
        for _ in range(2):
            rpc(a['token'],'save_manual_activity',{'p_id':new_id,'p_activity':activity,'p_keep_duplicate':True})
            rpc(a['token'],'process_reward_batch')
        data=rpc(a['token'],'get_collection_data')
        assert len(data['owned'])==28 and len(data['pending'])==1 and data['pending'][0]['card_count']==7
        assert data['pending'][0]['kind']=='new_achievements'
        events=live.request(live.BASE+'/rest/v1/achievement_events?select=id',public,a['token']);assert len(events)==28
        print('PASS: REST RLS A/B, forbidden client award, monotonic reveal resume/skip, daily 7 new cards, complete 28-card collection and replay without duplicates.')
        alternative=rpc(a['token'],'save_manual_activity',{'p_id':str(uuid.uuid4()),'p_activity':{'title':'Synthetic alternative marathon','original_sport':'Running','category':'running','started_at_utc':'2026-01-06T08:00:00Z','distance_m':45000,'duration_s':15000},'p_keep_duplicate':True})
        rpc(a['token'],'correct_activity_sport',{'p_id':source_ids['running'],'p_category':'unknown'})
        rpc(a['token'],'process_reward_batch')
        data=rpc(a['token'],'get_collection_data')
        assert len(data['owned'])==28 and all(c['proof_status']=='available' for c in data['owned'])
        assert all(c['activity_id']==alternative for c in data['owned'] if c['card_id'].startswith('RUN_') and c['evidence_level']!='collection_unverified')
        history=live.request(live.BASE+'/rest/v1/reward_proof_history?select=id',public,a['token']);assert len(history)==6
        assert live.request(live.BASE+'/rest/v1/reward_proof_history?select=id',public,b['token'])==[]
        assert len(data['pending'])==1 and data['pending'][0]['card_count']==7
        print('PASS: corrected original activity reconciles six proofs to an existing valid activity, keeps original award audit and does not create a new reveal.')
    finally:
        failed=False
        for user in users:
            try:live.request(live.BASE+'/auth/v1/admin/users/'+user['id'],admin,method='DELETE')
            except Exception:failed=True
        if failed:raise RuntimeError('Synthetic cleanup incomplete')
        print('Cleanup: only the two generated reward test accounts removed.')
if __name__=='__main__':
    try:main()
    except Exception as error:
        print('Reward live test failed:',type(error).__name__)
        raise SystemExit(1) from None
