import { createClient } from 'redis';
import EnvConfig from './envConfig';

// Create a Redis client instance with the provided URL from the environment configuration
const redisClient = createClient({
  url: EnvConfig.REDIS_URL,
});

// Handle errors by logging them, which helps track issues without crashing the app immediately
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

// Asynchronously connect to the Redis server and log any connection errors
void (async () => {
  try {
    await redisClient.connect();
    console.log('Successfully connected to Redis');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
})();

export default redisClient;
