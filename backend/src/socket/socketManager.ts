import { Server, Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { fetchCryptoData } from '../services/cryptoServices';
import { createAlert, deactivateAlert } from '../controllers/alertController';
import { Server as HttpServer } from 'http';
import { IAlert } from '../models/Alert';

// Interface definitions
interface AlertData {
  cryptoId: string;
  targetPrice: number;
  condition: 'above' | 'below';
}

interface CryptoData {
  id: string;
  name: string;
  price: number;
}

interface ServerToClientEvents {
  alertSet: (data: { message: string; alert: IAlert }) => void;
  alertTriggered: (data: {
    cryptoId: string;
    name: string;
    currentPrice: number;
    targetPrice: number;
    condition: string;
  }) => void;
  priceUpdate: (data: CryptoData[]) => void;
  error: (data: { type: string; message: string }) => void;
}

interface ClientToServerEvents {
  setAlert: (data: AlertData) => void;
}

interface SocketData {
  alert?: IAlert | null;
}

type CustomSocket = Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>;
type CustomServer = Server<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>;

export function setupSocketIO(server: HttpServer): CustomServer {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use((socket: CustomSocket, next) => {
    next();
  });

  io.on('connection', (socket: CustomSocket) => {
    console.log('New client connected:', socket.id);

    socket.join('crypto-updates');

    socket.on('setAlert', async (alertData: AlertData) => {
      try {
        const alert = await createAlert(socket.id, alertData);
        socket.data.alert = alert;
        
        socket.join(`crypto-${alertData.cryptoId}`);
        
        socket.emit('alertSet', {
          message: 'Alert set successfully',
          alert
        });
      } catch (error) {
        socket.emit('error', { 
          type: 'ALERT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      if (socket.data.alert && socket.data.alert._id) {
        try {
          await deactivateAlert(socket.data.alert._id.toString());
        } catch (error) {
          console.error('Error deactivating alert:', error);
        }
      }
    });
  });

  return io;
}

export async function updateAndBroadcast(io: CustomServer): Promise<void> {
  try {
    const data: CryptoData[] = await fetchCryptoData();
    
    io.to('crypto-updates').emit('priceUpdate', data);

    const sockets = await io.fetchSockets();
    
    for (const socket of sockets) {
      if (socket.data.alert) {
        const { cryptoId, targetPrice, condition, _id } = socket.data.alert;
        const crypto = data.find(c => c.id === cryptoId);
        
        if (crypto) {
          const currentPrice = crypto.price;
          let alertTriggered = false;

          if (condition === 'above' && currentPrice > targetPrice) {
            alertTriggered = true;
          } else if (condition === 'below' && currentPrice < targetPrice) {
            alertTriggered = true;
          }

          if (alertTriggered && _id) {
            socket.emit('alertTriggered', {
              cryptoId,
              name: crypto.name,
              currentPrice,
              targetPrice,
              condition
            });
            
            try {
              await deactivateAlert(_id.toString());
              socket.data.alert = null;
              socket.leave(`crypto-${cryptoId}`);
            } catch (error) {
              console.error('Error deactivating alert:', error);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in updateAndBroadcast:', error);
    io.to('crypto-updates').emit('error', {
      type: 'UPDATE_ERROR',
      message: 'Failed to fetch crypto updates'
    });
  }
}

export async function cleanupSocketIO(io: CustomServer): Promise<void> {
  try {
    const sockets = await io.fetchSockets();
    for (const socket of sockets) {
      if (socket.data.alert && socket.data.alert._id) {
        await deactivateAlert(socket.data.alert._id.toString());
      }
      socket.disconnect(true);
    }
  } catch (error) {
    console.error('Error during socket cleanup:', error);
  }
}

