import {Capacitor} from '@capacitor/core';
import {SecureStoragePlugin} from 'capacitor-secure-storage-plugin';
const KEY='openrouter_api_key';
export async function readApiKey():Promise<string>{
 if(!Capacitor.isNativePlatform())return localStorage.getItem(KEY)||'';
 try{return (await SecureStoragePlugin.get({key:KEY})).value||'';}catch{return '';}
}
export async function writeApiKey(value:string){
 if(!Capacitor.isNativePlatform()){if(value)localStorage.setItem(KEY,value);else localStorage.removeItem(KEY);return;}
 if(value)await SecureStoragePlugin.set({key:KEY,value});
 else{try{await SecureStoragePlugin.remove({key:KEY});}catch{/* absent */}}
}
