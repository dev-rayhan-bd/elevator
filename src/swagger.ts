import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import fs from 'fs';
import path from 'path';

export const setupSwagger = (app: Application) => {
  let swaggerFile = path.resolve(__dirname, 'swagger-output.json');

  // Fallbacks if swagger-output.json is not in __dirname (e.g. when running from dist/)
  if (!fs.existsSync(swaggerFile)) {
    const srcPath = path.resolve(process.cwd(), 'src', 'swagger-output.json');
    const rootPath = path.resolve(process.cwd(), 'swagger-output.json');
    const relativeSrcPath = path.resolve(__dirname, '../src/swagger-output.json');

    if (fs.existsSync(srcPath)) {
      swaggerFile = srcPath;
    } else if (fs.existsSync(relativeSrcPath)) {
      swaggerFile = relativeSrcPath;
    } else if (fs.existsSync(rootPath)) {
      swaggerFile = rootPath;
    }
  }

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
