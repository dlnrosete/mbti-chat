import React, {useState} from 'react';

export default function SearchUser({token}){
  const [q,setQ]=useState('');
  const [resu,setResu]=useState(null);
  const [reportName,setReportName]=useState('');

  async function search(){
    const r = await fetch('http://localhost:4000/api/users/' + q, { headers: { Authorization: 'Bearer '+token }});
    const d = await r.json();
    if(d.username) setResu(d); else alert(d.error || 'not found');
  }

  async function report(){
    const r = await fetch('http://localhost:4000/api/report', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization: 'Bearer '+token },
      body: JSON.stringify({ reported_username: q })
    });
    const d = await r.json();
    if(d.ok) alert('reported'); else alert(d.error || 'error');
  }

  return (
    <div>
      <h3>Search by username</h3>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="unique username" />
      <button onClick={search}>Search</button>
      {resu && (
        <div>
          <div>{resu.username} ({resu.display_name}) - {resu.avatar}</div>
        </div>
      )}
      <div style={{marginTop:10}}>
        <button onClick={report}>Report this user</button>
      </div>
    </div>
  );
}
