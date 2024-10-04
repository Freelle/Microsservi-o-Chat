import WebSocket, { WebSocketServer } from 'ws';
import UserManager from '../utils/userManager';

interface ChatMessage {
  to: string;
  message: string;
}

class ChatService {
  private wss: WebSocketServer;

  constructor(server: any) {
    this.wss = new WebSocketServer({ server });
    this.wss.on('connection', this.handleConnection.bind(this));
  }

  private handleConnection(ws: WebSocket) {
    console.log('Novo cliente conectado');

    ws.on('message', (data: WebSocket.RawData) => {
      try {
        const parsedData = JSON.parse(data.toString());

        if (parsedData.type === 'authenticate') {
          const userId: string = parsedData.userId;
          if (userId) {
            (ws as any).userId = userId; 
            UserManager.addUser(userId, ws);
            ws.send(JSON.stringify({ message: `Bem-vindo ao chat, usuário ${userId}!` }));
          } else {
            ws.send(JSON.stringify({ error: 'userId é obrigatório para autenticação.' }));
            ws.close();
          }
        } else if (parsedData.type === 'message') {
          const chatMessage: ChatMessage = parsedData;
          this.sendMessage(chatMessage.to, chatMessage.message);
        }
      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        ws.send(JSON.stringify({ error: 'Formato de mensagem inválido.' }));
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

  private sendMessage(to: string, message: string) {
    const recipientWs = UserManager.getUser(to);
    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
      recipientWs.send(JSON.stringify({ message }));
      console.log(`Mensagem enviada para ${to}: ${message}`);
    } else {
      console.log(`Usuário ${to} não está conectado.`);
    }
  }
}

export default ChatService;
