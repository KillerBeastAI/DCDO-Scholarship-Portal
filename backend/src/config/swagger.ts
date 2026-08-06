import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';
import { env } from './env.js';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Davao City Scholarship Programs Portal API',
      version: '1.0.0',
      description:
        'RESTful API for the Davao City Scholarship Programs Portal. Manages training providers, scholarship programs, qualification maps, physical accomplishments, and internal billings.',
      contact: {
        name: 'DCSPMS Team',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter the JWT access token obtained from the /api/v1/auth/login endpoint.',
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'Internal user management (admin only)' },
      { name: 'Training Providers', description: 'Training provider registry' },
      { name: 'Scholarship Programs', description: 'Scholarship program management' },
      { name: 'Qualification Maps', description: 'Qualification map (QM) management' },
      { name: 'Physical Accomplishments', description: 'Gender-disaggregated training accomplishment records' },
      { name: 'Internal Billings', description: 'Internal billing ledger and verification workflow' },
      { name: 'Dashboard', description: 'Executive dashboard KPI aggregates' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export const swaggerRouter = Router();

swaggerRouter.get('/swagger.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

swaggerRouter.use('/', swaggerUi.serve);
swaggerRouter.get('/', swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'DCSPMS API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'list',
    filter: true,
  },
}));
