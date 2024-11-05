import { IncomingMessage } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { Socket } from 'net';
import UserManager from '../utils/userManager';
import { publisher, subscriber } from '../utils/reidsClient';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import MessageManager from '../utils/messageManager'; // Importando MessageManager

dotenv.config();

class ChatService {
  private wss: WebSocketServer;
  private jwtSecret: string;

  constructor(server: any) {
    this.wss = new WebSocketServer({ noServer: true });
    this.jwtSecret = process.env.JWT_SECRET || 'segredinho';

    server.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.handleConnection(ws, request);
      });
    });

    subscriber.subscribe('chat_messages', (message) => {
      console.log(`Mensagem recebida no canal 'chat_messages': ${message}`);
    }).catch((err) => {
      console.error("Erro ao assinar o canal 'chat_messages':", err);
    });

    subscriber.on('message', (channel, message) => {
      if (channel === 'chat_messages') {
        try {
          const data = JSON.parse(message);
          MessageManager.addMessage(data); // Usando MessageManager para adicionar a mensagem
          this.sendMessageToUser(data.to_user_id.toString(), data.message, data.from_user_id);
        } catch (error) {
          console.error('Erro ao processar mensagem do Redis:', error);
        }
      }
    });
  }

  private handleConnection(ws: WebSocket, request: IncomingMessage) {
    console.log('Novo cliente conectado');

    ws.on('message', async (data: WebSocket.RawData) => {
      console.log('Mensagem recebida:', data.toString());
      try {
        const parsedData = JSON.parse(data.toString());
        if (parsedData.type === 'authenticate') {
          this.handleAuthentication(ws, parsedData.token);
        } else if (parsedData.type === 'message') {
          await this.handleMessage(ws, parsedData);
        } else if (parsedData.type === 'get_messages') {
          this.handleGetMessages(ws);
        }
      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        ws.send(JSON.stringify({ error: 'Formato de mensagem inválido ou erro na autenticação.' }));
      }
    });

    ws.on('close', () => {
      const userId = (ws as any).userId;
      if (userId) {
        UserManager.removeUser(userId);
        this.broadcastUserList(); // Atualiza a lista de usuários quando um usuário desconecta
      }
      console.log('Cliente desconectado');
    });

    ws.on('error', (error) => {
      console.error('Erro no WebSocket:', error);
    });
  }

  private handleAuthentication(ws: WebSocket, token: string) {
    if (token) {
      try {
        const decoded = jwt.verify(token, this.jwtSecret) as { user_id: number };
        const userId = decoded.user_id.toString();
        (ws as any).userId = userId;
        UserManager.addUser(userId, ws);
        ws.send(JSON.stringify({ message: `Bem-vindo ao chat, usuário ${userId}!` }));
        this.broadcastUserList(); // Atualiza a lista de usuários quando um novo usuário se conecta
      } catch (error) {
        ws.send(JSON.stringify({ error: 'Token inválido ou expirado.' }));
        ws.close();
      }
    } else {
      ws.send(JSON.stringify({ error: 'Token ausente.' }));
      ws.close();
    }
  }

  private async handleMessage(ws: WebSocket, parsedData: any) {
    const fromUserId = parseInt((ws as any).userId);
    const chatMessage = {
      from_user_id: fromUserId,
      to_user_id: parseInt(parsedData.to_user_id, 10),
      message: parsedData.message,
    };

    try {
      await publisher.publish('chat_messages', JSON.stringify(chatMessage));
      console.log('Mensagem publicada:', chatMessage);
    } catch (error) {
      console.error('Erro ao publicar mensagem:', error);
    }
  }

  private handleGetMessages(ws: WebSocket) {
    const userId = (ws as any).userId;
    const userMessages = MessageManager.getMessagesForUser(parseInt(userId)); // Usando MessageManager para obter mensagens
    ws.send(JSON.stringify({ type: 'messages', messages: userMessages }));
  }

  private broadcastUserList() {
    const users = UserManager.getAllUsers(); // Agora retorna a lista de usuários conectados
    const userIds = Array.from(users.keys()); // Obter IDs dos usuários
    const userMessage = JSON.stringify({ type: 'user_list', users: userIds });

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(userMessage); // Envia a lista de usuários para todos os clientes
      }
    });

    console.log('Lista de usuários conectados enviada:', userIds);
  }

  public sendMessageToUser(userId: string, message: string, fromUserId: number) {
    const recipientWs = UserManager.getUser(userId);
    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
      recipientWs.send(JSON.stringify({ message, from_user_id: fromUserId }));
      console.log(`Mensagem enviada para usuário ${userId}: ${message}`);
    } else {
      console.warn(`Usuário ${userId} não está conectado.`);
    }
  }
}

export default ChatService;
