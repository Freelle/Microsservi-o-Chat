import WebSocket from 'ws';

class UserManager {
  private users: Map<string, WebSocket>;

  constructor() {
    this.users = new Map();
  }

  addUser(userId: string, ws: WebSocket) {
    this.users.set(userId, ws);
    console.log(`Usuário ${userId} adicionado.`);
  }

  removeUser(userId: string) {
    this.users.delete(userId);
    console.log(`Usuário ${userId} removido.`);
  }

  getUser(userId: string): WebSocket | undefined {
    return this.users.get(userId);
  }

  hasUser(userId: string): boolean {
    return this.users.has(userId);
  }
}

export default new UserManager();
