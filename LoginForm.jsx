import React, {useState} from 'react';

export default function Login({onToken}){
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');

  async function submit(e){
    e.preventDefault();
    const res = await fetch('http://localhost:4000/api/login', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if(data.token){ onToken(data.token); } else { alert(data.error || 'error'); }
  }

  return (
    <form onSubmit={submit}>
      <h3>Login</h3>
      <div><input placeholder="username" value={username} onChange={e=>setUsername(e.target.value)} required /></div>
      <div><input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
      <button type="submit">Login</button>
    </form>
  );
}
