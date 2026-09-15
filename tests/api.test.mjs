import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,makeSession,validSession} from '../netlify/lib/handler.mjs';
const secret='test-only-password-with-32-characters';
function fixture(password=secret){
 const records=new Map();
 const store={get:async key=>records.get(key)||null,setJSON:async(key,value)=>records.set(key,value),async *list(){yield {blobs:[...records.keys()].map(key=>({key}))};}};
 const handler=createHandler({getStore:()=>store,password:()=>password,party:{location:'Private venue',address:'Secret address'}});
 const post=(body,cookie='',origin='https://party.example')=>handler(new Request('https://party.example/.netlify/functions/api',{method:'POST',headers:{'Content-Type':'application/json',cookie,origin},body:JSON.stringify(body)}));
 return {handler,post,records};
}
test('host login, guest creation, private invitation and RSVP updates persist',async()=>{
 const {post,handler}=fixture();
 assert.equal((await post({action:'list'})).status,401);
 assert.equal((await post({action:'login',password:'wrong'})).status,401);
 const login=await post({action:'login',password:secret});assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);
 const create=await post({action:'create',name:'Alex <script>'},cookie);assert.equal(create.status,201);
 const {guest}=await create.json();assert.match(guest.token,/^[a-f0-9]{48}$/);
 const invitation=await handler(new Request(`https://party.example/.netlify/functions/api?invite=${guest.token}`));
 const data=await invitation.json();assert.equal(data.name,'Alex <script>');assert.equal(data.party.address,'Secret address');assert.equal(data.token,undefined);
 assert.equal((await post({action:'rsvp',token:guest.token,status:'yes',note:'Vegetarian, please.'})).status,200);
 let list=await (await post({action:'list'},cookie)).json();assert.equal(list.guests[0].note,'Vegetarian, please.');assert.equal(list.guests[0].status,'yes');
 await post({action:'rsvp',token:guest.token,status:'no',note:'Plans changed.'});
 list=await (await post({action:'list'},cookie)).json();assert.equal(list.guests[0].status,'no');assert.equal(list.guests.length,1);
});
test('invalid input, missing tokens and cross-origin writes are rejected',async()=>{
 const {post,handler}=fixture();const cookie=`after_dark_host=${makeSession(secret)}`;
 assert.equal((await post({action:'create',name:'  '},cookie)).status,400);
 assert.equal((await post({action:'create',name:'Alex'},cookie,'https://evil.example')).status,403);
 assert.equal((await post({action:'rsvp',token:'a'.repeat(48),status:'yes',note:'x'.repeat(1001)})).status,400);
 assert.equal((await post({action:'rsvp',token:'a'.repeat(48),status:'yes',note:''})).status,404);
 assert.equal((await handler(new Request('https://party.example/.netlify/functions/api?invite=invalid'))).status,404);
});
test('short passwords allow authenticated access while empty configuration stays locked',async()=>{
 const {post}=fixture('boo');
 const login=await post({action:'login',password:'boo'});
 assert.equal(login.status,200);
 assert.equal((await post({action:'list'},login.headers.get('set-cookie'))).status,200);
 assert.equal((await post({action:'login',password:'wrong'})).status,401);
 assert.equal((await fixture('').post({action:'login',password:''})).status,503);
});
test('sessions reject tampering, expired cookies and password rotation',()=>{
 const cookie=`after_dark_host=${makeSession(secret,1000)}`;
 assert.equal(validSession(cookie,secret,1001),true);
 assert.equal(validSession(cookie+'a',secret,1001),false);
 assert.equal(validSession(cookie,secret,1000+8*60*60*1000),false);
 assert.equal(validSession(cookie,'a-different-password',1001),false);
});
