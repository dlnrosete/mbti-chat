import React, {useState} from 'react';

export default function Register({onToken}){
  const [username,setUsername]=useState('');
  const [display,setDisplay]=useState('');
  const [password,setPassword]=useState('');
  const [avatar,setAvatar]=useState('cat');

  async function submit(e){
    e.preventDefault();
    const res = await fetch('http://localhost:4000/api/register', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username, display_name: display, password, avatar })
    });
    const data = await res.json();
    if(data.token){ onToken(data.token); } else { alert(data.error || 'error'); }
  }

  return (
    <form onSubmit={submit}>
      <h3>Register</h3>
      <div><input placeholder="unique username" value={username} onChange={e=>setUsername(e.target.value)} required /></div>
      <div><input placeholder="display name" value={display} onChange={e=>setDisplay(e.target.value)} /></div>
      <div><input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
      <div>
        <label>Avatar: </label>
        <select value={avatar} onChange={e=>setAvatar(e.target.value)}>
          <option>cat</option><option>dog</option><option>fox</option><option>panda</option><option>lion</option><option>bear</option><option>rabbit</option><option>owl</option>
        </select>
      </div>
      <button type="submit">Register</button>
    </form>
  );
}
