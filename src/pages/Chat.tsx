import React, { useEffect, useState, useRef } from 'react';
import { Send, User, MessageCircle, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { clsx } from 'clsx';
import { BalanzaLoader } from '../components/BalanzaLoader';

export function Chat() {
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null); // Mock current user
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        // Mock: Set "María Gómez" (Pro user) as the current user for demo purposes
        const me = data.find((u: any) => u.tier === 'pro');
        setCurrentUser(me || data[0]);
      });
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    // Initialize socket
    socketRef.current = io();
    socketRef.current.emit('join', currentUser.id);

    socketRef.current.on('receive_message', (message) => {
      setMessages((prev) => {
        // Prevent duplicates if multiple events fire
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && selectedUser) {
      fetch(`/api/messages/${currentUser.id}/${selectedUser.id}`)
        .then((res) => res.json())
        .then((data) => setMessages(data));
    }
  }, [currentUser, selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !currentUser) return;

    socketRef.current?.emit('send_message', {
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      content: newMessage.trim(),
    });

    setNewMessage('');
  };

  if (!currentUser) return (
    <div className="flex h-[60vh] items-center justify-center">
      <BalanzaLoader size="lg" text="Iniciando Chat Seguro..." />
    </div>
  );

  if (currentUser.tier === 'free' || currentUser.tier === 'basic') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl shadow-sm border border-stone-200">
        <div className="bg-stone-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-stone-400" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Chat Privado Exclusivo</h2>
        <p className="text-stone-500 max-w-md mb-6">
          El chat entre estudiantes es una funcionalidad exclusiva del plan Pro. Actualizá tu plan para conectar con otros alumnos.
        </p>
        <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
          Mejorar a Pro
        </button>
      </div>
    );
  }

  // Filter messages to only show the ones for the selected conversation
  const conversationMessages = messages.filter(
    (m) =>
      (m.sender_id === currentUser.id && m.receiver_id === selectedUser?.id) ||
      (m.sender_id === selectedUser?.id && m.receiver_id === currentUser.id)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden flex h-[700px]"
    >
      {/* Sidebar */}
      <div className="w-1/3 border-r border-stone-200 flex flex-col bg-stone-50">
        <div className="p-6 border-b border-stone-200 bg-white">
          <h2 className="text-xl font-bold flex items-center gap-2 text-stone-900">
            <MessageCircle className="w-6 h-6 text-indigo-600" />
            Mensajes
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Conectado como: <span className="font-semibold">{currentUser.name}</span>
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {users
            .filter((u) => u.id !== currentUser.id)
            .map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={clsx(
                  'w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left',
                  selectedUser?.id === user.id
                    ? 'bg-indigo-100 border border-indigo-200'
                    : 'hover:bg-stone-100 border border-transparent'
                )}
              >
                <div className="bg-stone-200 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-stone-500" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-semibold text-stone-900 truncate">{user.name}</h3>
                  <p className="text-xs text-stone-500 capitalize">{user.tier} Plan</p>
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-stone-200 flex items-center gap-3">
              <div className="bg-stone-200 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-stone-500" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900">{selectedUser.name}</h3>
                <p className="text-xs text-emerald-600 font-medium">En línea</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50/50">
              {conversationMessages.length === 0 ? (
                <div className="text-center text-stone-400 mt-12">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>Iniciá la conversación con {selectedUser.name}</p>
                </div>
              ) : (
                conversationMessages.map((msg, index) => {
                  const isMe = msg.sender_id === currentUser.id;
                  return (
                    <div
                      key={index}
                      className={clsx(
                        'flex',
                        isMe ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={clsx(
                          'max-w-[70%] rounded-2xl px-4 py-2',
                          isMe
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-white border border-stone-200 text-stone-800 rounded-bl-none shadow-sm'
                        )}
                      >
                        <p>{msg.content}</p>
                        <p
                          className={clsx(
                            'text-[10px] mt-1 text-right',
                            isMe ? 'text-indigo-200' : 'text-stone-400'
                          )}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-stone-200 bg-white">
              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribí un mensaje..."
                  className="flex-1 bg-stone-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl px-4 py-3 transition-all outline-none"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
            <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
            <p>Seleccioná un chat para empezar a enviar mensajes</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
