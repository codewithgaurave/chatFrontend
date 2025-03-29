import React from "react";
import "./Chat.css";

const MessageList = ({ messages, currentUser, selectedUser }) => {
    return (
        <div className="message-list">
            {messages.length === 0 ? (
                <div className="no-messages">
                    No messages yet. Start the conversation!
                </div>
            ) : (
                messages.map((message, index) => (
                    <div
                        key={index}
                        className={`message ${
                            message.sender === currentUser
                                ? "sent"
                                : "received"
                        }`}
                    >
                        <div className="message-content">
                            {message.message}
                        </div>
                        <div className="message-time">
                            {new Date(message.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default MessageList;