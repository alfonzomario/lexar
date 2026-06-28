import React, { useState, useEffect } from 'react';
import { Bell, MessageCircle, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router';
import { clsx } from 'clsx';

type Notification = {
  id: string;
  type: 'dm' | 'forum';
  title: string;
  message: string;
  time: string;
  read: boolean;
  link: string;
};

// Dummy notifications for UI demonstration
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'dm',
    title: 'Nuevo mensaje de Dimas Bosch',
    message: 'Hola, ¿pudiste revisar el fallo de la clase anterior?',
    time: 'Hace 5 min',
    read: false,
    link: '/chat'
  },
  {
    id: '2',
    type: 'forum',
    title: 'Respuesta en el foro',
    message: 'Alguien respondió a tu duda sobre Derecho Penal.',
    time: 'Hace 1 hora',
    read: true,
    link: '/forum'
  }
];

export function NotificationWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const location = useLocation();
  const navigate = useNavigate();

  // If we are in BriefDetail or NormaDetail, we might have the AI widget visible at right-6 (24px).
  // So we move the bell to right-22 (88px) to coexist side-by-side.
  const isDocDetail = location.pathname.startsWith('/briefs/') || location.pathname.startsWith('/normativa/');

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notif: Notification) => {
    // Mark as read
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    setIsOpen(false);
    navigate(notif.link);
  };

  return (
    <div 
      className={clsx(
        "fixed bottom-6 z-[1000] transition-all duration-300",
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
              {unreadCount > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} nuevas
                </span>
              )}
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
                        !notif.read ? "bg-indigo-50/30" : "bg-white"
                      )}
                    >
                      <div className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                        notif.type === 'dm' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                      )}>
                        {notif.type === 'dm' ? <MessageCircle className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={clsx("text-sm truncate", !notif.read ? "font-bold text-stone-900" : "font-medium text-stone-700")}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-stone-500 line-clamp-2 mt-0.5">{notif.message}</p>
                        <p className="text-[10px] text-stone-400 mt-1">{notif.time}</p>
                      </div>
                      {!notif.read && (
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
          <span className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
