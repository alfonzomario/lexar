import React, { useState, useEffect } from 'react';
import { Bell, MessageCircle, MessageSquare, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router';
import { clsx } from 'clsx';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

type Notification = {
  id: string;
  type: 'dm' | 'forum' | 'comment' | 'system';
  title: string;
  message: string;
  link: string;
  is_read: number;
  created_at: string;
};

const formatTime = (isoString: string) => {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  } catch {
    return 'Hace un momento';
  }
};

export function NotificationWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  const isDocDetail = location.pathname.startsWith('/briefs/') || location.pathname.startsWith('/normativa/');
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!user) return;

    // Fetch initial list
    fetch('/api/notifications')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setNotifications(data);
        }
      })
      .catch(() => {});

    // Setup Socket
    const socket = io();
    socket.emit('join', user.id);

    socket.on('new_notification', (newNotif: Notification) => {
      setNotifications(prev => [newNotif, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      try {
        await fetch(`/api/notifications/${notif.id}/read`, { method: 'POST' });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n));
      } catch (e) {
        console.error('Error marking read:', e);
      }
    }
    setIsOpen(false);
    navigate(notif.link);
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (e) {
      console.error('Error marking all read:', e);
    }
  };

  if (!user) return null;

  return (
    <div 
      className={clsx(
        "fixed bottom-6 z-40 transition-all duration-300",
        isDocDetail ? "right-[88px]" : "right-6"
      )}
    >
      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden"
          >
            <div className="p-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
              <h3 className="font-bold text-stone-800 flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" />
                Notificaciones
              </h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
                  >
                    Marcar todas
                  </button>
                )}
                {unreadCount > 0 && (
                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-stone-400 flex flex-col items-center gap-2">
                  <Bell className="w-8 h-8 opacity-20" />
                  <p className="text-sm">No tienes notificaciones</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={clsx(
                        "text-left p-4 hover:bg-stone-50 border-b border-stone-50 last:border-0 transition-colors flex gap-3",
                        !notif.is_read ? "bg-indigo-50/30" : "bg-white"
                      )}
                    >
                      <div className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                        notif.type === 'dm' ? 'bg-emerald-100 text-emerald-600' :
                        notif.type === 'forum' ? 'bg-blue-100 text-blue-600' :
                        'bg-purple-100 text-purple-600'
                      )}>
                        {notif.type === 'dm' ? <MessageCircle className="w-4 h-4" /> :
                         notif.type === 'forum' ? <MessageSquare className="w-4 h-4" /> :
                         <BookOpen className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={clsx("text-sm truncate", !notif.is_read ? "font-bold text-stone-900" : "font-medium text-stone-700")}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-stone-500 line-clamp-2 mt-0.5">{notif.message}</p>
                        <p className="text-[10px] text-stone-400 mt-1">{formatTime(notif.created_at)}</p>
                      </div>
                      {!notif.is_read && (
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-2" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-white hover:bg-stone-50 text-stone-700 rounded-full shadow-lg border border-stone-200 flex items-center justify-center transition-all hover:scale-105 relative group"
      >
        <Bell className="w-6 h-6 group-hover:text-indigo-600 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
