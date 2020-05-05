import express from 'express'
import ChatController from '../controllers/ChatController'
import protect from '../middleware/auth'

const router = express.Router()

router.get('/', protect, ChatController.getChats)
router.post('/', protect, ChatController.postChat)

export default router
