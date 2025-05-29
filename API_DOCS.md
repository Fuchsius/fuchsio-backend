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

```json
{
  "message": "Fuchsio Backend API v1",
  "endpoints": {
    "examples": "/api/v1/examples",
    "health": "/health"
  },
  "documentation": "Add your API documentation URL here"
}
```

### Examples CRUD Operations

#### Get All Examples

- **GET** `/api/v1/examples`
- **Description**: Retrieve all examples
- **Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Example 1",
      "description": "This is the first example",
      "createdAt": "2025-05-29T..."
    }
  ],
  "count": 1
}
```

#### Get Example by ID

- **GET** `/api/v1/examples/:id`
- **Description**: Retrieve a specific example by ID
- **Parameters**:
  - `id` (number): Example ID
- **Response**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Example 1",
    "description": "This is the first example",
    "createdAt": "2025-05-29T..."
  }
}
```

#### Create New Example

- **POST** `/api/v1/examples`
- **Description**: Create a new example
- **Request Body**:

```json
{
  "name": "New Example",
  "description": "This is a new example"
}
```

- **Response**:

```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "New Example",
    "description": "This is a new example",
    "createdAt": "2025-05-29T..."
  }
}
```

#### Update Example

- **PUT** `/api/v1/examples/:id`
- **Description**: Update an existing example
- **Parameters**:
  - `id` (number): Example ID
- **Request Body**:

```json
{
  "name": "Updated Example",
  "description": "This is an updated example"
}
```

- **Response**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Updated Example",
    "description": "This is an updated example",
    "createdAt": "2025-05-29T...",
    "updatedAt": "2025-05-29T..."
  }
}
```

#### Delete Example

- **DELETE** `/api/v1/examples/:id`
- **Description**: Delete an example
- **Parameters**:
  - `id` (number): Example ID
- **Response**:

```json
{
  "success": true,
  "message": "Example deleted successfully"
}
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-05-29T..."
}
```

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
