import React from "react";
import "./Chat.css";

const UserList = ({ users, selectedUser, onSelectUser }) => {
    return (
        <div className="user-list">
            <h3>Online Users</h3>
            <ul>
                {users.map((user) => (
                    <li
                        key={user._id}
                        className={`user-item ${
                            selectedUser?._id === user._id ? "active" : ""
                        }`}
                        onClick={() => onSelectUser(user)}
                    >
                        <span className="user-avatar">
                            {user.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="user-name">{user.name}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default UserList;