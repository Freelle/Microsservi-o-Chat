import { WebSocket } from 'ws';
import UserManager from './userManager';

interface ChatMessage {
  from_user_id: number;
  to_user_id: number;
  message: string;
}

class MessageManager {
  private messages: ChatMessage[];

  constructor() {
    this.messages = [];
  }

  addMessage(chatMessage: ChatMessage) {
    this.messages.push(chatMessage);
    console.log(`Mensagem adicionada: ${JSON.stringify(chatMessage)}`);
  }

  getMessagesForUser(userId: number): ChatMessage[] {
    return this.messages.filter(message => message.to_user_id === userId || message.from_user_id === userId);
  }

  sendMessageToUser(userId: string, message: string, fromUserId: number) {
    const recipientWs = UserManager.getUser(userId);
    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
      recipientWs.send(JSON.stringify({ message, from_user_id: fromUserId }));
      console.log(`Mensagem enviada para usuário ${userId}: ${message}`);
    } else {
      console.warn(`Usuário ${userId} não está conectado.`);
    }
  }
}

export default new MessageManager();
