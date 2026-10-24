"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Trash2, Filter, Inbox } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Notification, NotificationType } from "@/types";
import { toast } from "sonner";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [filterType, setFilterType] = useState<NotificationType | "all">("all");
  const router = useRouter();
  const supabase = createClient();
  const limit = 20;

  // Fetch notifications
  const fetchNotifications = async (reset = false) => {
    try {
      setLoading(true);
      const currentOffset = reset ? 0 : offset;
      
      const url = new URL('/api/notifications', window.location.origin);
      url.searchParams.set('limit', limit.toString());
      url.searchParams.set('offset', currentOffset.toString());
      if (activeTab === 'unread') {
        url.searchParams.set('unreadOnly', 'true');
      }

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch notifications');
      
      const data = await response.json();
      
      if (reset) {
        setNotifications(data.notifications || []);
        setOffset(0);
      } else {
        setNotifications((prev) => [...prev, ...(data.notifications || [])]);
      }
      
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to realtime notifications
  useEffect(() => {
    fetchNotifications(true);

    const channel = supabase
      .channel('notifications_page')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload: any) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setTotal((prev) => prev + 1);
          
          toast.success(newNotification.title, {
            description: newNotification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]);

  // Load more notifications
  const loadMore = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchNotifications(false);
  };

  // Mark single notification as read and navigate
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.readAt) {
      try {
        await fetch(`/api/notifications/${notification.id}`, {
          method: 'PATCH',
        });
        
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id
              ? { ...n, readAt: new Date().toISOString() }
              : n
          )
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    
    if (notification.link) {
      router.push(notification.link);
    }
  };

  // Delete notification
  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete notification');
      
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Mark all as read
  const markAllRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
      });
      
      if (!response.ok) throw new Error('Failed to mark all as read');
      
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  // Format time ago
  const timeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Filter notifications by type
  const filteredNotifications =
    filterType === "all"
      ? notifications
      : notifications.filter((n) => n.type === filterType);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0f] pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Notifications
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Stay updated on your projects and collaborations
          </p>
        </div>

        {/* Tabs and Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "all"
                  ? "bg-violet-500 text-white shadow-lg shadow-violet-500/25"
                  : "bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
              }`}
            >
              All ({total})
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "unread"
                  ? "bg-violet-500 text-white shadow-lg shadow-violet-500/25"
                  : "bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 text-violet-600 dark:text-violet-400 rounded-lg text-sm font-medium hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all"
            >
              <Check className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {/* Filter by type */}
        <div className="mb-6">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as NotificationType | "all")}
            className="px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">All types</option>
            <option value="proposal_submitted">Proposals</option>
            <option value="proposal_accepted">Accepted proposals</option>
            <option value="payment_received">Payments</option>
            <option value="delivery_uploaded">Deliveries</option>
            <option value="review_submitted">Reviews</option>
            <option value="message_received">Messages</option>
          </select>
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {loading && offset === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {activeTab === "unread"
                  ? "No unread notifications"
                  : "No notifications yet"}
              </p>
            </div>
          ) : (
            <>
              {filteredNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleNotificationClick(notification)}
                  className={`group flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                    !notification.readAt
                      ? "bg-violet-50/50 dark:bg-violet-500/5 border-violet-200 dark:border-violet-500/20"
                      : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {notification.title}
                      </h3>
                      {!notification.readAt && (
                        <div className="w-2.5 h-2.5 bg-violet-500 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {timeAgo(notification.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteNotification(notification.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}

              {/* Load More Button */}
              {filteredNotifications.length < total && (
                <div className="text-center pt-6">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-6 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
