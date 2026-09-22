
const SIG='XTOBE-AI-PC-ADMIN-v2';
let sentryEnabled=false;
try{
  const Sentry=require('@sentry/node');
  if(process.env.SENTRY_DSN){
    Sentry.init({dsn:process.env.SENTRY_DSN, environment:process.env.NODE_ENV});
    sentryEnabled=true;
    console.log('[XTOBE] Sentry monitoring enabled - '+SIG);
  }
}catch{}
function log(level,msg,meta){
  const entry={time:new Date().toISOString(),level,sig:SIG,msg, ...meta};
  console.log(JSON.stringify(entry));
  if(sentryEnabled && level==='error'){
    try{require('@sentry/node').captureMessage(msg);}catch{}
  }
}
function healthMetrics(){
  return {status:'ok',signature:SIG,uptime:process.uptime(),memory:process.memoryUsage(),time:new Date().toISOString()};
}
module.exports={log,healthMetrics};
