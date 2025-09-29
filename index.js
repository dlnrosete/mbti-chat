import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { get, all, run } from './db.js';

const SECRET = process.env.JWT_SECRET || 'replace_with_a_real_secret';
const PORT = process.env.PORT || 4000;
const ALLOWED_AVATARS = ['cat','dog','fox','panda','lion','bear','rabbit','owl'];

const app = express();
app.use(cors());
app.use(bodyParser.json());

// helper middleware to extract ip (works behind proxies if you set trust proxy)
app.set('trust proxy', true);
function authMiddleware(req,res,next){
  const header = req.headers.authorization;
  if(!header) return res.status(401).json({error:'missing token'});
  const token = header.split(' ')[1];
  try{
    const payload = jwt.verify(token, SECRET);
    req.user = payload; next();
  }catch(e){
    return res.status(401).json({error:'invalid token'});
  }
}

// Register
app.post('/api/register', async (req,res)=>{
  try{
    const { username, display_name, password, mbti, email, avatar } = req.body;
    if(!username || !password) return res.status(400).json({error:'missing username or password'});
    if(avatar && !ALLOWED_AVATARS.includes(avatar)) return res.status(400).json({error:'invalid avatar'});

    const existing = await get('SELECT * FROM users WHERE username = ?', [username]);
    if(existing){
      if(existing.deleted){
        return res.status(400).json({error:'username permanently reserved'});
      } else {
        // delete existing active account per spec before creating new
        await run('DELETE FROM friends WHERE user_a = ? OR user_b = ?', [existing.id, existing.id]);
        await run('DELETE FROM friend_requests WHERE from_user = ? OR to_user = ?', [existing.id, existing.id]);
        await run('DELETE FROM reports WHERE reporter = ? OR reported = ?', [existing.id, existing.id]);
        await run('DELETE FROM chats WHERE user_a = ? OR user_b = ?', [existing.id, existing.id]);
        await run('DELETE FROM users WHERE id = ?', [existing.id]);
      }
    }

    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const now = Date.now();
    await run('INSERT INTO users (id,username,display_name,password_hash,mbti,avatar,email,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [id,username, display_name||username, hashed, mbti||null, avatar||'cat', email||null, now]);
    const token = jwt.sign({id,username}, SECRET, {expiresIn:'7d'});
    res.json({token});
  }catch(e){
    console.error(e);
    res.status(500).json({error:'server error'});
  }
});

// Login
app.post('/api/login', async (req,res)=>{
  try{
    const { username, password } = req.body;
    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    if(!user || user.deleted) return res.status(400).json({error:'invalid credentials'});
    const ok = await bcrypt.compare(password, user.password_hash);
    if(!ok) return res.status(400).json({error:'invalid credentials'});
    if(user.banned_until && Date.now() < user.banned_until) return res.status(403).json({error:'banned', banned_until:user.banned_until});
    const token = jwt.sign({id:user.id,username:user.username}, SECRET, {expiresIn:'7d'});
    res.json({token});
  }catch(e){
    console.error(e);
    res.status(500).json({error:'server error'});
  }
});

// Get my profile
app.get('/api/me', authMiddleware, async (req,res)=>{
  const u = await get('SELECT id,username,display_name,email,mbti,avatar,deleted,banned_until,ban_count,friends_count FROM users WHERE id = ?', [req.user.id]);
  if(!u) return res.status(404).json({error:'not found'});
  res.json(u);
});

// Update MBTI (from quiz)
app.post('/api/quiz', authMiddleware, async (req,res)=>{
  const { mbti } = req.body;
  await run('UPDATE users SET mbti = ? WHERE id = ?', [mbti, req.user.id]);
  res.json({ok:true});
});

// Matchmaking - random user with target MBTI
app.get('/api/match/:mbti', authMiddleware, async (req,res)=>{
  const target = (req.params.mbti || '').toUpperCase();
  const rows = await all('SELECT id,username,display_name,mbti,avatar FROM users WHERE mbti = ? AND id != ? AND deleted = 0 AND (banned_until IS NULL OR banned_until < ?)', [target, req.user.id, Date.now()]);
  if(!rows.length) return res.status(404).json({error:'no users found'});
  const pick = rows[Math.floor(Math.random()*rows.length)];
  res.json({user:pick});
});

// Search by unique username
app.get('/api/users/:username', authMiddleware, async (req,res)=>{
  const uname = req.params.username;
  const u = await get('SELECT id,username,display_name,mbti,avatar,friends_count FROM users WHERE username = ? AND deleted = 0', [uname]);
  if(!u) return res.status(404).json({error:'not found'});
  res.json(u);
});

// Send friend request
app.post('/api/friend-request/:toId', authMiddleware, async (req,res)=>{
  const toId = req.params.toId;
  if(toId === req.user.id) return res.status(400).json({error:'cannot friend yourself'});
  // prevent duplicates
  const existing = await get('SELECT * FROM friend_requests WHERE from_user = ? AND to_user = ?', [req.user.id, toId]);
  if(existing) return res.status(400).json({error:'request already sent'});
  const id = uuidv4();
  await run('INSERT INTO friend_requests (id,from_user,to_user,status,created_at) VALUES (?,?,?,?,?)', [id, req.user.id, toId, 'pending', Date.now()]);
  res.json({ok:true});
});

// List incoming friend requests
app.get('/api/friend-requests', authMiddleware, async (req,res)=>{
  const rows = await all('SELECT fr.id, fr.from_user, u.username as from_username, u.display_name, u.avatar FROM friend_requests fr JOIN users u ON u.id = fr.from_user WHERE fr.to_user = ? AND fr.status = ?', [req.user.id, 'pending']);
  res.json(rows);
});

// Respond to friend request
app.post('/api/friend-requests/:id/respond', authMiddleware, async (req,res)=>{
  const id = req.params.id;
  const { action } = req.body;
  const r = await get('SELECT * FROM friend_requests WHERE id = ?', [id]);
  if(!r) return res.status(404).json({error:'not found'});
  if(r.to_user !== req.user.id) return res.status(403).json({error:'not allowed'});
  if(action === 'accept'){
    const fid = uuidv4();
    await run('INSERT INTO friends (id,user_a,user_b,created_at) VALUES (?,?,?,?)', [fid, r.from_user, r.to_user, Date.now()]);
    await run('UPDATE friend_requests SET status = ? WHERE id = ?', ['accepted', id]);
    // update friend counts
    await run('UPDATE users SET friends_count = (SELECT COUNT(*) FROM friends WHERE user_a = ? OR user_b = ?) WHERE id = ?', [r.to_user, r.to_user, r.to_user]);
    await run('UPDATE users SET friends_count = (SELECT COUNT(*) FROM friends WHERE user_a = ? OR user_b = ?) WHERE id = ?', [r.from_user, r.from_user, r.from_user]);
    res.json({ok:true});
  } else {
    await run('UPDATE friend_requests SET status = ? WHERE id = ?', ['rejected', id]);
    res.json({ok:true});
  }
});

// Unfriend
app.post('/api/unfriend/:otherId', authMiddleware, async (req,res)=>{
  const other = req.params.otherId;
  await run('DELETE FROM friends WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)', [req.user.id, other, other, req.user.id]);
  await run('UPDATE users SET friends_count = (SELECT COUNT(*) FROM friends WHERE user_a = ? OR user_b = ?) WHERE id = ?', [req.user.id, req.user.id, req.user.id]);
  await run('UPDATE users SET friends_count = (SELECT COUNT(*) FROM friends WHERE user_a = ? OR user_b = ?) WHERE id = ?', [other, other, other]);
  res.json({ok:true});
});

// Report endpoint
app.post('/api/report', authMiddleware, async (req,res)=>{
  try {
    const { reported_username } = req.body;
    const reporter = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!reporter || reporter.deleted) return res.status(400).json({error:'invalid account'});

    const reported = await get('SELECT * FROM users WHERE username = ? AND deleted = 0', [reported_username]);
    if (!reported) return res.status(404).json({error:'user not found'});
    if (reporter.id === reported.id) return res.status(400).json({error:'cannot report yourself'});

    // If reporter is flagged as VPN (simple local flag), disallow
    if (reporter.is_vpn) return res.status(403).json({error:'VPN users cannot report'});

    const ip = req.ip;

    // If this IP already reported the target, reject
    const existingIpReport = await get('SELECT 1 FROM reports WHERE reported = ? AND reporter_ip = ?', [reported.id, ip]);
    if (existingIpReport) {
      return res.status(400).json({error:'this IP already reported this account'});
    }

    // Prevent duplicate report from same reporter
    const existingReport = await get('SELECT 1 FROM reports WHERE reporter = ? AND reported = ?', [reporter.id, reported.id]);
    if (existingReport) return res.status(400).json({error:'you already reported this user'});

    await run('INSERT INTO reports (id, reporter, reported, reporter_ip, created_at) VALUES (?,?,?,?,?)',
      [uuidv4(), reporter.id, reported.id, ip, Date.now()]);

    const rows = await all('SELECT COUNT(DISTINCT reporter_ip) as cnt FROM reports WHERE reported = ?', [reported.id]);
    const count = rows[0].cnt;

    if (count >= 3) {
      const now = Date.now();
      const until = now + 10 * 60 * 60 * 1000; // 10 hours
      const ban_count = (reported.ban_count || 0) + 1;

      if (ban_count >= 3) {
        // force delete
        await run('DELETE FROM friends WHERE user_a = ? OR user_b = ?', [reported.id, reported.id]);
        await run('DELETE FROM friend_requests WHERE from_user = ? OR to_user = ?', [reported.id, reported.id]);
        await run('DELETE FROM reports WHERE reporter = ? OR reported = ?', [reported.id, reported.id]);
        await run('DELETE FROM chats WHERE user_a = ? OR user_b = ?', [reported.id, reported.id]);
        await run('UPDATE users SET deleted = 1, display_name = "[deleted]", email = NULL, mbti = NULL, avatar = NULL, friends_count = 0, ban_count = ?, banned_until = 0 WHERE id = ?', [ban_count, reported.id]);
      } else {
        await run('UPDATE users SET banned_until = ?, ban_count = ? WHERE id = ?', [until, ban_count, reported.id]);
      }
    }

    res.json({ok:true});
  } catch(e) {
    console.error(e);
    res.status(500).json({error:'server error'});
  }
});

// Delete my account - marks deleted and clears links
app.post('/api/delete', authMiddleware, async (req,res)=>{
  try{
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if(!user) return res.status(404).json({error:'not found'});
    await run('DELETE FROM friends WHERE user_a = ? OR user_b = ?', [user.id, user.id]);
    await run('DELETE FROM friend_requests WHERE from_user = ? OR to_user = ?', [user.id, user.id]);
    await run('DELETE FROM reports WHERE reporter = ? OR reported = ?', [user.id, user.id]);
    await run('DELETE FROM chats WHERE user_a = ? OR user_b = ?', [user.id, user.id]);
    await run('UPDATE users SET deleted = 1, display_name = "[deleted]", email = NULL, mbti = NULL, avatar = NULL, friends_count = 0, banned_until = 0 WHERE id = ?', [user.id]);
    res.json({ok:true});
  }catch(e){
    console.error(e);
    res.status(500).json({error:'server error'});
  }
});

app.listen(PORT, ()=>{ console.log('Server running on', PORT); });
