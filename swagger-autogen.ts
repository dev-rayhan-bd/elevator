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
      const rawTag = segments[2];
      // Convert kebab-case or camelCase to Title Case (e.g. vendor-service -> VendorService)
      tag = rawTag
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
    } else if (segments.length >= 1) {
      tag = segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
    }

    for (const method in data.paths[path]) {
      const endpoint = data.paths[path][method];

      // Assign tag
      endpoint.tags = [tag];

      // Format human-readable resource name from tag (e.g. VendorService -> Vendor Service)
      const resourceName = tag.replace(/([A-Z])/g, ' $1').trim();
      const cleanSegments = segments.filter((s) => s !== 'api' && s !== 'v1');
      const hasId = cleanSegments.some((s) => s.includes('{') || s.includes(':'));
      const subActionParts = cleanSegments.filter((s) => !s.includes('{') && !s.includes(':'));
      const subAction = subActionParts.length > 1 ? subActionParts.slice(1).join(' ') : '';

      const m = method.toUpperCase();
      let verb = 'Fetch';
      let actionWord = 'retrieved';

      if (m === 'GET') {
        verb = 'Fetch';
        actionWord = 'retrieved';
      } else if (m === 'POST') {
        if (subAction.includes('login')) verb = 'Authenticate';
        else if (subAction.includes('register')) verb = 'Register';
        else if (subAction.includes('verify')) verb = 'Verify';
        else verb = 'Create';
        actionWord = 'created';
      } else if (m === 'PUT' || m === 'PATCH') {
        verb = 'Update';
        actionWord = 'updated';
      } else if (m === 'DELETE') {
        verb = 'Delete';
        actionWord = 'deleted';
      }

      // 1. Generate Summary if missing
      if (!endpoint.summary || endpoint.summary.trim() === '') {
        let generatedSummary = `${verb} ${subAction ? subAction + ' ' : ''}${resourceName}`.trim();
        if (hasId && !generatedSummary.toLowerCase().includes('id')) {
          generatedSummary += ' by ID';
        }
        endpoint.summary = generatedSummary
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (l: string) => l.toUpperCase())
          .replace(/By Id/i, 'by ID');
      }

      // 2. Generate Description if missing
      if (!endpoint.description || endpoint.description.trim() === '') {
        const readableSubAction = subAction ? subAction.replace(/-/g, ' ') + ' ' : '';
        endpoint.description = `Endpoint to ${verb.toLowerCase()} ${readableSubAction}${resourceName.toLowerCase()}${
          hasId ? ' by ID' : ''
        }.`;
      }

      // 3. Fix blank response descriptions
      const responses = endpoint.responses;
      if (responses) {
        // If default response exists with blank or generic description
        if (responses.default) {
          const status = m === 'POST' ? '201' : '200';
          const defaultDesc = `${resourceName} ${actionWord} successfully`;
          responses[status] = {
            description: responses.default.description || defaultDesc,
            ...(responses.default.content ? { content: responses.default.content } : {}),
          };
          delete responses.default;
        }

        // Ensure every response status code has a clear description
        for (const code in responses) {
          if (!responses[code].description || responses[code].description.trim() === '') {
            responses[code].description = `${resourceName} ${actionWord} successfully`;
          }
        }
      }
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
  console.log('✅ Tags, Summaries, Descriptions, and Response schemas generated for ALL endpoints!');
});
