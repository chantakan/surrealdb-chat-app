'use client';

import { useState, useEffect, useRef } from 'react';
import { surrealDB, ChatMessage } from '@/lib/surrealdb';

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<string | null>(null);

  // Scroll to the bottom of the message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize SurrealDB connection
  useEffect(() => {
    const initConnection = async () => {
      try {
        setLoading(true);
        await surrealDB.connect();
        setIsConnected(true);

        // Get existing messages
        const existingMessages = await surrealDB.getMessages();
        setMessages(existingMessages);
      } catch (error) {
        console.error('Connection error:', error instanceof Error ? error.message : String(error));
        setIsConnected(false);
      } finally {
        setLoading(false);
      }
    };

    initConnection();

    return () => {
      if (subscriptionRef.current) {
        surrealDB.unsubscribe(subscriptionRef.current);
      }
      surrealDB.disconnect();
    };
  }, []);

  // Scroll when message is updated 
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Join chat
  const joinChat = async () => {
    if (!username.trim() || !isConnected) return;

    try {
      // Start real-time update subscription
      const subscription = await surrealDB.subscribeToMessages((message: ChatMessage) => {
        setMessages(prev => [...prev, message]);
      });
      subscriptionRef.current = subscription;
      setIsJoined(true);
    } catch (error) {
      console.error('Failed to join chat:', error instanceof Error ? error.message : String(error));
    }
  };

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !isJoined || !isConnected) return;

    try {
      await surrealDB.sendMessage(username, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error instanceof Error ? error.message : String(error));
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Connecting to SurrealDB...</p>
        </div>
      </div>
    );
  }

  // Connection error state
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">Unable to connect to SurrealDB server.</p>
          <p className="text-sm text-gray-500">
            Make sure the Docker container is running:<br/>
            <code className="bg-gray-100 px-2 py-1 rounded">docker run --rm -p 8000:8000 surrealdb/surrealdb:latest start --user root --pass root</code>
          </p>
        </div>
      </div>
    );
  }

  // User Name Input Screen
  if (!isJoined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            📱 Real-time chat using SurrealDB
          </h1>
          <form onSubmit={(e) => { e.preventDefault(); joinChat(); }}>
            <div className="mb-4">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Please enter your user name
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Your Name"
                required
              />
            </div>
            <button
              type="submit"
              disabled={!username.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Join the Chat
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main chat screen
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">
            📱 Real-time chat using SurrealDB
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Welcome, <span className="font-medium text-blue-600">{username}</span>-san
            </span>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Connecting...</span>
            </div>
          </div>
        </div>
      </header>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet</p>
            <p className="text-sm mt-2">Try sending the first message!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id ? message.id.toString() : `${message.username}-${message.timestamp}-${index}`}
              className={`flex ${
                message.username === username ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.username === username
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-800 shadow-sm'
                }`}
              >
                {message.username !== username && (
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    {message.username}
                  </p>
                )}
                <p className="break-words">{message.message}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.username === username ? 'text-blue-100' : 'text-gray-400'
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input form */}
      <footer className="bg-white border-t border-gray-200 px-4 py-4">
        <form onSubmit={sendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Send
          </button>
        </form>
      </footer>
    </div>
  );
}