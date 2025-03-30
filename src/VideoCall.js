import React, { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from './socket';

const VideoCall = ({ 
  callerId, 
  receiverId, 
  receiverName, 
  onEndCall,
  isIncomingCall,
  callerSignal,
  onAcceptCall,
  currentUserId
}) => {
  const [callStatus, setCallStatus] = useState(isIncomingCall ? 'ringing' : 'calling');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pendingIceCandidates = useRef([]);
  const callTimerRef = useRef(null);

  // Error handling
  const handleError = useCallback((error) => {
    console.error('WebRTC Error:', error);
    setError(error.message || 'Call failed');
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    setTimeout(onEndCall, 3000);
  }, [onEndCall]);

  // Process queued ICE candidates
  const processPendingIceCandidates = useCallback((pc) => {
    while (pendingIceCandidates.current.length > 0) {
      const candidate = pendingIceCandidates.current.shift();
      pc.addIceCandidate(new RTCIceCandidate(candidate))
        .catch(err => console.warn('Error adding queued ICE candidate:', err));
    }
  }, []);

  // Start call timer
  const startCallTimer = useCallback(() => {
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  // Format call duration
  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  }, [localStream, isMuted]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  }, [localStream, isVideoOff]);

  // Initialize call (outgoing)
  const startCall = useCallback(async () => {
    try {
      console.log('Starting call...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      }).catch(err => {
        throw new Error('Could not access camera/microphone: ' + err.message);
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate');
          socket.emit('signal', { 
            userId: receiverId, 
            signal: { 
              candidate: event.candidate,
              type: 'candidate'
            } 
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          handleError(new Error('Connection failed'));
        }
      };

      pc.ontrack = (event) => {
        console.log('Received remote stream');
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        startCallTimer();
      };

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      }).catch(err => {
        throw new Error('Failed to create offer: ' + err.message);
      });
      
      await pc.setLocalDescription(offer).catch(err => {
        throw new Error('Failed to set local description: ' + err.message);
      });

      console.log('Sending offer to receiver');
      socket.emit('initiateCall', { 
        callerId, 
        receiverId, 
        signalData: offer 
      });

      setPeerConnection(pc);

      const handleCallAccepted = ({ signalData }) => {
        console.log('Call accepted with answer:', signalData);
        if (signalData.type === 'answer') {
          pc.setRemoteDescription(new RTCSessionDescription(signalData))
            .then(() => {
              setCallStatus('ongoing');
              processPendingIceCandidates(pc);
            })
            .catch(err => handleError(err));
        }
      };

      const handleSignal = (signal) => {
        console.log('Received signal:', signal);
        if (signal.candidate) {
          if (pc.remoteDescription) {
            pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
              .catch(err => console.warn('Error adding ICE candidate:', err));
          } else {
            console.log('Queuing ICE candidate - remote description not set yet');
            pendingIceCandidates.current.push(signal.candidate);
          }
        }
      };

      socket.on('callAccepted', handleCallAccepted);
      socket.on('signal', handleSignal);

      return () => {
        socket.off('callAccepted', handleCallAccepted);
        socket.off('signal', handleSignal);
      };

    } catch (err) {
      handleError(err);
    }
  }, [callerId, receiverId, handleError, processPendingIceCandidates, startCallTimer]);

  // Handle incoming call
  const handleIncomingCall = useCallback(async () => {
    try {
      console.log('Handling incoming call...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      }).catch(err => {
        throw new Error('Could not access camera/microphone: ' + err.message);
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate to caller');
          socket.emit('signal', { 
            userId: callerId, 
            signal: { 
              candidate: event.candidate,
              type: 'candidate'
            } 
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          handleError(new Error('Connection failed'));
        }
      };

      pc.ontrack = (event) => {
        console.log('Received remote stream from caller');
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        startCallTimer();
      };

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(callerSignal))
        .catch(err => {
          throw new Error('Failed to set remote description: ' + err.message);
        });

      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      }).catch(err => {
        throw new Error('Failed to create answer: ' + err.message);
      });
      
      await pc.setLocalDescription(answer).catch(err => {
        throw new Error('Failed to set local description: ' + err.message);
      });

      console.log('Sending answer to caller');
      socket.emit('acceptCall', { 
        callerId, 
        receiverId: currentUserId,
        signalData: answer 
      });

      setPeerConnection(pc);
      setCallStatus('ongoing');
      processPendingIceCandidates(pc);

      const handleSignal = (signal) => {
        console.log('Received signal from caller:', signal);
        if (signal.candidate) {
          if (pc.remoteDescription) {
            pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
              .catch(err => console.warn('Error adding ICE candidate:', err));
          } else {
            console.log('Queuing ICE candidate - remote description not set yet');
            pendingIceCandidates.current.push(signal.candidate);
          }
        }
      };

      socket.on('signal', handleSignal);

      return () => {
        socket.off('signal', handleSignal);
      };

    } catch (err) {
      handleError(err);
    }
  }, [callerId, callerSignal, currentUserId, handleError, processPendingIceCandidates, startCallTimer]);

  // Accept incoming call
  const acceptCall = useCallback(() => {
    console.log('Call accepted');
    onAcceptCall();
  }, [onAcceptCall]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    console.log('Call rejected');
    socket.emit('rejectCall', { callerId, receiverId: currentUserId });
    onEndCall();
  }, [callerId, currentUserId, onEndCall]);

  // End active call
  const endCall = useCallback(() => {
    console.log('Ending call');
    socket.emit('endCall', { callerId, receiverId });
    onEndCall();
  }, [callerId, receiverId, onEndCall]);

  // Main effect
  useEffect(() => {
    console.log('VideoCall useEffect running');
    pendingIceCandidates.current = [];
    setCallDuration(0);

    let cleanupFunctions = [];

    const setupCall = async () => {
      if (!isIncomingCall) {
        const cleanup = await startCall();
        if (cleanup) cleanupFunctions.push(cleanup);
      } else if (callerSignal) {
        const cleanup = await handleIncomingCall();
        if (cleanup) cleanupFunctions.push(cleanup);
      }
    };

    setupCall();

    return () => {
      console.log('Cleaning up VideoCall');
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      if (peerConnection) {
        peerConnection.close();
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      cleanupFunctions.forEach(cleanup => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      });
    };
  }, [isIncomingCall, callerSignal, startCall, handleIncomingCall, peerConnection, localStream]);

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg max-w-md text-center">
          <h3 className="text-xl font-bold text-red-600 mb-2">Call Error</h3>
          <p className="mb-4">{error}</p>
          <button
            onClick={onEndCall}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl flex flex-col h-full">
        {/* Remote Video */}
        <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden relative">
          {remoteStream ? (
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl text-white">
                    {receiverName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-2xl text-white font-semibold">
                  {isIncomingCall ? 'Incoming Call' : 'Calling'} {receiverName}
                </h3>
                <p className="text-gray-300 mt-2">
                  {callStatus === 'ringing' ? 'Ringing...' : ''}
                  {callStatus === 'ongoing' ? formatCallDuration(callDuration) : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Local Video */}
        {localStream && (
          <div className={`absolute bottom-24 right-4 ${isVideoOff ? 'bg-black' : 'bg-gray-800'} rounded-lg overflow-hidden border-2 border-white`}>
            {isVideoOff ? (
              <div className="w-32 h-48 flex items-center justify-center">
                <span className="text-white">Video Off</span>
              </div>
            ) : (
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-32 h-48 object-cover"
              />
            )}
          </div>
        )}

        {/* Call Controls */}
        <div className="flex justify-center space-x-8 py-6">
          {isIncomingCall && callStatus === 'ringing' ? (
            <>
              <button
                onClick={acceptCall}
                className="bg-green-500 text-white rounded-full p-4 hover:bg-green-600 transition-colors"
                title="Accept Call"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </button>
              <button
                onClick={rejectCall}
                className="bg-red-500 text-white rounded-full p-4 hover:bg-red-600 transition-colors"
                title="Reject Call"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path>
                  <line x1="23" y1="1" x2="1" y2="23"></line>
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className={`${isMuted ? 'bg-red-500' : 'bg-gray-600'} text-white rounded-full p-4 hover:bg-opacity-80 transition-colors`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isMuted ? (
                    <>
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                      <line x1="12" y1="19" x2="12" y2="23"></line>
                      <line x1="8" y1="23" x2="16" y2="23"></line>
                    </>
                  ) : (
                    <>
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                      <line x1="12" y1="19" x2="12" y2="23"></line>
                      <line x1="8" y1="23" x2="16" y2="23"></line>
                    </>
                  )}
                </svg>
              </button>
              <button
                onClick={toggleVideo}
                className={`${isVideoOff ? 'bg-red-500' : 'bg-gray-600'} text-white rounded-full p-4 hover:bg-opacity-80 transition-colors`}
                title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isVideoOff ? (
                    <>
                      <path d="M22 8a10 10 0 0 0-20 0"></path>
                      <path d="M4.93 10.93l1.41 1.41"></path>
                      <path d="M17.66 10.93l-1.41 1.41"></path>
                      <path d="M16 16h.01"></path>
                    </>
                  ) : (
                    <>
                      <path d="M23 7l-7 5 7 5V7z"></path>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </>
                  )}
                </svg>
              </button>
              <button
                onClick={endCall}
                className="bg-red-500 text-white rounded-full p-4 hover:bg-red-600 transition-colors"
                title="End Call"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path>
                  <line x1="23" y1="1" x2="1" y2="23"></line>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCall;