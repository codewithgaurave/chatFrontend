import React, { useState } from "react";
import "./Chat.css";

const MessageInput = ({ onSendMessage, disabled }) => {
    const [message, setMessage] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim() && !disabled) {
            onSendMessage(message);
            setMessage("");
        }
    };

    return (
        <form className="message-input" onSubmit={handleSubmit}>
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={disabled}
            />
            <button
                type="submit"
                disabled={!message.trim() || disabled}
                className="send-button"
            >
                Send
            </button>
        </form>
    );
};

export default MessageInput;