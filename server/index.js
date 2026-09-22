
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const { globalLimiter, authLimiter, bruteForceGuard } = require('../secure/authShield');
const { verifyWhatsappSignature } = require('../secure/webhookVerify');
const { verifyLicense, secureBrandInjection, addInvisibleWatermark, hideSecrets, limiter, generateLicenseToken } = require('../secure/antiCloneShield');
const { requireSession, checkCredentials, createToken } = require('./auth');

const app = express();
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';
const SIG = 'XTOBE-AI-PC-ADMIN-v2';

app.use(helmet({contentSecurityPolicy:false}));
const allowed = (process.env.ALLOWED_DOMAINS || 'xtobe.ae,localhost').split(',').map(s=>s.trim().toLowerCase());
app.use(cors({
  origin: (origin, cb)=>{
    if (!origin) return cb(null,true);
    try{
      const host = new URL(origin).hostname.toLowerCase();
      const ok = allowed.some(d=>host===d || host.endsWith('.'+d) || host.includes(d)) || host.includes('localhost');
      return ok ? cb(null,true) : cb(new Error('CORS blocked'));
    }catch{ return cb(null,true); }
  },
  credentials:true
}));
app.use(cookieParser());
app.use(express.json({verify:(req,res,buf)=>{req.rawBody=buf;}}));
app.use(express.urlencoded({extended:true}));

app.use(globalLimiter);
app.use(authLimiter);
app.use(bruteForceGuard);
app.use(limiter);
app.use(hideSecrets);

app.use(express.static(path.join(__dirname,'..','public')));

const brands = new Map();
brands.set('lumiere',{clinic_id:'lumiere',name:'Lumiere Aesthetics',tagline:'Growth Engine',primary:'#3E9EFF',logo_url:'/logo.png'});

app.get('/health',(req,res)=>res.json({status:'ok',signature:SIG,time:new Date().toISOString(),uptime:process.uptime()}));
app.get('/api/health',(req,res)=>res.json({status:'ok',signature:SIG}));

app.get('/api/brand/:clinic_id',verifyLicense,(req,res)=>{
  const b = brands.get(req.params.clinic_id) || brands.get('lumiere');
  res.json(b);
});
app.post('/api/brand',requireSession,(req,res)=>{
  const {clinic_id,name,primary,logo_url,domain} = req.body;
  if(!clinic_id) return res.status(400).json({error:'clinic_id required'});
  brands.set(clinic_id,{clinic_id,name,primary,logo_url,tagline:'Growth Engine'});
  let token=null;
  try{ token = generateLicenseToken(clinic_id, domain||'xtobe.ae'); }catch{}
  res.json({ok:true,brand:brands.get(clinic_id),license_token:token});
});
app.get('/api/brand/injection.js',secureBrandInjection,(req,res)=>{
  const p = path.join(__dirname,'..','secure','injection.secure.js');
  let js = fs.readFileSync(p,'utf8');
  res.setHeader('Content-Type','application/javascript');
  res.send('// '+SIG+'\n'+js);
});

app.post('/api/auth/login',(req,res)=>{
  const {email,password} = req.body;
  const ok = checkCredentials(email,password);
  if(req._xtobeRecordLogin) req._xtobeRecordLogin(ok);
  if(!ok) return res.status(401).json({error:'Invalid credentials'});
  const token = createToken(email);
  res.cookie('xtobe_token',token,{httpOnly:true,secure:true,sameSite:'lax',maxAge:12*3600*1000});
  res.json({ok:true,token,email});
});
app.post('/api/auth/logout',(req,res)=>{
  res.clearCookie('xtobe_token');
  res.json({ok:true});
});
app.get('/api/me',requireSession,(req,res)=>res.json({ok:true,user:req.user}));

app.post('/whatsapp/webhook',verifyWhatsappSignature,(req,res)=>{
  console.log('[WA] webhook received');
  res.sendStatus(200);
});
app.get('/whatsapp/webhook',(req,res)=>{
  const mode=req.query['hub.mode'];
  const token=req.query['hub.verify_token'];
  const challenge=req.query['hub.challenge'];
  if(mode==='subscribe' && token===(process.env.WHATSAPP_VERIFY_TOKEN||'xtobe-verify-123')){
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

app.get('/dashboard',(req,res)=>{
  const html = fs.readFileSync(path.join(__dirname,'..','public','dashboard.html'),'utf8');
  res.send(addInvisibleWatermark(html,'dashboard'));
});
app.get('/',(req,res)=>{
  const p = path.join(__dirname,'..','public','index.html');
  if(fs.existsSync(p)){
    const html = fs.readFileSync(p,'utf8');
    return res.send(addInvisibleWatermark(html,'home'));
  }
  res.json({name:'XTOBE AI',signature:SIG,status:'PC Admin Model Live'});
});

app.use((req,res)=>res.status(404).json({error:'Not found',signature:SIG}));

app.listen(PORT,HOST,()=>console.log('[XTOBE] '+SIG+' running on '+HOST+':'+PORT+' - Render ready'));
