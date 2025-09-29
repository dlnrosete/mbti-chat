import React, {useState, useEffect} from 'react';
import Register from './components/RegisterForm';
import Login from './components/LoginForm';
import Profile from './components/Profile';
import Matchmaker from './components/Matchmaker';
import SearchUser from './components/SearchUser';

function App(){
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [me, setMe] = useState(null);

  useEffect(()=>{
    if(token){
      fetch('http://localhost:4000/api/me', { headers: { 'Authorization': 'Bearer '+token }})
        .then(r=>r.json()).then(d=>{ if(d.error){ setToken(''); localStorage.removeItem('token'); } else setMe(d); })
        .catch(()=>{});
    }
  }, [token]);

  return (
    <div style={{padding:20, fontFamily:'Arial'}}>
      <h1>MBTI Chat App</h1>
      {!token ? (
        <>
          <Register onToken={(t)=>{ setToken(t); localStorage.setItem('token', t); }} />
          <hr />
          <Login onToken={(t)=>{ setToken(t); localStorage.setItem('token', t); }} />
        </>
      ) : (
        <>
          <div>
            <button onClick={()=>{ setToken(''); localStorage.removeItem('token'); setMe(null); }}>Logout</button>
          </div>
          <Profile me={me} />
          <hr />
          <Matchmaker token={token} />
          <hr />
          <SearchUser token={token} />
        </>
      )}
    </div>
  );
}

export default App;
