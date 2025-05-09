import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import './CallRoom.css';
import io from 'socket.io-client';

const socket = io('https://voice-call-backend-b4qo.onrender.com'); // Adjust to your backend URL if deployed

const CallRoom = () => {
  const { roomId } = useParams();
  const [timer, setTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalCallers, setTotalCallers] = useState(0);

  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  // Join room on mount
  useEffect(() => {
    socket.emit('join-room', roomId);
  }, [roomId]);

  // Handle room stats updates
  useEffect(() => {
    const handleRoomStats = ({ totalUsers, totalCallers }) => {
      setTotalUsers(totalUsers);
      setTotalCallers(totalCallers);
    };

    socket.on('room-stats', handleRoomStats);
    return () => {
      socket.off('room-stats', handleRoomStats);
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isCallActive]);

  // Detect speaking
  useEffect(() => {
    const detectSpeaking = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const context = new (window.AudioContext || window.webkitAudioContext)();
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        source.connect(analyser);
        audioContextRef.current = context;
        analyserRef.current = analyser;

        const analyze = () => {
          analyser.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((a, b) => a + b, 0);
          setIsSpeaking(sum > 500);
          requestAnimationFrame(analyze);
        };
        analyze();
      } catch (err) {
        console.error('Microphone access denied or error:', err);
      }
    };

    detectSpeaking();

    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      audioContextRef.current?.close();
    };
  }, []);

  const handleMute = () => {
    const audioTracks = streamRef.current?.getAudioTracks();
    if (audioTracks?.length) {
      const newMuted = !isMuted;
      audioTracks[0].enabled = !newMuted;
      setIsMuted(newMuted);
    }
  };

  const startCall = () => {
    setIsCallActive(true);
    socket.emit('start-call', { roomId, startTime: new Date().toISOString() });
  };

  const endCall = () => {
    setIsCallActive(false);
    socket.emit('end-call', { roomId, endTime: new Date().toISOString(), duration: timer });
  };

  return (
    <div className="call-room-container">
      <h2 className="call-room-title">Room ID: {roomId}</h2>

      <div className="call-room-stats">
        <p>Total Users in Room: {totalUsers}</p>
        <p>Total Users in Call: {totalCallers}</p>
      </div>

      {isCallActive ? (
        <>
          <p className="call-room-status">In Call</p>
          <p className="call-room-timer">
            {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
          </p>
          <button onClick={handleMute} className="call-room-button">
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
          <button onClick={endCall} className="call-room-end-button">
            End Call
          </button>
          <div className={`speaking-dot ${isSpeaking ? 'speaking' : ''}`} />
        </>
      ) : (
        <button onClick={startCall} className="call-room-button">Start Call</button>
      )}
    </div>
  );
};

export default CallRoom;
