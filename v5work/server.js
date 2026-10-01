const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SS@Admin2026';
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const UPLOADS = path.join(ROOT, 'uploads');
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'content.json');
fs.mkdirSync(UPLOADS, {recursive:true});
fs.mkdirSync(DATA_DIR, {recursive:true});

const defaultData = {videos: [], affairs: [], assets: [], achievers: [], comments: [], notifications: [], settings: {phone:'+91 96149 41455', youtube:'https://youtube.com/@scienceexpressbysurajit', facebook:'https://www.facebook.com/share/1F21diM9hD/', telegram:'https://t.me/+lDDwpgOh3FM4MDk1', logo:'', banner:'', live:{active:false,title:'SS Study Centre Live Class',description:'Live classes for Railway and Government Job preparation.',youtubeUrl:'',schedule:''}}};
function loadData(){ try { return {...defaultData, ...JSON.parse(fs.readFileSync(DATA_FILE,'utf8'))}; } catch { return {...defaultData}; } }
let db = loadData();
function saveData(){ fs.writeFileSync(DATA_FILE, JSON.stringify(db,null,2)); }
function id(){ return crypto.randomUUID(); }
function safeName(original){ return Date.now()+'-'+crypto.randomBytes(5).toString('hex')+'-'+path.basename(original).replace(/[^a-zA-Z0-9._-]/g,'_'); }
function cookieToken(req){ const h=req.headers.cookie||''; const m=h.match(/ss_admin=([^;]+)/); return m ? m[1] : ''; }
const sessions = new Set();
function auth(req,res,next){ if(!sessions.has(cookieToken(req))) return res.status(401).json({error:'Unauthorized'}); next(); }

const storage = multer.diskStorage({destination: UPLOADS, filename:(req,file,cb)=>cb(null,safeName(file.originalname))});
const upload = multer({storage, limits:{fileSize: 2*1024*1024*1024}});

app.use(express.json({limit:'2mb'}));
app.use('/uploads', express.static(UPLOADS, {maxAge:'7d'}));

app.get('/api/public', (req,res)=>{
  res.json({
    videos: db.videos.map(v=>({...v})),
    affairs: db.affairs.map(a=>({...a})),
    assets: db.assets.map(a=>({...a})),
    achievers: db.achievers.map(a=>({...a})),
    comments: db.comments.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,100),
    notifications: (db.notifications||[]).slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,30),
    settings: db.settings
  });
});
app.post('/api/admin/login',(req,res)=>{
  if(String(req.body.password||'') !== ADMIN_PASSWORD) return res.status(401).json({error:'Wrong password'});
  const token=crypto.randomBytes(32).toString('hex'); sessions.add(token);
  res.setHeader('Set-Cookie',`ss_admin=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`);
  res.json({ok:true});
});
app.post('/api/admin/logout',auth,(req,res)=>{sessions.delete(cookieToken(req)); res.setHeader('Set-Cookie','ss_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'); res.json({ok:true});});
app.get('/api/admin/me',auth,(req,res)=>res.json({ok:true}));



