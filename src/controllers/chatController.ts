import { Request, Response } from 'express';

class ChatController {
  public chatHome(req: Request, res: Response) {
    res.send('Sistema de Chat WebSocket entre dois usuários está rodando!');
  }
}

export default ChatController;
