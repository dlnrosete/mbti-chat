import React from 'react';

export default function Profile({me}){
  if(!me) return <div>Loading profile...</div>;
  return (
    <div>
      <h3>Your Profile</h3>
      <div><strong>Username:</strong> {me.username}</div>
      <div><strong>Display name:</strong> {me.display_name}</div>
      <div><strong>MBTI:</strong> {me.mbti || 'not set'}</div>
      <div><strong>Avatar:</strong> {me.avatar}</div>
    </div>
  );
}
