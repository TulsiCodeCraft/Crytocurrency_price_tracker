import { Redis } from 'ioredis';
import fetch from 'node-fetch';

const CRYPTO_IDS = ['stellar','ripple','polkadot', 'ethereum','chainlink','bitcoin', 'litecoin','dogecoin','cardano','solana','binancecoin','tether','usd-coin','wrapped-bitcoin','uniswap','tron'];  
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const CACHE_KEY = 'cryptoData';
const CACHE_TTL = 60; // 60 seconds

interface CryptoData {
  id: string;
  name: string;
  price: number;
  change24h: number;
}

let redisClient: Redis | null = null;

function createRedisClient(): Redis {
  const client = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  client.on('error', (err: Error) => {
    console.error('Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('Successfully connected to Redis');
  });

  return client;
}

export async function fetchCryptoData(): Promise<CryptoData[]> {
  try {
    if (!redisClient) {
      redisClient = createRedisClient();
    }

    // Try to get data from Redis cache
    const cachedData = await redisClient.get(CACHE_KEY);
    if (cachedData) {
      console.log('Returning cached data');
      return JSON.parse(cachedData);
    }

    console.log('Fetching fresh data from CoinGecko');
    const response = await fetch(
      `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${CRYPTO_IDS.join(',')}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API responded with status ${response.status}`);
    }

    const data = await response.json();
    const formattedData: CryptoData[] = data.map(({ id, name, current_price, price_change_percentage_24h }: any) => ({
      id,
      name,
      price: current_price,
      change24h: price_change_percentage_24h
    }));

    await redisClient.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(formattedData));

    return formattedData;
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    return [];
  }
}

// Function to close Redis connection when shutting down the application
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    console.log('Redis connection closed');
  }
}
