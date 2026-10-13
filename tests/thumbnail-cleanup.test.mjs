import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/thumbnail-cleanup.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { thumbnailPath, cleanupOldThumbnail } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const base='https://project.supabase.co';
const image=(path)=>base+'/storage/v1/object/public/course-thumbnails/'+path;
function client({courses=[],settings=[],error=null,removeError=null}={}) {
 const removed=[];
 return {removed,storage:{from:()=>({getPublicUrl:(p)=>({data:{publicUrl:image(p)}}),remove:async(paths)=>{removed.push(...paths);return {error:removeError};}})},from:(table)=>({select:async()=>({data:table==='courses'?courses:settings,error})})};
}
test('only old unreferenced files from this project thumbnail bucket are removed',async()=>{
 const db=client();
 await cleanupOldThumbnail(db,image('old.png'),image('new.png'));
 assert.deepEqual(db.removed,['old.png']);
 for (const old of ['https://external.example/old.png',base+'/storage/v1/object/public/other/old.png','/images/kistein-do.png',image('new.png')]) await cleanupOldThumbnail(db,old,image('new.png'));
 assert.deepEqual(db.removed,['old.png']);
 assert.equal(thumbnailPath(image('nested/a%20b.png'),base),'nested/a b.png');
 assert.equal(thumbnailPath(image('%2E%2E/secret'),base),null);
});
test('shared course images and bank QR remain stored, including equivalent encoded URLs',async()=>{
 for (const options of [{courses:[{thumbnail_url:image('shared%20image.png')}]},{settings:[{bank_qr_url:image('shared%20image.png')}]}]) {
  const db=client(options);await cleanupOldThumbnail(db,image('shared image.png'),image('new.png'));assert.deepEqual(db.removed,[]);
 }
});
test('failed checks never delete files and deletion errors are reported',async()=>{
 const db=client({error:{message:'Reference check failed'}});
 await assert.rejects(cleanupOldThumbnail(db,image('old.png'),image('new.png')),/Reference check failed/);
 assert.deepEqual(db.removed,[]);
 await assert.rejects(cleanupOldThumbnail(client({removeError:{message:'Storage failed'}}),image('old.png'),image('new.png')),/Storage failed/);
});
