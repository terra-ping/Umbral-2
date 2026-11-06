import {Capacitor} from '@capacitor/core';
import {CapacitorSQLite,SQLiteConnection,SQLiteDBConnection} from '@capacitor-community/sqlite';
let db:SQLiteDBConnection|null=null;
const KEY='umbral-stories-web-v1';
type Row={id:string;data:string;updated:number};
const rows=():Row[]=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}};
export async function initDatabase(){
 if(!Capacitor.isNativePlatform())return;
 const sqlite=new SQLiteConnection(CapacitorSQLite);
 db=await sqlite.createConnection('umbral',false,'no-encryption',1,false);
 await db.open();
 await db.execute('CREATE TABLE IF NOT EXISTS stories (id TEXT PRIMARY KEY NOT NULL,data TEXT NOT NULL,updated INTEGER NOT NULL);');
}
export async function getStories<T>():Promise<T[]>{
 if(!db)return rows().sort((a,b)=>b.updated-a.updated).map(r=>JSON.parse(r.data) as T);
 const result=await db.query('SELECT data FROM stories ORDER BY updated DESC');
 return (result.values||[]).map(r=>JSON.parse(String(r.data)) as T);
}
export async function saveStory(story:{id:string;updated:number}){
 const data=JSON.stringify(story);
 if(!db){const all=rows().filter(r=>r.id!==story.id);all.push({id:story.id,data,updated:story.updated});localStorage.setItem(KEY,JSON.stringify(all));return;}
 await db.run('INSERT OR REPLACE INTO stories (id,data,updated) VALUES (?,?,?)',[story.id,data,story.updated]);
}
export async function deleteStory(id:string){
 if(!db){localStorage.setItem(KEY,JSON.stringify(rows().filter(r=>r.id!==id)));return;}
 await db.run('DELETE FROM stories WHERE id=?',[id]);
}
