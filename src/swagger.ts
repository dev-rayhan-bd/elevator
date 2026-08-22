import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import fs from 'fs';
import path from 'path';

export const setupSwagger = (app: Application) => {
  const swaggerFile = path.resolve(__dirname, 'swagger-output.json');
  let swaggerSpec;
  try {
    const swaggerData = fs.readFileSync(swaggerFile, 'utf8');
    swaggerSpec = JSON.parse(swaggerData);
  } catch (error) {
    console.error('Failed to load swagger-output.json:', error);
    return;
  }

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('📄 Swagger docs available at /api/docs');
};
