import fs from 'node:fs';import {loadSupabaseEnv} from './load-env.mjs';import {createClient} from '@supabase/supabase-js';
const {url,serviceRoleKey}=loadSupabaseEnv();const db=createClient(url,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
const snapshot={createdAt:new Date().toISOString(),tables:{}};
for(const table of ['categories','umkm','admins','owner_keys','owner_key_attempts','activity_logs']){const {data,error}=await db.from(table).select('*');snapshot.tables[table]={data,error:error?.message};console.log(JSON.stringify({table,rows:data?.length,columns:data?.[0]?Object.keys(data[0]):[],error:error?.message}));}
fs.mkdirSync('data-imports/backups',{recursive:true});fs.writeFileSync('data-imports/backups/before-replacement-'+Date.now()+'.json',JSON.stringify(snapshot,null,2));
const settings=await fetch(url+'/auth/v1/settings',{headers:{apikey:serviceRoleKey}}).then(r=>r.json());console.log(JSON.stringify({googleEnabled:settings.external?.google}));

