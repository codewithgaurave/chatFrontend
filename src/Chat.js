import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { socket, connectSocket, disconnectSocket } from "./socket";

// SVG Icons
const VideoCallIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

const SendIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const HistoryIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3v5h5"></path>
    <path d="M3.6 15c2.4 4.4 7.4 6.7 12.1 5C20.4 17.8 22.7 12.8 21 8"></path>
    <path d="M12 7v5l3 3"></path>
  </svg>
);

const MenuIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const ChatComponent = ({ user, selectedUser: initialSelectedUser }) => {
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(initialSelectedUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [lastMessages, setLastMessages] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [fullChatHistory, setFullChatHistory] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [deletedChats, setDeletedChats] = useState([]);
  const messagesEndRef = useRef(null);

  // Fetch users and setup socket
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/chat/users");
        const filteredUsers = res.data.filter((u) => u._id !== user._id);
        setUsers(filteredUsers);
        setLoading(false);

        // Fetch last messages for each user
        const lastMessagesTemp = {};
        for (let u of filteredUsers) {
          try {
            const lastMessageRes = await axios.get(
              `http://localhost:5000/api/chat/last-message/${u._id}`,
              { params: { currentUserId: user._id } }
            );
            lastMessagesTemp[u._id] = lastMessageRes.data;
          } catch (err) {
            console.error(
              `Error fetching last message for user ${u._id}:`,
              err
            );
          }
        }
        setLastMessages(lastMessagesTemp);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load users");
        setLoading(false);
      }
    };

    fetchUsers();
    connectSocket(user._id);

    const handleMessage = (message) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m._id === message._id);
        return exists ? prev : [...prev, message];
      });

      setLastMessages((prev) => ({
        ...prev,
        [message.sender]: message,
      }));
    };

    socket.on("receiveMessage", handleMessage);

    return () => {
      socket.off("receiveMessage", handleMessage);
      disconnectSocket();
    };
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, fullChatHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async (userId) => {
    try {
      if (deletedChats.includes(userId)) {
        setMessages([]);
        setShowHistory(false);
        return;
      }

      const res = await axios.get(
        `http://localhost:5000/api/chat/messages/${userId}`,
        { params: { currentUserId: user._id } }
      );
      setMessages(res.data);
      setShowHistory(false);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Failed to load messages");
    }
  };

  const handleUserSelect = async (selectedUser) => {
    setSelectedUser(selectedUser);
    setShowSidebar(false);
    await fetchMessages(selectedUser._id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const newMessageData = {
        sender: user._id,
        receiver: selectedUser._id,
        message: newMessage.trim(),
      };

      await axios.post("http://localhost:5000/api/chat/send", newMessageData);

      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
    }
  };

  const handleVideoCall = () => {
    if (selectedUser) {
      alert(`Initiating video call with ${selectedUser.name}`);
    }
  };

  const handleSoftDeleteChat = async () => {
    if (!selectedUser) return;

    try {
      await axios.post("http://localhost:5000/api/chat/soft-delete", {
        userId: selectedUser._id,
        currentUserId: user._id,
      });

      setMessages([]);
      setDeletedChats((prev) => [...prev, selectedUser._id]);

      setLastMessages((prev) => {
        const newLastMessages = { ...prev };
        delete newLastMessages[selectedUser._id];
        return newLastMessages;
      });

      alert(`Chat history with ${selectedUser.name} has been cleared`);
    } catch (err) {
      console.error("Error soft deleting chat:", err);
      setError("Failed to clear chat history");
    }
  };

  const handleLeaveChat = async () => {
    if (!selectedUser) return;

    try {
      await axios.post("http://localhost:5000/api/chat/auto-soft-delete", {
        userId: selectedUser._id,
        currentUserId: user._id,
      });

      setMessages([]);
      setSelectedUser(null);
      setShowHistory(false);
      setDeletedChats((prev) => [...prev, selectedUser._id]);
    } catch (err) {
      console.error("Error leaving chat:", err);
      setError("Failed to leave chat");
    }
  };

  const fetchChatHistory = async () => {
    if (!selectedUser) return;

    try {
      const res = await axios.get(
        `http://localhost:5000/api/chat/message-history/${selectedUser._id}`,
        { params: { currentUserId: user._id } }
      );

      setFullChatHistory(res.data);
      setShowHistory(true);
    } catch (err) {
      console.error("Error fetching chat history:", err);
      setError("Failed to load chat history");
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderChatHeader = () => (
    <div className="bg-[#f0f2f5] p-4 flex justify-between items-center border-b">
      <div className="flex items-center">
        <button
          onClick={() => setShowSidebar(true)}
          className="mr-2 md:hidden text-gray-600"
        >
          <MenuIcon />
        </button>
        <div className="flex items-center space-x-4">
          {/* Current User (You) */}
          <div className="flex flex-col items-center">
            <img
              src={
                user.avatar ||
                `https://api.dicebear.com/8.x/avataaars/svg?seed=${user._id}`
              }
              alt={user.name}
              className="w-10 h-10 rounded-full border-2 border-green-500"
            />
            <span className="text-xs mt-1 font-medium">You</span>
          </div>

          {/* Chat Partner */}
          {selectedUser && (
            <div className="flex flex-col items-center">
              <img
                src={
                  selectedUser.avatar ||
                  `https://api.dicebear.com/8.x/avataaars/svg?seed=${selectedUser._id}`
                }
                alt={selectedUser.name}
                className="w-10 h-10 rounded-full"
              />
              <span className="text-xs mt-1 font-medium">
                {selectedUser.name}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {selectedUser && (
          <>
            <button
              onClick={fetchChatHistory}
              className="text-gray-600 hover:text-blue-600 transition-colors"
              title="Chat History"
            >
              <HistoryIcon />
            </button>
            <button
              onClick={handleVideoCall}
              className="text-gray-600 hover:text-green-600 transition-colors"
              title="Video Call"
            >
              <VideoCallIcon />
            </button>
            <button
              onClick={handleSoftDeleteChat}
              className="text-gray-600 hover:text-red-600 transition-colors"
              title="Clear Chat"
            >
              <TrashIcon />
            </button>
            <button
              onClick={handleLeaveChat}
              className="text-gray-600 hover:text-red-600 transition-colors"
              title="Leave Chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 3H6a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h4M16 17l5-5-5-5M19.8 12H9"></path>
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );

  const renderMessagesOrHistory = () => {
    const displayMessages = showHistory ? fullChatHistory : messages;

    return (
      <div
        className="flex-1 bg-[#eae6df] overflow-y-auto p-4 space-y-2"
        style={{ maxHeight: "calc(85vh - 200px)" }}
      >
        {" "}
        {/* Adjust based on your layout */}
        {showHistory && (
          <div className="text-center text-gray-500 mb-4 sticky top-0 bg-[#eae6df] z-10 py-2">
            Full Chat History
            <button
              onClick={() => setShowHistory(false)}
              className="ml-2 text-blue-500 hover:underline"
            >
              Back to Current Chat
            </button>
          </div>
        )}
        <div className="min-h-full flex flex-col justify-end">
          {displayMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              {showHistory
                ? "No history available"
                : "No messages yet. Start a new conversation!"}
            </div>
          ) : (
            <>
              {displayMessages.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex ${
                    msg.sender === user._id ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`
        max-w-xs md:max-w-md p-3 rounded-lg mb-2
        ${
          msg.sender === user._id
            ? "bg-green-100 rounded-tr-none"
            : "bg-white rounded-tl-none"
        }
        ${showHistory ? "opacity-70" : ""}
      `}
                    style={{
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <div className="flex items-center justify-end space-x-1 mt-1">
                      <span className="text-xs text-gray-500">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                      {!showHistory && msg.sender === user._id && (
                        <CheckIcon className="text-gray-500 w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] p-4">
      <img
        src={
          user.avatar ||
          `https://api.dicebear.com/8.x/avataaars/svg?seed=${user._id}`
        }
        alt={user.name}
        className="w-20 h-20 rounded-full mb-4 border-2 border-green-500"
      />
      <h3 className="text-xl font-semibold mb-2">Welcome, {user.name}</h3>
      <p className="text-gray-500 mb-6">Select a chat to start messaging</p>
      {window.innerWidth < 768 && (
        <button
          onClick={() => setShowSidebar(true)}
          className="bg-[#00a884] text-white px-4 py-2 rounded-lg"
        >
          Select a chat
        </button>
      )}
    </div>
  );

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        {error}
      </div>
    );

  return (
    <div className="flex bg-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          showSidebar ? "block" : "hidden"
        } md:block w-full md:w-1/3 lg:w-1/4 bg-white border-r border-gray-200 absolute md:relative z-10 h-[83vh]`}
      >
        <div className="p-4 bg-[#00a884] text-white flex justify-between items-center">
          <h2 className="text-xl font-semibold">Chats</h2>
          <button
            onClick={() => setShowSidebar(false)}
            className="md:hidden text-white"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4">
          <input
            type="text"
            placeholder="Search chats"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* User List */}
        <div className="divide-y divide-gray-200 overflow-y-auto h-[calc(100%-120px)]">
          {filteredUsers.map((u) => (
            <div
              key={u._id}
              onClick={() => handleUserSelect(u)}
              className={`flex p-4 hover:bg-gray-100 cursor-pointer ${
                selectedUser?._id === u._id ? "bg-gray-200" : ""
              }`}
            >
              <img
                src={
                  u.avatar ||
                  `https://api.dicebear.com/8.x/avataaars/svg?seed=${u._id}`
                }
                alt={u.name}
                className="w-12 h-12 rounded-full mr-4"
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <span className="font-semibold truncate">{u.name}</span>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                    {lastMessages[u._id]
                      ? new Date(
                          lastMessages[u._id].createdAt
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm truncate">
                    {lastMessages[u._id]?.message || "No messages"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={`${
          !showSidebar ? "block" : "hidden"
        } md:block flex-1 flex flex-col h-[73vh] bg-white`}
      >
        {selectedUser ? (
          <>
            {renderChatHeader()}
            {renderMessagesOrHistory()}
            {!showHistory && selectedUser && (
              <div className="bg-[#f0f2f5] p-4 flex items-center space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a message"
                  className="flex-1 p-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-[#00a884] text-white p-2 rounded-full"
                  disabled={!newMessage.trim()}
                >
                  <SendIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          renderEmptyState()
        )}
      </div>
    </div>
  );
};

export default ChatComponent;
