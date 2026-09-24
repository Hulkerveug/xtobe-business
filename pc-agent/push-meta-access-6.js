const BRIDGE='https://xtobe-bridge.onrender.com';
async function push(){
  // Meta AI self-test #6: read_file + list_files (proves chat can access PC)
  for (const cmd of [
    {type:'read_file',path:'pc-agent/data/tokens.json'},
    {type:'list_files',path:'public'}
  ]){
    const r=await fetch(`${BRIDGE}/api/pc-commands`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cmd)});
    console.log(await r.json());
  }
}
push();
