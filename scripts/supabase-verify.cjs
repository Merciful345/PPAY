'use strict';
// Verificación remota con datos ficticios. Todas las escrituras se revierten.
const fs=require('node:fs'),{randomUUID}=require('node:crypto'),{Client}=require('pg');
const assert=require('node:assert/strict');
async function verify(client){const approved=randomUUID(),outsider=randomUUID(),id=randomUUID(),email=approved+'@ppay.invalid';
 await client.query('begin');try{
 const bucket=await client.query("select public from storage.buckets where id='fcr-files'");assert.equal(bucket.rows[0]?.public,false);
 await client.query('insert into public.fcr_supervisor_emails(email) values($1)',[email]);
 await client.query("insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values($1,$2,now(),'{\"provider\":\"email\",\"providers\":[\"email\"]}','{}'),($3,$4,now(),'{}','{}')",[approved,email,outsider,outsider+'@ppay.invalid']);
 assert.equal((await client.query('select status from public.fcr_access_requests where user_id=$1',[outsider])).rows[0].status,'pending');
 await client.query('insert into public.fcr_supervisors(user_id) values($1)',[approved]);
 await client.query('insert into public.fcr_access_admins(user_id) values($1)',[approved]);
 await client.query("update public.fcr_access_requests set status='approved' where user_id=$1",[approved]);
 assert.equal((await client.query('select user_id from public.fcr_supervisors where user_id=$1',[approved])).rowCount,1);
 async function role(name,user){await client.query('reset role');await client.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:user,role:name})]);await client.query('set local role '+name);}
 async function denied(sql,args=[]){await client.query('savepoint denied');try{await client.query(sql,args);throw Error('Se permitió una operación que debía rechazarse.');}catch(error){assert.equal(error.code,'42501');}finally{await client.query('rollback to savepoint denied');}}
 await role('authenticated',approved);
 await client.query("insert into public.fcr_imports(id,object_path,name,size,digest,created_by) values($1,$2,'prueba-ficticia.csv',10,$3,$4)",[id,'files/'+id+'/prueba.csv','0'.repeat(64),approved]);
 assert.equal((await client.query('select id from public.fcr_imports where id=$1',[id])).rowCount,1);
 await client.query("update public.fcr_imports set period='2026-10' where id=$1",[id]);
 await denied("update public.fcr_imports set name='sobrescrito.csv' where id=$1",[id]);
 await role('authenticated',outsider);
 assert.equal((await client.query('select id from public.fcr_imports where id=$1',[id])).rowCount,0);
 await denied("insert into public.fcr_imports(id,object_path,name,size,digest,created_by) values($1,$2,'rechazada.csv',10,$3,$4)",[randomUUID(),'files/'+id+'/otro.csv','1'.repeat(64),outsider]);
 await denied("insert into storage.objects(bucket_id,name) values('fcr-files','files/prueba-ficticia.csv')");
 await denied("update public.fcr_access_requests set status='approved' where user_id=$1",[outsider]);
 await denied("select public.review_fcr_access($1,'approved')",[outsider]);
 assert.equal((await client.query('select user_id from public.fcr_access_requests')).rowCount,1);
 await role('authenticated',approved);
 await client.query("select public.review_fcr_access($1,'rejected')",[outsider]);
 await role('authenticated',outsider);
 assert.equal((await client.query('select id from public.fcr_imports where id=$1',[id])).rowCount,0);
 await denied("select public.review_fcr_access($1,'approved','rejected')",[outsider]);
 await role('authenticated',approved);
 await client.query("select public.review_fcr_access($1,'approved','rejected')",[outsider]);
 await client.query('savepoint stale');
 try{await client.query("select public.review_fcr_access($1,'approved','rejected')",[outsider]);throw Error('Se aceptó una revisión obsoleta.');}catch(error){assert.equal(error.code,'40001');}finally{await client.query('rollback to savepoint stale');}
 await role('authenticated',outsider);
 assert.equal((await client.query('select id from public.fcr_imports where id=$1',[id])).rowCount,1);
 // Un supervisor aprobado no puede aprobar otras cuentas ni autopromoverse.
 await denied('insert into public.fcr_access_admins(user_id) values($1)',[outsider]);
 await denied("select public.review_fcr_access($1,'approved')",[approved]);
 await role('anon',outsider);await denied('select id from public.fcr_imports');
 await client.query('reset role');
 console.log('OK remoto: bucket privado, supervisor autorizado, RLS bloquea anónimos y usuarios ajenos, originales sin sobrescritura. Datos ficticios revertidos.');
 }finally{await client.query('rollback');}}
async function connect(){const ca=process.env.PGSSLROOTCERT?fs.readFileSync(process.env.PGSSLROOTCERT,'utf8'):await (await fetch('https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt')).text(),client=new Client({connectionString:process.env.DATABASE_URL,ssl:{ca,rejectUnauthorized:true},connectionTimeoutMillis:15000});try{await client.connect();await verify(client);}finally{await client.end();}}
if(require.main===module)connect().catch(error=>{console.error('Falló la verificación remota:',error.code||error.name);process.exitCode=1;});
module.exports=verify;
