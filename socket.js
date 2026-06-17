import { io } from 'socket.io-client'
import { getBackendOrigin } from './backend'

const SOCKET_URL = getBackendOrigin()

let socket = null

export function getSocket() {
  if (!socket || socket.disconnected) {
    socket = io(SOCKET_URL, {
      transports:         ['websocket', 'polling'],
      autoConnect:        true,
      reconnectionDelay:  1000,
      reconnectionAttempts: 5,
    })
    socket.on('connect',    () => console.log('🔌 Socket connected:', socket.id))
    socket.on('disconnect', () => console.log('❌ Socket disconnected'))
    socket.on('connect_error', e => console.warn('Socket error:', e.message))
  }
  return socket
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null }
}

export default { getSocket, disconnectSocket }
