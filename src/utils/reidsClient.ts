import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

const publisher = createClient({
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  },
});

const subscriber = createClient({
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  },
});

publisher.connect().then(() => {
  console.log('Publisher conectado ao Redis');
}).catch(err => {
  console.error('Erro ao conectar o Publisher ao Redis:', err);
});

subscriber.connect().then(() => {
  console.log('Subscriber conectado ao Redis');
}).catch(err => {
  console.error('Erro ao conectar o Subscriber ao Redis:', err);
});

export { publisher, subscriber };
