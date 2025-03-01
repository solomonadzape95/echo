import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, ChevronLeft, X, Check, Edit } from 'lucide-react';
import video from '../assets/hero.mp4';
import { Button } from '@/components/ui/button';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isSpeaking?: boolean;
  isMuted?: boolean;
  isVideoOn?: boolean;
}

interface ChatMessage {
  sender: string;
  message: string;
  time: string;
  isCurrentUser: boolean;
}

interface Task {
  title: string;
  completed: boolean;
}

const VideoConference: React.FC = () => {
  // State for managing participants
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: 'You', isSpeaking: true, isMuted: false, isVideoOn: true },
    { id: '2', name: 'Alicia Paddock', isMuted: false, isVideoOn: true },
    { id: '3', name: 'Sri Veronica', isMuted: true, isVideoOn: true },
    { id: '4', name: 'Corbyn Stefan', isMuted: false, isVideoOn: true },
  ]);

  // State for managing waiting participants
  const [waitingParticipants, setWaitingParticipants] = useState<{ name: string }[]>([
    { name: 'Drew Bieber' }
  ]);

  // State for active tabs
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');

  // State for chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'Alicia Paddock', message: 'How about our problem last week?', time: '2:02 PM', isCurrentUser: false },
    { sender: 'You', message: "It's all clear, no worries 😊", time: '2:03 PM', isCurrentUser: true },
    { sender: 'Sri Veronica', message: "Yes, it's been solved. Since we have daily meeting to discuss everything 😃", time: '2:10 PM', isCurrentUser: false },
  ]);

  // State for tasks
  const [tasks, setTasks] = useState<Task[]>([
    { title: 'Team Discussion', completed: true },
    { title: 'Daily Work Review at 1:00 PM', completed: false },
    { title: 'Weekly Report', completed: false },
    { title: 'Stand Up Meeting', completed: false },
  ]);

  // State for user media controls
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isRecording, setIsRecording] = useState(true);

  // New message input
  const [newMessage, setNewMessage] = useState('');

  // Video ref for main video and participant videos
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const participantVideoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  // Effect to handle video loading
  useEffect(() => {
    // Load main video
    if (mainVideoRef.current) {
      mainVideoRef.current.src = video;
      mainVideoRef.current.load();
    }

    // Load participant videos
    participantVideoRefs.current.forEach(videoRef => {
      if (videoRef) {
        videoRef.src = video;
        videoRef.load();
      }
    });
  }, []);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages([
        ...messages,
        {
          sender: 'You',
          message: newMessage,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isCurrentUser: true
        }
      ]);
      setNewMessage('');
    }
  };

  const toggleMic = () => setIsMicOn(!isMicOn);
  const toggleVideo = () => setIsVideoOn(!isVideoOn);
  const toggleRecording = () => setIsRecording(!isRecording);

  const admitParticipant = (name: string) => {
    setWaitingParticipants(waitingParticipants.filter(p => p.name !== name));
    setParticipants([
      ...participants,
      { id: `${participants.length + 1}`, name, isMuted: false, isVideoOn: true }
    ]);
  };

  const rejectParticipant = (name: string) => {
    setWaitingParticipants(waitingParticipants.filter(p => p.name !== name));
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 w-full">
      <div className="bg-white shadow-lg w-full h-screen overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-4">
            <Button
              className="bg-gray-600 hover:bg-gray-500 rounded-[50%] p-1 w-12 h-12 cursor-pointer"
            >
              <ChevronLeft className="size-7 " />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Project Reporting - Week 1</h1>
              <p className="text-sm text-gray-500">George's Meeting Room</p>
            </div>
          </div>
          {waitingParticipants.length > 0 && (
            <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-full">
              <span className="text-md"><b className='text-xl'>{waitingParticipants[0].name}</b> wants to join the meeting</span>
              <Button

                className="bg-red-500 hover:bg-red-400 rounded-[50%] p-1 w-10 h-10 cursor-pointer"
                onClick={() => rejectParticipant(waitingParticipants[0].name)}
              >
                <X className="size-6 text-white" />
              </Button>
              <Button
                className="bg-gray-600 hover:bg-gray-500 rounded-[50%] p-1 w-10 h-10 cursor-pointer"
                onClick={() => admitParticipant(waitingParticipants[0].name)}
              >
                <Check className="size-6 text-white" />
              </Button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex flex-col md:flex-row flex-grow">
          {/* Video Area */}
          <div className="flex-1 relative flex flex-col">
            <div className="relative flex-grow overflow-hidden">
              {/* Main Video */}
              <div className="absolute inset-0">
                <video
                  ref={mainVideoRef}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <source src={video} type="video/mp4" />
                  Your browser does not support the video tag
                </video>
                <div className="absolute top-4 left-4 flex items-center space-x-2 py-3 px-4 bg-gray-50/35 backdrop-blur-2xl rounded-full">
                  <div className=" text-white  flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gray-700 flex items-center justify-center rounded-full text-md">G</div>
                    <span>You</span>
                  </div>
                </div>


              </div>

              {/* Controls */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-3 bg-gray-50/45 p-3 rounded-full backdrop-blur-2xl">
                <Button className={`${isMicOn ? 'bg-gray-700' : 'bg-red-500'} w-12 h-12 rounded-full flex items-center justify-center text-white cursor-pointer`} onClick={toggleMic}>
                  {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                </Button>
                <Button className={`${isVideoOn ? 'bg-gray-700' : 'bg-red-500'} w-12 h-12 rounded-full flex items-center justify-center text-white cursor-pointer`} onClick={toggleVideo}>
                  {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </Button>
                <Button className="bg-red-500 w-12 h-12 rounded-full flex items-center justify-center text-white">
                  <PhoneOff className="w-6 h-6" />
                </Button>
              </div>
            </div>

            {/* Participants Video Grid */}
            <div className="flex overflow-x-auto py-2 space-x-2 bg-gray-800 h-1/6">
              {participants.slice(1).map((participant, _) => (
                <div key={participant.id} className="relative flex-shrink-0 w-48 h-full rounded-lg overflow-hidden">
                  <video
                    // ref={el => participantVideoRefs.current[index] = el}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  >
                    <source src={video} type="video/mp4" />
                    Your browser does not support the video tag
                  </video>
                  <div className="absolute bottom-2 mx-auto text-sm bg-gray-900/45 text-gray-50 backdrop-blur-2xl bg-opacity-50 px-2 py-1 left-[25%] rounded-full">
                    {participant.name}
                  </div>
                  {participant.isMuted && (
                    <div className="absolute top-1 right-1 bg-red-500 rounded-full p-0.5">
                      <MicOff className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              <div className="flex-shrink-0 w-10 flex items-center justify-center">
                <Button className="text-white rounded-full h-full w-12 cursor-pointer">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full md:w-80 border-l flex flex-col">

            {/* Tabs */}
            <div className="flex border-t border-b">
              <button
                className={`flex-1 py-3 text-center ${activeTab === 'chat' ? 'bg-black text-white' : 'bg-white text-black'}`}
                onClick={() => setActiveTab('chat')}
              >
                Room Chat
              </button>
              <button
                className={`flex-1 py-3 text-center ${activeTab === 'participants' ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}
                onClick={() => setActiveTab('participants')}
              >
                Participant
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs rounded-lg p-3 shadow-md ${msg.isCurrentUser ? 'bg-cyan-100' : 'bg-gray-300 '}`}>
                    {!msg.isCurrentUser && (
                      <div className="flex items-center mb-1">
                        <span className="font-medium text-sm">{msg.sender}</span>
                        <span className="ml-2 text-xs text-gray-500">{msg.time}</span>
                      </div>
                    )}
                    <p className={`text-sm ${msg.isCurrentUser ? '' : ''}`}>{msg.message}</p>
                    {msg.isCurrentUser && (
                      <div className="flex justify-end">
                        <span className="text-xs text-gray-500">{msg.time}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t flex items-center ">
              <input
                type="text"
                placeholder="Type message here..."
                className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 0"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <div className="flex ml-2 space-x-2">
                <button className="p-2">
                  <span role="img" aria-label="emoji">😊</span>
                </button>
                <button
                  className="bg-black text-white p-2 rounded-full"
                  onClick={handleSendMessage}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoConference;