require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('./db');
require('./seed');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'development-only-change-me';
const uploads = path.join(__dirname, 'uploads');
fs.mkdirSync(uploads, {recursive:true});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({limit:'1mb'}));
app.use(express.static(path.join(__dirname,'..','frontend')));
app.use('/api/auth', rateLimit({windowMs:15*60*1000, max:30, standardHeaders:true, legacyHeaders:false}));

const storage = multer.diskStorage({
 destination: (_req,_file,cb)=>cb(null,uploads),
 filename: (_req,file,cb)=>cb(null,crypto.randomUUID()+'.pdf')
});
const upload = multer({storage, limits:{fileSize:5*1024*1024}, fileFilter:(_req,file,cb)=>{
  cb(null, file.mimetype==='application/pdf' && path.extname(file.originalname).toLowerCase()==='.pdf');
}});

function auth(req,res,next){
 const token=req.cookies?.jsd_token || (req.headers.authorization||'').replace(/^Bearer /,'');
 if(!token) return res.status(401).json({error:'Faça login para continuar.'});
 try { req.user=jwt.verify(token,SECRET); next(); }
 catch { return res.status(401).json({error:'Sua sessão expirou. Entre novamente.'}); }
}
function role(...roles){ return (req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({error:'Você não tem permissão para esta ação.'}); }
function safeUser(u){ return {id:u.id,name:u.name,email:u.email,role:u.role,active:!!u.active}; }
app.use((req,res,next)=>{
 const cookie=req.headers.cookie||'';
 req.cookies=Object.fromEntries(cookie.split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1).trim())]}));
 next();
});

app.post('/api/auth/login',(req,res)=>{
 const {email,password}=req.body||{};
 if(!email||!password) return res.status(400).json({error:'Informe e-mail e senha.'});
 const user=db.prepare('SELECT * FROM users WHERE email=?').get(String(email).trim().toLowerCase());
 if(!user||!user.active||!bcrypt.compareSync(password,user.password_hash)) return res.status(401).json({error:'E-mail ou senha inválidos.'});
 const token=jwt.sign({id:user.id,name:user.name,email:user.email,role:user.role},SECRET,{expiresIn:'8h'});
 res.setHeader('Set-Cookie',`jsd_token=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${process.env.NODE_ENV==='production'?'; Secure':''}`);
 res.json({user:safeUser(user)});
});
app.post('/api/auth/logout',(_req,res)=>{res.setHeader('Set-Cookie','jsd_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');res.json({ok:true});});
app.get('/api/auth/me',auth,(req,res)=>res.json({user:req.user}));