app.get('/api/live', (req,res)=>res.json(db.settings?.live || defaultData.settings.live));
app.get('/api/comments', (req,res)=>res.json(db.comments.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,100)));
app.post('/api/comments',(req,res)=>{
  const name=String(req.body.name||'Student').trim().slice(0,60);
  const message=String(req.body.message||'').trim().slice(0,500);
  if(!message) return res.status(400).json({error:'Comment লিখুন'});
  const item={id:id(),name:name||'Student',message,createdAt:new Date().toISOString()};
  db.comments.push(item); saveData(); res.json(item);
});
app.post('/api/admin/settings',auth,(req,res)=>{
  const b=req.body||{};
  const wasLive=!!db.settings?.live?.active;
  const nextLive={...defaultData.settings.live,...(db.settings?.live||{}),active:!!b.liveActive,title:String(b.liveTitle ?? (db.settings.live.title || '')),description:String(b.liveDescription ?? (db.settings.live.description || '')),youtubeUrl:String(b.liveYoutubeUrl ?? (db.settings.live.youtubeUrl || '')),schedule:String(b.liveSchedule ?? (db.settings.live.schedule || ''))};
  db.settings={...defaultData.settings,...db.settings,
    phone:String(b.phone ?? (db.settings.phone || '')),youtube:String(b.youtube ?? (db.settings.youtube || '')),facebook:String(b.facebook ?? (db.settings.facebook || '')),telegram:String(b.telegram ?? (db.settings.telegram || '')),
    live:nextLive};
  if(!wasLive && nextLive.active){
    db.notifications=db.notifications||[];
    db.notifications.push({id:id(),type:'live',title:'🔴 Live Class শুরু হয়েছে',message:nextLive.title||'SS Study Centre Live Class এখন চলছে।',url:'#live-class',createdAt:new Date().toISOString()});
  }
  saveData(); res.json(db.settings);
});
app.post('/api/admin/branding',auth,upload.fields([{name:'logo',maxCount:1},{name:'banner',maxCount:1},{name:'customImage',maxCount:1}]),(req,res)=>{
  const f=req.files||{}; const logo=f.logo?.[0], banner=f.banner?.[0], custom=f.customImage?.[0];
  if(logo && !logo.mimetype.startsWith('image/')) return res.status(400).json({error:'Logo must be an image'});
  if(banner && !banner.mimetype.startsWith('image/')) return res.status(400).json({error:'Banner must be an image'});
  if(custom && !custom.mimetype.startsWith('image/')) return res.status(400).json({error:'Custom image must be an image'});
  db.settings={...defaultData.settings,...db.settings};
  if(logo){ removeFile(db.settings.logo); db.settings.logo='/uploads/'+logo.filename; }
  if(banner){ removeFile(db.settings.banner); db.settings.banner='/uploads/'+banner.filename; }
  if(custom){ db.assets=db.assets||[]; db.assets.push({id:id(),type:'image',title:String(req.body.customTitle||custom.originalname),url:'/uploads/'+custom.filename,size:custom.size,mime:custom.mimetype,createdAt:new Date().toISOString()}); }
  saveData(); res.json(db.settings);
});
app.post('/api/admin/branding/remove',auth,(req,res)=>{
  const key=req.body?.key; if(key!=='logo' && key!=='banner') return res.status(400).json({error:'Invalid branding key'});
  db.settings={...defaultData.settings,...db.settings}; removeFile(db.settings[key]); db.settings[key]=''; saveData(); res.json(db.settings);
});
app.post('/api/admin/notification',auth,(req,res)=>{
  const title=String(req.body.title||'SS Study Centre Update').trim().slice(0,120);
  const message=String(req.body.message||'').trim().slice(0,500);
  if(!message)return res.status(400).json({error:'Notification message required'});
  const item={id:id(),type:'notice',title,message,url:String(req.body.url||'#').slice(0,300),createdAt:new Date().toISOString()};
  db.notifications=db.notifications||[]; db.notifications.push(item); saveData(); res.json(item);
});
app.delete('/api/admin/notifications/:id',auth,(req,res)=>{const i=(db.notifications||[]).findIndex(x=>x.id===req.params.id);if(i<0)return res.sendStatus(404);db.notifications.splice(i,1);saveData();res.json({ok:true});});
app.post('/api/admin/achiever',auth,upload.single('image'),(req,res)=>{
  if(!req.file || !req.file.mimetype.startsWith('image/')) return res.status(400).json({error:'Student photo required'});
  const item={id:id(),name:String(req.body.name||'Student'),detail:String(req.body.detail||''),year:String(req.body.year||''),url:'/uploads/'+req.file.filename,createdAt:new Date().toISOString()};
  db.achievers.push(item); saveData(); res.json(item);
});
app.delete('/api/admin/achievers/:id',auth,(req,res)=>{const i=db.achievers.findIndex(x=>x.id===req.params.id);if(i<0)return res.sendStatus(404);const [a]=db.achievers.splice(i,1);removeFile(a.url);saveData();res.json({ok:true});});
app.delete('/api/admin/comments/:id',auth,(req,res)=>{const i=db.comments.findIndex(x=>x.id===req.params.id);if(i<0)return res.sendStatus(404);db.comments.splice(i,1);saveData();res.json({ok:true});});

app.post('/api/admin/youtube',auth,(req,res)=>{
  const {title,chapter,desc,url,id:videoId}=req.body;
  const vid = videoId || extractYoutubeId(url||'');
  if(!title || !vid) return res.status(400).json({error:'Title and valid YouTube URL/ID required'});
  const item={id:id(), kind:'youtube', title:String(title), chapter:chapter||'physics', desc:String(desc||''), youtubeId:vid, createdAt:new Date().toISOString()};
  db.videos.push(item); saveData(); res.json(item);
});

