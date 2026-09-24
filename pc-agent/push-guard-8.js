const BRIDGE='https://xtobe-bridge.onrender.com';
async function push(){
  // Guard install #8: Meta AI / bridge can verify strict protection live
  const cmd={type:'guard_check'};
  const r=await fetch(`${BRIDGE}/api/pc-commands`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cmd)});
  console.log(await r.json());
}
push();
