import 'dotenv/config';
import { startServer } from './src/server.js';

startServer().catch((err) => console.error('Error:', err));
