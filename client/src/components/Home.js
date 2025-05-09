import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleJoin = () => {
    if (roomId.trim()) {
      navigate(`/room/${roomId}`);
    }
  };

  const handleCreate = () => {
    const newRoomId = Math.random().toString(36).substring(2, 10);
    navigate(`/room/${newRoomId}`);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Voice Call App</h2>
      <input
        type="text"
        placeholder="Enter Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        style={styles.input}
      />
      <div>
        <button onClick={handleJoin} style={styles.button}>Join Room</button>
        <button onClick={handleCreate} style={{ ...styles.button, backgroundColor: '#28a745' }}>Create Room</button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    textAlign: 'center',
    marginTop: '100px',
  },
  title: {
    fontSize: '32px',
    marginBottom: '20px',
  },
  input: {
    padding: '10px',
    width: '250px',
    fontSize: '16px',
    marginBottom: '10px',
    borderRadius: '5px',
    border: '1px solid #ccc',
  },
  button: {
    padding: '10px 20px',
    margin: '10px',
    fontSize: '16px',
    borderRadius: '5px',
    border: 'none',
    backgroundColor: '#007bff',
    color: '#fff',
    cursor: 'pointer',
  },
};

export default Home;
