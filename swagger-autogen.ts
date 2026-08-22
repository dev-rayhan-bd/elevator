import swaggerAutogen from 'swagger-autogen';


const doc = {
  info: {
    title: 'WeePlan API',
    version: '1.0.0',
    description: 'API documentation for WeePlan Backend',
  },
  servers: [
    {
      url: 'http://localhost:5013',
      description: 'Local server'
    },
    {
      url: 'http://3.226.133.13',
      description: 'Development server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const outputFile = './src/swagger-output.json';
// Pointing to your main routes file that aggregates everything
const routes = ['./src/app.ts'];

/* NOTE: If you are using the express Router, you must pass in the 'endpointsFiles' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

swaggerAutogen({ openapi: '3.0.0' })(outputFile, routes, doc).then(() => {
  // @ts-ignore
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

  for (const path in data.paths) {
    const segments = path.split('/').filter(Boolean);
    let tag = 'Default';
    
    // For paths like /api/v1/auth/... we want 'Auth' as the tag
    if (segments.length >= 3 && segments[0] === 'api' && segments[1] === 'v1') {
      tag = segments[2].charAt(0).toUpperCase() + segments[2].slice(1);
    } else if (segments.length >= 1) {
      tag = segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
    }

    for (const method in data.paths[path]) {
      data.paths[path][method].tags = [tag];
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
  console.log('✅ Tags generated based on URL paths!');
});
