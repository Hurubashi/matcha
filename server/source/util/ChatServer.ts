import express from 'express'
import * as http from 'http'
// import cors from "cors"
import { Message, messageModel } from '../models/Message'
import { User } from '../models/User'
import jwt from 'jsonwebtoken'
import cookie from 'cookie'
import ChatActions from '../actions/ChatActions'

class ChatServer {
	public static readonly PORT: number = 8080
	private app: express.Application
	private server: http.Server
	private io: SocketIO.Server
	private port: string | number

	ids: string[] = []

	constructor() {
		this.app = express()
		// this.app.use(cors())
		this.port = process.env.SOCKET_PORT || ChatServer.PORT
		this.server = http.createServer(this.app)
		this.io = require('socket.io').listen(this.server, { origins: '*:*' })
		this.listen()
	}

	private listen(): void {
		this.server.listen(this.port, () => {
			console.log('Running ChatServer on port %s', this.port)
		})

		this.io.on('connect', (socket: SocketIO.Socket) => {
			console.log('Connected client on port %s.', this.port)
			if (socket.handshake.headers.cookie) {
				var cookies = cookie.parse(socket.handshake.headers.cookie)
				var decoded = jwt.decode(cookies['jwt'])
				if (decoded && typeof decoded !== 'string') {
					this.ids[decoded.id] = socket.id
				}
			}

			socket.on('disconnect', () => {
				console.log('Client disconnected')
			})

			socket.on('message', async (message: any) => {
				// console.log('[server](message): %s', JSON.stringify(message))
				// var time = new Date().toLocaleTimeString()
				// Уведомляем клиента, что его сообщение успешно дошло до сервера
				if (socket.handshake.headers.cookie) {
					var cookies = cookie.parse(socket.handshake.headers.cookie)
					var decoded = jwt.decode(cookies['jwt'])
					if (decoded && typeof decoded !== 'string') {
						console.log('senderId: ' + decoded.id)
						// socket.id = decoded.id
						console.log(JSON.stringify(message))
						await this.sendPrivateMessage(message.chatId, decoded.id, message.receiverId, message.text)
					}
				}
			})
		})

		this.io.on('message', (message: any) => {
			console.log('[server](message): %s', JSON.stringify(message))
		})
	}

	async sendPrivateMessage(chatId: number, senderId: number, receiverId: number, text: string) {
		console.log('tring to send to: ' + this.ids[receiverId])

		const [message, err] = await ChatActions.postMessage(chatId, senderId, text)
		if (message) {
			console.log(message)
			const messages = await messageModel.getWhere({ chatId: chatId })

			this.io.to(this.ids[senderId]).emit('messageSent', messages)
			this.io.to(this.ids[receiverId]).emit('message', messages)
		}
	}

	async refreshChatListForUsers(userId1: number, userId2: number) {
		const chatResp1 = await ChatActions.getChats(userId1)
		const chatResp2 = await ChatActions.getChats(userId2)

		this.io.to(this.ids[userId1]).emit('chatlist', chatResp1)
		this.io.to(this.ids[userId2]).emit('chatlist', chatResp2)
	}
}

export const chatServer = new ChatServer()
