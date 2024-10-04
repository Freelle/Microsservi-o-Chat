import { Router } from 'express';
import ChatController from '../controllers/chatController';

const router = Router();
const chatController = new ChatController();

router.get('/', (req, res) => chatController.chatHome(req, res));

export default router;