app.post('/api/admin/video',auth,upload.single('video'),(req,res)=>{
  if(!req.file) return res.status(400).json({error:'Video file required'});
  if(!/^video\//.test(req.file.mimetype)) { fs.unlinkSync(req.file.path); return res.status(400).json({error:'Please upload a video file'}); }
  const item={id:id(), kind:'file', title:String(req.body.title||req.file.originalname), chapter:req.body.chapter||'physics', desc:String(req.body.desc||''), url:'/uploads/'+req.file.filename, originalName:req.file.originalname, size:req.file.size, mime:req.file.mimetype, createdAt:new Date().toISOString()};
  db.videos.push(item); saveData(); res.json(item);
});

app.post('/api/admin/affair',auth,upload.fields([{name:'image',maxCount:1},{name:'pdf',maxCount:1}]),(req,res)=>{
  const f=(req.files||{}); const image=f.image?.[0], pdf=f.pdf?.[0];
  const item={id:id(), date:req.body.date||new Date().toISOString().slice(0,10), title:String(req.body.title||'Daily Current Affairs'), text:String(req.body.text||''), image:image?'/uploads/'+image.filename:null, pdf:pdf?'/uploads/'+pdf.filename:null, createdAt:new Date().toISOString()};
  db.affairs.push(item); saveData(); res.json(item);
});
app.post('/api/admin/image',auth,upload.single('image'),(req,res)=>{
  if(!req.file || !req.file.mimetype.startsWith('image/')) return res.status(400).json({error:'Image file required'});
  const item={id:id(), type:'image', title:String(req.body.title||req.file.originalname), url:'/uploads/'+req.file.filename, size:req.file.size, mime:req.file.mimetype, createdAt:new Date().toISOString()}; db.assets.push(item); saveData(); res.json(item);
});
app.post('/api/admin/pdf',auth,upload.single('pdf'),(req,res)=>{
  if(!req.file || req.file.mimetype!=='application/pdf') return res.status(400).json({error:'PDF file required'});
  const item={id:id(), type:'pdf', title:String(req.body.title||req.file.originalname), url:'/uploads/'+req.file.filename, size:req.file.size, mime:req.file.mimetype, createdAt:new Date().toISOString()}; db.assets.push(item); saveData(); res.json(item);
});

function removeFile(url){ if(!url) return; const p=path.join(ROOT,url.replace(/^\//,'')); if(p.startsWith(UPLOADS+path.sep) && fs.existsSync(p)) fs.unlinkSync(p); }
app.delete('/api/admin/videos/:id',auth,(req,res)=>{ const i=db.videos.findIndex(x=>x.id===req.params.id); if(i<0)return res.sendStatus(404); const [v]=db.videos.splice(i,1); removeFile(v.url); saveData(); res.json({ok:true}); });
app.delete('/api/admin/affairs/:id',auth,(req,res)=>{ const i=db.affairs.findIndex(x=>x.id===req.params.id); if(i<0)return res.sendStatus(404); const [a]=db.affairs.splice(i,1); removeFile(a.image); removeFile(a.pdf); saveData(); res.json({ok:true}); });
app.delete('/api/admin/assets/:id',auth,(req,res)=>{ const i=db.assets.findIndex(x=>x.id===req.params.id); if(i<0)return res.sendStatus(404); const [a]=db.assets.splice(i,1); removeFile(a.url); saveData(); res.json({ok:true}); });

function extractYoutubeId(input){ input=String(input||'').trim(); if(/^[A-Za-z0-9_-]{11}$/.test(input)) return input; try { const u=new URL(input); if(u.hostname.includes('youtu.be')) return u.pathname.slice(1,12); const q=u.searchParams.get('v'); if(q) return q.slice(0,11); const p=u.pathname.split('/'); for(const k of ['embed','shorts','live']){const i=p.indexOf(k); if(i>=0&&p[i+1]) return p[i+1].slice(0,11);} } catch{} return null; }

app.get('/admin', (req,res)=>res.sendFile(path.join(PUBLIC,'admin.html')));
app.get(/.*/, (req,res)=>res.sendFile(path.join(PUBLIC,'index.html')));
app.listen(PORT,()=>console.log(`SS Study Centre running on http://localhost:${PORT}`));
