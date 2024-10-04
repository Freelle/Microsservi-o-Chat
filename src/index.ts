import express from 'express';
import { createServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';  

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Servidor WebSocket com Express e TypeScript está rodando!');
});

const server = createServer(app);

const wss = new WebSocketServer({ server });

const broadcast = (data: any) => {
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

wss.on('connection', (ws: WebSocket) => {
  console.log('Novo cliente conectado');

  ws.send(JSON.stringify({ message: 'Testando Conexão!' }));

  ws.on('message', (data: WebSocket.RawData) => {
    const message = data.toString();
    console.log(`Mensagem recebida: ${message}`);

    broadcast({ message });
  });

  ws.on('close', () => {
    console.log('Cliente desconectado');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
