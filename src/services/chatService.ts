import { IncomingMessage } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { Socket } from 'net'; 
import UserManager from '../utils/userManager';
import { publisher, subscriber } from '../utils/reidsClient';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';


dotenv.config();

interface ChatMessage {
  from_user_id: number;
  to_user_id: number;
  message: string;
}

class ChatService {
  private wss: WebSocketServer;
  private jwtSecret: string;

  constructor(server: any) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    });

    subscriber.subscribe('chat_messages', (message) => {
      console.log(`Mensagem recebida no canal 'chat_messages': ${message}`);
    }).then(() => {
      console.log("Assinado ao canal 'chat_messages' no Redis");
    }).catch((err) => {
      console.error("Erro ao assinar o canal 'chat_messages':", err);
    });

    subscriber.on('message', (channel, message) => {
      if (channel === 'chat_messages') {
        try {
          const data: ChatMessage = JSON.parse(message);
          this.sendMessageToUser(data.to_user_id.toString(), data.message);
        } catch (error) {
          console.error('Erro ao processar mensagem do Redis:', error);
        }
      }
    });

    this.jwtSecret = process.env.JWT_SECRET || 'segredinho';
  }

  private handleConnection(ws: WebSocket) {
    console.log('Novo cliente conectado');

    ws.on('message', async (data: WebSocket.RawData) => {
      try {
        const parsedData = JSON.parse(data.toString());

        if (parsedData.type === 'authenticate') {
          const token: string = parsedData.token;
          if (token) {
            const decoded = jwt.verify(token, this.jwtSecret) as { user_id: number };
            const userId = decoded.user_id.toString();

            if (userId) {
              (ws as any).userId = userId;
              UserManager.addUser(userId, ws);
              ws.send(JSON.stringify({ message: `Bem-vindo ao chat, usuário ${userId}!` }));
            } else {
              ws.send(JSON.stringify({ error: 'user_id inválido no token.' }));
              ws.close();
            }
          } else {
            ws.send(JSON.stringify({ error: 'Token é obrigatório para autenticação.' }));
            ws.close();
          }
        } else if (parsedData.type === 'message') {
          const chatMessage: ChatMessage = {
            from_user_id: parseInt((ws as any).userId),
            to_user_id: parsedData.to_user_id,
            message: parsedData.message
          };
          await publisher.publish('chat_messages', JSON.stringify(chatMessage));
        }
      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        ws.send(JSON.stringify({ error: 'Formato de mensagem inválido ou token inválido.' }));
      }
    });

    ws.on('close', () => {
      const userId = (ws as any).userId;
      if (userId) {
        UserManager.removeUser(userId);
      }
      console.log('Cliente desconectado');
    });

    ws.on('error', (error) => {
      console.error('Erro no WebSocket:', error);
    });
  }

  public sendMessageToUser(userId: string, message: string) {
    const recipientWs = UserManager.getUser(userId);
    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
      recipientWs.send(JSON.stringify({ message }));
      console.log(`Mensagem enviada para ${userId}: ${message}`);
    } else {
      console.log(`Usuário ${userId} não está conectado.`);
    }
  }
}

export default ChatService;
