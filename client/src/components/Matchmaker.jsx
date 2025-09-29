import React, {useState} from 'react';

export default function Matchmaker({token}){
  const [mbti,setMbti]=useState('INTJ');
  const [result,setResult]=useState(null);

  async function findOne(){
    const res = await fetch('http://localhost:4000/api/match/' + mbti, { headers: { Authorization: 'Bearer '+token }});
    const data = await res.json();
    if(data.user) setResult(data.user);
    else alert(data.error || 'no user');
  }

  return (
    <div>
      <h3>Matchmaker</h3>
      <input value={mbti} onChange={e=>setMbti(e.target.value)} />
      <button onClick={findOne}>Find</button>
      {result && (
        <div>
          <h4>Matched</h4>
          <div>{result.username} ({result.display_name}) - {result.avatar}</div>
        </div>
      )}
    </div>
  );
}
