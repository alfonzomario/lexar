import React, { useEffect, useState, useRef } from 'react';
import { Send, User, MessageCircle, Lock, Hash, LogOut, Search, Crown, Shield, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { clsx } from 'clsx';
import { BalanzaLoader } from '../components/BalanzaLoader';
import { useAuth } from '../contexts/AuthContext';
import { UserRoleBadge } from '../components/UserRoleBadge';

type ChatRoom = { id: number; slug: string; name: string; category: string };
type RoomMessage = { id: number; room_id: number; user_id: number; user_name: string; content: string; timestamp: string };

function TierBadge({ tier }: { tier: string }) {
  if (tier === 'super_admin' || tier === 'admin') {
    return (
      <span className="bg-rose-100 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
        <Shield className="w-2.5 h-2.5" /> Admin
      </span>
    );
  }
  if (tier === 'pro') {
    return (
      <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
        <Crown className="w-2.5 h-2.5" /> Pro
      </span>
    );
  }
  return null;
}

export function Chat() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([]);
  const [dmMessages, setDmMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const [hasMoreDms, setHasMoreDms] = useState(true);
  const [loadingMoreDms, setLoadingMoreDms] = useState(false);
  const [hasMoreRoomMsgs, setHasMoreRoomMsgs] = useState(true);
  const [loadingMoreRoomMsgs, setLoadingMoreRoomMsgs] = useState(false);
  const shouldScrollToBottomRef = useRef(true);
  const [userSearch, setUserSearch] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});

  const currentUser = user;
  const isPro = currentUser && (currentUser.tier === 'pro' || currentUser.tier === 'admin' || currentUser.tier === 'super_admin');

  const selectedUserRef = useRef<any>(null);
  useEffect(() => {
    selectedUserRef.current = selectedUser;
    if (selectedUser && currentUser) {
      // Mark as read when selected
      fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: selectedUser.id }),
      })
        .then(() => {
          setUnreadCounts((prev) => {
            const next = { ...prev };
            delete next[selectedUser.id];
            return next;
          });
        })
        .catch(() => {});
    }
  }, [selectedUser, currentUser]);

  const fetchUnreadCounts = () => {
    if (currentUser) {
      fetch('/api/messages/unread-counts')
        .then((res) => (res.ok ? res.json() : []))
        .then((data: { sender_id: number; count: number }[]) => {
          const counts: Record<number, number> = {};
          data.forEach((row) => {
            counts[row.sender_id] = row.count;
          });
          setUnreadCounts(counts);
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    fetch('/api/chat-rooms').then((r) => r.json()).then(setRooms).catch(() => setRooms([]));
    fetch('/api/users').then((r) => r.json()).then(setUsers).catch(() => setUsers([]));
    fetchUnreadCounts();
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    socketRef.current = io();
    socketRef.current.emit('join', currentUser.id);

    socketRef.current.on('online_users', (userIds: number[]) => {
      setOnlineUsers(new Set(userIds));
    });

    socketRef.current.on('receive_message', (message) => {
      shouldScrollToBottomRef.current = true;
      setDmMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      
      if (message.sender_id !== currentUser.id) {
        if (!selectedUserRef.current || selectedUserRef.current.id !== message.sender_id) {
          setUnreadCounts((prev) => ({
            ...prev,
            [message.sender_id]: (prev[message.sender_id] || 0) + 1,
          }));
        } else {
          // Mark as read immediately
          fetch('/api/messages/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender_id: message.sender_id }),
          }).catch(() => {});
        }
      }
    });

    socketRef.current.on('room_message', (message: RoomMessage) => {
      shouldScrollToBottomRef.current = true;
      setRoomMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (selectedRoom && currentUser) {
      socketRef.current?.emit('join_room', selectedRoom.id);
      shouldScrollToBottomRef.current = true;
      setHasMoreRoomMsgs(true);
      fetch(`/api/chat-rooms/${selectedRoom.id}/messages?limit=50&offset=0`)
        .then((r) => r.json())
        .then((msgs) => {
          setRoomMessages(msgs);
          if (msgs.length < 50) {
            setHasMoreRoomMsgs(false);
          }
        })
        .catch(() => setRoomMessages([]));
      return () => {
        socketRef.current?.emit('leave_room', selectedRoom.id);
      };
    }
  }, [selectedRoom?.id, currentUser?.id]);

  useEffect(() => {
    if (currentUser && selectedUser) {
      shouldScrollToBottomRef.current = true;
      setHasMoreDms(true);
      fetch(`/api/messages/${currentUser.id}/${selectedUser.id}?limit=50&offset=0`)
        .then((r) => r.json())
        .then((msgs) => {
          setDmMessages(msgs);
          if (msgs.length < 50) {
            setHasMoreDms(false);
          }
        })
        .catch(() => setDmMessages([]));
    }
  }, [currentUser?.id, selectedUser?.id]);

  useEffect(() => {
    if (shouldScrollToBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [roomMessages, dmMessages]);

  const loadMoreRoomMessages = () => {
    if (loadingMoreRoomMsgs || !hasMoreRoomMsgs || !selectedRoom) return;
    setLoadingMoreRoomMsgs(true);
    shouldScrollToBottomRef.current = false;
    const offset = roomMessages.length;
    fetch(`/api/chat-rooms/${selectedRoom.id}/messages?limit=50&offset=${offset}`)
      .then((r) => r.json())
      .then((newMsgs) => {
        if (newMsgs.length < 50) {
          setHasMoreRoomMsgs(false);
        }
        if (newMsgs.length > 0) {
          setRoomMessages((prev) => {
            const existingIds = new Set(prev.map(m => m.id));
            const filteredNew = newMsgs.filter((m: any) => !existingIds.has(m.id));
            return [...filteredNew, ...prev];
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMoreRoomMsgs(false));
  };

  const loadMoreDms = () => {
    if (loadingMoreDms || !hasMoreDms || !currentUser || !selectedUser) return;
    setLoadingMoreDms(true);
    shouldScrollToBottomRef.current = false;
    const offset = dmConversationMessages.length;
    fetch(`/api/messages/${currentUser.id}/${selectedUser.id}?limit=50&offset=${offset}`)
      .then((r) => r.json())
      .then((newMsgs) => {
        if (newMsgs.length < 50) {
          setHasMoreDms(false);
        }
        if (newMsgs.length > 0) {
          setDmMessages((prev) => {
            const existingIds = new Set(prev.map(m => m.id));
            const filteredNew = newMsgs.filter((m: any) => !existingIds.has(m.id));
            return [...filteredNew, ...prev];
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMoreDms(false));
  };

  const leaveRoom = () => {
    if (selectedRoom) socketRef.current?.emit('leave_room', selectedRoom.id);
    setSelectedRoom(null);
    setRoomMessages([]);
  };

  const sendRoomMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || !currentUser) return;
    shouldScrollToBottomRef.current = true;
    socketRef.current?.emit('send_room_message', {
      room_id: selectedRoom.id,
      user_id: currentUser.id,
      content: newMessage.trim(),
    });
    setNewMessage('');
  };

  const sendDmMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !currentUser) return;
    shouldScrollToBottomRef.current = true;
    socketRef.current?.emit('send_message', {
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      content: newMessage.trim(),
    });
    setNewMessage('');
  };

  const dmConversationMessages = dmMessages.filter(
    (m) =>
      (m.sender_id === currentUser?.id && m.receiver_id === selectedUser?.id) ||
      (m.sender_id === selectedUser?.id && m.receiver_id === currentUser?.id)
  );

  // Filter users for DM (only Pro+, exclude self)
  const filteredUsers = users
    .filter((u) => u.id !== currentUser?.id)
    .filter((u) =>
      userSearch
        ? u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.university?.toLowerCase().includes(userSearch.toLowerCase())
        : true
    );

  if (!currentUser) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <BalanzaLoader size="lg" text="Iniciando Chat..." />
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl shadow-sm border border-stone-200">
        <div className="bg-stone-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-stone-400" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Chat Exclusivo Pro</h2>
        <p className="text-stone-500 max-w-md mb-6">
          Las salas de chat y mensajes directos son exclusivos del plan Pro.
        </p>
        <a href="/pricing" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors inline-block">
          Mejorar a Pro
        </a>
      </div>
    );
  }

  const roomsByCategory = { materia: rooms.filter((r) => r.category === 'materia'), universidad: rooms.filter((r) => r.category === 'universidad') };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-[2rem] shadow-sm border border-stone-200 overflow-hidden flex h-[750px] max-h-[85vh]"
    >
      <div className="w-1/4 min-w-[280px] max-w-[320px] border-r border-stone-200 flex flex-col bg-[#F8F9FA]">
        <div className="p-4 border-b border-stone-200 bg-white shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2 text-stone-900">
            <MessageCircle className="w-5 h-5 text-indigo-600" />
            Chat
          </h2>
          <p className="text-xs text-stone-500 mt-0.5 truncate">{currentUser.name}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-2 py-2">Salas</p>
          <p className="text-xs text-stone-500 px-2 pb-1">Materias y temas</p>
          {roomsByCategory.materia.map((room) => (
            <button
              key={room.id}
              onClick={() => { setSelectedUser(null); setSelectedRoom(room); }}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all duration-200',
                selectedRoom?.id === room.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'hover:bg-stone-200/60 text-stone-600 hover:text-stone-900'
              )}
            >
              <Hash className={clsx("w-4 h-4 shrink-0", selectedRoom?.id === room.id ? "text-indigo-200" : "text-stone-400")} />
              <span className="truncate">{room.name}</span>
            </button>
          ))}
          <p className="text-xs text-stone-500 px-2 pt-3 pb-1">Universidades</p>
          {roomsByCategory.universidad.map((room) => (
            <button
              key={room.id}
              onClick={() => { setSelectedUser(null); setSelectedRoom(room); }}
              className={clsx(
                'w-full flex items-center gap-2 p-2.5 rounded-xl text-left text-sm',
                selectedRoom?.id === room.id ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-stone-100 text-stone-700'
              )}
            >
              <Hash className="w-4 h-4 shrink-0 text-stone-400" />
              <span className="truncate">{room.name}</span>
            </button>
          ))}

          {/* DM Section */}
          <div className="mt-4 pt-3 border-t border-stone-200">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-2 py-2 flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-500" />
              Mensajes Directos
            </p>
            <p className="text-[10px] text-stone-400 px-2 pb-2">Solo usuarios Pro pueden enviar y recibir DMs.</p>

            {/* User search */}
            <div className="px-2 mb-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar usuario..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
            </div>

            {filteredUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => { setSelectedRoom(null); setSelectedUser(u); }}
                className={clsx(
                  'w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left',
                  selectedUser?.id === u.id ? 'bg-indigo-100 border border-indigo-200' : 'hover:bg-stone-100'
                )}
              >
                <div className="relative shrink-0">
                  <div className="bg-stone-200 w-8 h-8 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-stone-500" />
                  </div>
                  {onlineUsers.has(u.id) && (
                    <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-2 ring-white bg-emerald-500 animate-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-stone-900 truncate text-sm">{u.name}</span>
                      <TierBadge tier={u.tier} />
                      <UserRoleBadge role={u.profile_role} className="scale-[0.8] origin-left shrink-0" />
                    </div>
                    {u.university && (
                      <p className="text-[10px] text-stone-400 truncate">{u.university}</p>
                    )}
                  </div>
                  {unreadCounts[u.id] > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-4 text-center">
                      {unreadCounts[u.id]}
                    </span>
                  )}
                </div>
              </button>
            ))}

            {filteredUsers.length === 0 && (
              <p className="text-xs text-stone-400 text-center py-4">
                {userSearch ? 'No se encontraron usuarios.' : 'No hay otros usuarios Pro.'}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white min-w-0">
        {selectedRoom ? (
          <>
            <div className="p-4 border-b border-stone-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Hash className="w-5 h-5 text-indigo-600 shrink-0" />
                <h3 className="font-bold text-stone-900 truncate">{selectedRoom.name}</h3>
              </div>
              <button
                type="button"
                onClick={leaveRoom}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" /> Salir de la sala
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/50">
              {hasMoreRoomMsgs && roomMessages.length > 0 && (
                <div className="flex justify-center pb-2">
                  <button
                    onClick={loadMoreRoomMessages}
                    disabled={loadingMoreRoomMsgs}
                    className="text-xs text-indigo-650 hover:text-indigo-800 font-bold py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {loadingMoreRoomMsgs && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
                    Cargar mensajes anteriores
                  </button>
                </div>
              )}
              {roomMessages.length === 0 ? (
                <div className="text-center text-stone-400 mt-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>Nadie escribió todavía en esta sala. ¡Escribí algo!</p>
                </div>
              ) : (
                roomMessages.map((msg) => {
                  const isMe = msg.user_id === currentUser.id;
                  return (
                    <div key={msg.id} className={clsx('flex flex-col', isMe ? 'items-end' : 'items-start')}>
                      <div
                        className={clsx(
                          'max-w-[85%] rounded-2xl px-4 py-2',
                          isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-stone-200 text-stone-800 rounded-bl-none shadow-sm'
                        )}
                      >
                        {!isMe && (
                          <div className="flex items-center gap-1 mb-0.5">
                            <p className="text-xs font-medium text-indigo-600">{msg.user_name}</p>
                            <UserRoleBadge role={(msg as any).user_role} className="scale-[0.8] origin-left shrink-0" />
                          </div>
                        )}
                        <p>{msg.content}</p>
                        <p className={clsx('text-[10px] mt-1', isMe ? 'text-indigo-200' : 'text-stone-400')}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendRoomMessage} className="p-4 bg-white border-t border-stone-100 flex gap-3 shrink-0 items-center">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribí un mensaje..."
                className="flex-1 bg-stone-100/70 border border-stone-200 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 rounded-full px-5 py-3.5 outline-none transition-all text-sm"
              />
              <button type="submit" disabled={!newMessage.trim()} className="bg-indigo-600 text-white p-3.5 rounded-full hover:bg-indigo-700 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all shrink-0 shadow-sm shadow-indigo-200">
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </form>
          </>
        ) : selectedUser ? (
          <>
            <div className="p-4 border-b border-stone-200 flex items-center gap-3 shrink-0">
              <div className="bg-stone-200 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-stone-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-stone-900">{selectedUser.name}</h3>
                  <TierBadge tier={selectedUser.tier} />
                  <UserRoleBadge role={selectedUser.profile_role} />
                </div>
                <p className="text-xs text-stone-500">
                  {selectedUser.university ? `${selectedUser.university} · ` : ''}Mensaje directo
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/50">
              {hasMoreDms && dmConversationMessages.length > 0 && (
                <div className="flex justify-center pb-2">
                  <button
                    onClick={loadMoreDms}
                    disabled={loadingMoreDms}
                    className="text-xs text-indigo-650 hover:text-indigo-800 font-bold py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {loadingMoreDms && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
                    Cargar mensajes anteriores
                  </button>
                </div>
              )}
              {dmConversationMessages.length === 0 ? (
                <div className="text-center text-stone-400 mt-12">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Iniciá la conversación con {selectedUser.name}</p>
                  {selectedUser.university && (
                    <p className="text-xs text-stone-400 mt-1">{selectedUser.university}</p>
                  )}
                </div>
              ) : (
                dmConversationMessages.map((msg) => {
                  const isMe = msg.sender_id === currentUser.id;
                  return (
                    <div key={msg.id} className={clsx('flex', isMe ? 'justify-end' : 'justify-start')}>
                      <div
                        className={clsx(
                          'max-w-[70%] rounded-2xl px-4 py-2',
                          isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-stone-200 rounded-bl-none shadow-sm'
                        )}
                      >
                        <p>{msg.content}</p>
                        <p className={clsx('text-[10px] mt-1', isMe ? 'text-indigo-200' : 'text-stone-400')}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendDmMessage} className="p-4 bg-white border-t border-stone-100 flex gap-3 shrink-0 items-center">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribí un mensaje directo..."
                className="flex-1 bg-stone-100/70 border border-stone-200 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 rounded-full px-5 py-3.5 outline-none transition-all text-sm"
              />
              <button type="submit" disabled={!newMessage.trim()} className="bg-indigo-600 text-white p-3.5 rounded-full hover:bg-indigo-700 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all shrink-0 shadow-sm shadow-indigo-200">
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-400 p-8">
            <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-center text-lg font-medium text-stone-500 mb-2">Elegí una sala o un contacto</p>
            <p className="text-center text-sm max-w-sm">
              Podés unirte a una sala de chat por materia o universidad, o enviar un mensaje directo a cualquier usuario Pro.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
