const BRIDGE='https://xtobe-bridge.onrender.com';
async function push(){
  const cmd={type:'write_file',path:'public/test-live.txt',content:`LIVE VERIFICATION #4\nTime: ${new Date().toISOString()}\nAgent: waiting at Last ID 3\nIf you see this file, independence proven\nBalance: 120 + 100 = 220 after this`};
  const r=await fetch(`${BRIDGE}/api/pc-commands`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cmd)});
  console.log(await r.json());
}
push();
