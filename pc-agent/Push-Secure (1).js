
const fs=require('fs'),path=require('path');
const BRIDGE='https://xtobe-bridge.onrender.com';
// This file is the secure version - local only, no public bridge POST
const filePath=path.join(__dirname,'true-app-secure.html');
if(!fs.existsSync(filePath)){
  console.log('true-app-secure.html not found in',__dirname);
  console.log('Copy it from Downloads to this folder first');
  process.exit(1);
}
const content=fs.readFileSync(filePath,'utf8');
async function push(){
  console.log('Pushing SECURE true-app.html to bridge...');
  console.log('Size:',content.length,'bytes');
  console.log('Mode: LOCAL ONLY - no public bridge POST inside app');
  const cmd={type:'write_file',path:'public/true-app.html',content:content};
  try{
    const res=await fetch(`${BRIDGE}/api/pc-commands`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cmd)});
    const data=await res.json();
    console.log('✅ Bridge response:',data);
    console.log('Command ID:',data.id);
    console.log('Your PC agent PID 395964 will write public/true-app.html in ~3s');
    console.log('Watch your pc-agent console for: [PC] Executing #'+data.id);
  }catch(e){console.error('Bridge push failed:',e.message);}
}
push();
