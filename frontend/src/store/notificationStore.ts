// frontend/src/store/notificationStore.ts
import { StateCreator } from 'zustand'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  isRead: boolean
  priority: 'low' | 'medium' | 'high'
  actionUrl?: string
  actionText?: string
  createdAt: string
  expiresAt?: string
}

export interface NotificationSlice {
  // State
  notifications: Notification[]
  unreadCount: number

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  resetNotifications: () => void
}

export const createNotificationSlice: StateCreator<
  NotificationSlice,
  [],
  [],
  NotificationSlice
> = (set, get) => ({
  // Initial state
  notifications: [],
  unreadCount: 0,

  // Actions
  addNotification: (notificationData) => {
    const newNotification: Notification = {
      ...notificationData,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isRead: false,
      createdAt: new Date().toISOString()
    }

    set((state) => {
      const updatedNotifications = [newNotification, ...state.notifications]
      const unreadCount = updatedNotifications.filter(n => !n.isRead).length

      return {
        notifications: updatedNotifications,
        unreadCount
      }
    })

    // Auto-remove notification after expiry
    if (notificationData.expiresAt) {
      const expiryTime = new Date(notificationData.expiresAt).getTime() - Date.now()
      if (expiryTime > 0) {
        setTimeout(() => {
          get().removeNotification(newNotification.id)
        }, expiryTime)
      }
    }
  },

  markAsRead: (id) => {
    set((state) => {
      const updatedNotifications = state.notifications.map(notification =>
        notification.id === id
          ? { ...notification, isRead: true }
          : notification
      )
      const unreadCount = updatedNotifications.filter(n => !n.isRead).length

      return {
        notifications: updatedNotifications,
        unreadCount
      }
    })
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map(notification => ({
        ...notification,
        isRead: true
      })),
      unreadCount: 0
    }))
  },

  removeNotification: (id) => {
    set((state) => {
      const updatedNotifications = state.notifications.filter(n => n.id !== id)
      const unreadCount = updatedNotifications.filter(n => !n.isRead).length

      return {
        notifications: updatedNotifications,
        unreadCount
      }
    })
  },

  clearNotifications: () => {
    set({
      notifications: [],
      unreadCount: 0
    })
  },

  resetNotifications: () => {
    set({
      notifications: [],
      unreadCount: 0
    })
  }
})