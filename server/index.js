import app from './app.js';
import { config } from './shared/config/index.js';

const PORT = config.port;

app.listen(PORT, () => {
    console.log(`[NexusPro] Server running on port ${PORT}`);
    console.log(`[NexusPro] Environment: ${config.nodeEnv}`);
    console.log(`[NexusPro] API docs: http://localhost:${PORT}/api-docs`);
});
