
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@xtobe.ae';
let ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH;
if (!ADMIN_HASH && process.env.ADMIN_PASSWORD) {
  ADMIN_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12);
}
if (!ADMIN_HASH) ADMIN_HASH = bcrypt.hashSync('Admin123!', 12);

function requireSession(req,res,next){
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : (req.cookies?.xtobe_token || req.query.token);
  if (!token) return res.status(401).json({error:'Unauthorized - session required'});
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev-secret');
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({error:'Invalid or expired session'});
  }
}

function checkCredentials(email,password){
  if (!email || !password) return false;
  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return false;
  return bcrypt.compareSync(password, ADMIN_HASH);
}

function createToken(email){
  return jwt.sign({email, role:'admin', sig:'XTOBE-AI-PC-ADMIN-v2'}, process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev-secret', {expiresIn:'12h'});
}

module.exports = { requireSession, checkCredentials, createToken, ADMIN_EMAIL };
