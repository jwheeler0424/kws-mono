import env from '@kws/config/env/data';
import { createClient, type RedisClientType } from 'redis';

type RedisRuntimeState = {
  client: RedisClientType | null;
  connectPromise: Promise<RedisClientType> | null;
  listenersBound: boolean;
};

const redisRuntimeState = (() => {
  const globalState = globalThis as typeof globalThis & {
    __kwsRedisRuntimeState?: RedisRuntimeState;
  };

  if (!globalState.__kwsRedisRuntimeState) {
    globalState.__kwsRedisRuntimeState = {
      client: null,
      connectPromise: null,
      listenersBound: false,
    };
  }

  return globalState.__kwsRedisRuntimeState;
})();

function createRedisClient(): RedisClientType {
  return createClient({
    url: env.REDIS_URL,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy(retries) {
        // exponential backoff, capped at 5s
        return Math.min(retries * 50, 5000);
      },
    },
    pingInterval: 30000,
  });
}

function bindClientListeners(client: RedisClientType): void {
  if (redisRuntimeState.listenersBound) {
    return;
  }

  client.on('error', (error) => {
    console.error('[redis] client error', error);
  });

  client.on('end', () => {
    redisRuntimeState.client = null;
    redisRuntimeState.connectPromise = null;
    redisRuntimeState.listenersBound = false;
  });

  redisRuntimeState.listenersBound = true;
}

export async function getRedisClient(): Promise<RedisClientType> {
  if (redisRuntimeState.client?.isReady) {
    return redisRuntimeState.client;
  }

  if (redisRuntimeState.connectPromise) {
    return redisRuntimeState.connectPromise;
  }

  const client = redisRuntimeState.client ?? createRedisClient();
  redisRuntimeState.client = client;
  bindClientListeners(client);

  redisRuntimeState.connectPromise = client
    .connect()
    .then(() => client)
    .finally(() => {
      redisRuntimeState.connectPromise = null;
    });

  return redisRuntimeState.connectPromise;
}

export async function pingRedis(): Promise<string> {
  const client = await getRedisClient();
  return client.ping();
}

export async function disconnectRedis(): Promise<void> {
  if (!redisRuntimeState.client) {
    return;
  }

  const client = redisRuntimeState.client;
  redisRuntimeState.client = null;
  redisRuntimeState.connectPromise = null;
  redisRuntimeState.listenersBound = false;

  if (client.isOpen) {
    await client.quit();
  }
}

const redis = {
  getClient: getRedisClient,
  ping: pingRedis,
  disconnect: disconnectRedis,
};

export default redis;
