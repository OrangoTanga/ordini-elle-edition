import { Server as SocketIOServer } from 'socket.io'
import http from 'http'

let io: SocketIOServer

export function initIO(server: http.Server): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  })

  io.on('connection', (socket) => {
    console.log(`[WS] Client connesso: ${socket.id}`)

    socket.on('subscribe:orders', () => {
      socket.join('orders')
    })

    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnesso: ${socket.id}`)
    })
  })

  return io
}

export function getIO(): SocketIOServer {
  return io
}

export function closeIO(): void {
  if (io) io.close()
}
