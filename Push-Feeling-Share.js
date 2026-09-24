
// Push Feeling Share to Bridge -> PC Agent will write it
const fs=require('fs'),path=require('path');
const BRIDGE='https://xtobe-bridge.onrender.com';
const filePath=path.join(__dirname,'true-app.html');
const content=fs.readFileSync(filePath,'utf8');
async function push(){
  console.log('Pushing true-app.html to bridge...',content.length,'bytes');
  const cmd={
    type:'write_file',
    path:'public/true-app.html',
    content: content
  };
  const res=await fetch(`${BRIDGE}/api/pc-commands`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(cmd)
  });
  const data=await res.json();
  console.log('Bridge response:',data);
  console.log('Command posted ID:',data.id);
  console.log('Your PC agent PID 395964 will pick it up in 3s and write public/true-app.html');
  console.log('Then open http://localhost:10000/true-app.html or file:///.../public/true-app.html');
}
push();
