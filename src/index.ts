import express from 'express';
import { createServer } from 'http';
import chatRoutes from './routes/chatRouter';
import ChatService from './services/chatService';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

app.use('/chat', chatRoutes);

const server = createServer(app);

const chatService = new ChatService(server);

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
