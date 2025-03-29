import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { useState } from "react";
import Register from "./Register";
import Login from "./Login";
import Chat from "./Chat";

const App = () => {
    const [user, setUser] = useState(null);

    const handleLogout = () => {
        setUser(null);
    };

    // Protected Route Component
    const ProtectedRoute = ({ children }) => {
        if (!user) {
            return <Navigate to="/login" replace />;
        }
        return children;
    };

    return (
        <Router>
            <div className="flex flex-col h-screen bg-gray-100">
                <nav className="bg-blue-600 p-4 shadow-md">
                    <div className="container mx-auto flex justify-between items-center">
                        <h1 className="text-white text-xl font-bold">Chat App</h1>
                        {user ? (
                            <button 
                                onClick={handleLogout} 
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition duration-200"
                            >
                                Logout
                            </button>
                        ) : (
                            <div className="space-x-4">
                                <Link 
                                    to="/login" 
                                    className="text-white hover:text-blue-200 transition duration-200"
                                >
                                    Login
                                </Link>
                                <Link 
                                    to="/register" 
                                    className="text-white hover:text-blue-200 transition duration-200"
                                >
                                    Register
                                </Link>
                            </div>
                        )}
                    </div>
                </nav>

                <main className="flex-1">
                    <Routes>
                        {/* Public Routes */}
                        <Route 
                            path="/register" 
                            element={
                                <div className="h-full flex items-center justify-center">
                                    {!user ? <Register setUser={setUser} /> : <Navigate to="/chat" replace />}
                                </div>
                            } 
                        />
                        <Route 
                            path="/login" 
                            element={
                                <div className="h-full flex items-center justify-center">
                                    {!user ? <Login setUser={setUser} /> : <Navigate to="/chat" replace />}
                                </div>
                            } 
                        />

                        {/* Protected Routes */}
                        <Route 
                            path="/chat" 
                            element={
                                <ProtectedRoute>
                                    <div className="h-[87vh]">
                                        <div className="max-w-full bg-white rounded-lg shadow-md h-full flex flex-col">
                                            {/* <header className="mb-6">
                                                <h2 className="text-2xl font-semibold text-gray-800">Welcome, {user?.name}</h2>
                                            </header> */}
                                            <div className="flex-1">
                                                <Chat user={user} />
                                            </div>
                                        </div>
                                    </div>
                                </ProtectedRoute>
                            } 
                        />

                        {/* Default Route */}
                        <Route 
                            path="/" 
                            element={user ? <Navigate to="/chat" replace /> : <Navigate to="/login" replace />} 
                        />

                        {/* 404 Not Found Route */}
                        <Route 
                            path="*" 
                            element={
                                <div className="h-full flex items-center justify-center">
                                    <div className="text-center py-10">
                                        <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
                                        <p className="text-xl text-gray-600">Page Not Found</p>
                                    </div>
                                </div>
                            } 
                        />
                    </Routes>
                </main>
            </div>
        </Router>
    );
};

export default App;