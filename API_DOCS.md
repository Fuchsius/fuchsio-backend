# Fuchsio Backend API Documentation

## Base URL

```
http://localhost:3001
```

## Endpoints

### Health Check

- **GET** `/health`
- **Description**: Check server status
- **Response**:

```json
{
  "status": "OK",
  "timestamp": "2025-05-29T...",
  "uptime": 123.456
}
```

### API Information

- **GET** `/api/v1`
- **Description**: Get API information and available endpoints
- **Response**:

````json
{
  "message": "Fuchsio Backend API v1",
  "endpoints": {
    "auth": {
      "register": "POST /api/v1/auth/register",
      "login": "POST /api/v1/auth/login",
      "refresh": "POST /api/v1/auth/refresh",
      "logout": "POST /api/v1/auth/logout",
      "me": "GET /api/v1/auth/me",
      "changePassword": "POST /api/v1/auth/change-password"
    },
    "users": {
      "profile": "PUT /api/v1/users/profile",
      "list": "GET /api/v1/auth/users (Admin)",
      "create": "POST /api/v1/users (Admin)",
      "update": "PUT /api/v1/users/:id (Admin/Team Lead)",
      "delete": "DELETE /api/v1/users/:id (Admin)",
      "stats": "GET /api/v1/users/stats (Admin)"
    },
    "health": "/health"
  },
  "documentation": "See API_DOCS.md for detailed documentation"
}

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-05-29T..."
}
````

### Common HTTP Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Security Features

- Helmet.js for security headers
- CORS protection
- Rate limiting (100 requests per 15 minutes)
- Request validation
- Error handling

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Environment Variables

Copy `.env.example` to `.env` and configure:

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS` - Maximum requests per window