app.get('/api/dashboard',auth,(req,res)=>{
 const uid=req.user.id;
 const benefit=db.prepare('SELECT month,amount FROM benefits WHERE user_id=? ORDER BY id DESC LIMIT 1').get(uid);
 const payslip=db.prepare('SELECT month FROM payslips WHERE user_id=? ORDER BY id DESC LIMIT 1').get(uid);
 const requests=db.prepare("SELECT COUNT(*) n FROM requests WHERE user_id=? AND status!='Concluída'").get(uid).n;
 const announcements=db.prepare('SELECT * FROM announcements ORDER BY featured DESC,id DESC LIMIT 5').all();
 res.json({benefit,payslip,openRequests:requests,announcements});
});
app.get('/api/payslips',auth,(req,res)=>{
 const rows=req.user.role==='admin'||req.user.role==='hr'
 ? db.prepare('SELECT p.*,u.name user_name FROM payslips p JOIN users u ON u.id=p.user_id ORDER BY p.id DESC').all()
 : db.prepare('SELECT * FROM payslips WHERE user_id=? ORDER BY id DESC').all(req.user.id);
 res.json(rows);
});
app.get('/api/payslips/:id/download',auth,(req,res)=>{
 const p=db.prepare('SELECT * FROM payslips WHERE id=?').get(req.params.id);
 if(!p) return res.status(404).json({error:'Holerite não encontrado.'});
 if(!['admin','hr'].includes(req.user.role)&&p.user_id!==req.user.id) return res.status(403).json({error:'Acesso negado.'});
 const file=path.join(uploads,p.filename);
 if(!fs.existsSync(file)) return res.status(404).json({error:'Arquivo demonstrativo não encontrado.'});
 res.download(file,p.original_name);
});
app.get('/api/benefits',auth,(req,res)=>res.json(db.prepare('SELECT month,amount,note FROM benefits WHERE user_id=? ORDER BY id DESC').all(req.user.id)));
app.get('/api/announcements',auth,(_req,res)=>res.json(db.prepare('SELECT * FROM announcements ORDER BY featured DESC,id DESC').all()));
app.get('/api/requests',auth,(req,res)=>res.json(db.prepare('SELECT * FROM requests WHERE user_id=? ORDER BY id DESC').all(req.user.id)));
app.post('/api/requests',auth,(req,res)=>{
 const {category,subject,description}=req.body||{};
 if(!category||!subject||!description) return res.status(400).json({error:'Preencha todos os campos.'});
 const info=db.prepare('INSERT INTO requests(user_id,category,subject,description) VALUES(?,?,?,?)').run(req.user.id,category,subject,description);
 res.status(201).json({id:info.lastInsertRowid});
});
app.get('/api/appointments',auth,(req,res)=>res.json(db.prepare('SELECT date,time,status FROM appointments WHERE user_id=? ORDER BY date,time').all(req.user.id)));
app.post('/api/appointments',auth,(req,res)=>{
 const {date,time}=req.body||{};
 if(!date||!time) return res.status(400).json({error:'Escolha uma data e um horário.'});
 const info=db.prepare('INSERT INTO appointments(user_id,date,time) VALUES(?,?,?)').run(req.user.id,date,time);
 res.status(201).json({id:info.lastInsertRowid});
});
app.get('/api/admin/users',auth,role('admin','hr'),(_req,res)=>res.json(db.prepare('SELECT id,name,email,role,active,created_at FROM users ORDER BY name').all()));
app.post('/api/admin/users',auth,role('admin'),(req,res)=>{
 const {name,email,password,role: userRole}=req.body||{};
 if(!name||!email||!password||!['employee','supervisor','hr','admin'].includes(userRole)) return res.status(400).json({error:'Dados inválidos.'});
 try {
  const info=db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)').run(name,email.toLowerCase(),bcrypt.hashSync(password,10),userRole);
  res.status(201).json({id:info.lastInsertRowid});
 } catch {res.status(409).json({error:'Este e-mail já está cadastrado.'});}
});
app.post('/api/admin/payslips',auth,role('admin','hr'),upload.single('pdf'),(req,res)=>{
 if(!req.file) return res.status(400).json({error:'Envie um arquivo PDF válido (máximo 5 MB).'});
 const {userId,month}=req.body;
 if(!userId||!month){fs.unlinkSync(req.file.path);return res.status(400).json({error:'Informe colaborador e competência.'});}
 const info=db.prepare('INSERT INTO payslips(user_id,month,filename,original_name) VALUES(?,?,?,?)').run(userId,month,req.file.filename,req.file.originalname);
 res.status(201).json({id:info.lastInsertRowid});
});
app.post('/api/admin/announcements',auth,role('admin','hr'),(req,res)=>{
 const {title,category,body,featured}=req.body||{};
 if(!title||!category||!body) return res.status(400).json({error:'Preencha título, categoria e conteúdo.'});
 db.prepare('INSERT INTO announcements(title,category,body,author,featured) VALUES(?,?,?,?,?)').run(title,category,body,req.user.name,featured?1:0);
 res.status(201).json({ok:true});
});
app.get('/api/admin/summary',auth,role('admin','hr'),(_req,res)=>res.json({
 users:db.prepare('SELECT COUNT(*) n FROM users').get().n,
 payslips:db.prepare('SELECT COUNT(*) n FROM payslips').get().n,
 requests:db.prepare("SELECT COUNT(*) n FROM requests WHERE status!='Concluída'").get().n,
 announcements:db.prepare('SELECT COUNT(*) n FROM announcements').get().n
}));

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'..','frontend','index.html')));
app.listen(PORT,()=>console.log(`JSD Portal disponível em http://localhost:${PORT}`));
