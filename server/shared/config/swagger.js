import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index.js';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'NexusPro API',
            version: '1.0.0',
            description: 'API for NexusPro - Clinical Documentation and Data Management for RBTs and BCBAs',
        },
        servers: [
            {
                url: `http://localhost:${config.port}`,
                description: 'Development server',
            },
        ],
    },
    apis: ['./server/modules/**/*.routes.js'], // Updated path for modular structure
};

export const specs = swaggerJsdoc(options);
