# Fuchsio Backend API Documentation

## Base URL

```
http://localhost:3001
```

## User Model

The User model includes the following fields:

```json
{
  "id": "string",
  "email": "string",
  "username": "string",
  "firstName": "string",
  "lastName": "string",
  "avatar": "string | null",
  "position": "string | null",
  "accessToOthers": "boolean",
  "role": "ADMIN | TEAM_LEAD | EMPLOYEE",
  "status": "ACTIVE | INACTIVE | SUSPENDED",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "lastLogin": "datetime | null"
}
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

## Authentication Endpoints

### Register User

- **POST** `/api/v1/auth/register`
- **Description**: Register a new user
- **Request Body**:

```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "avatar": "https://example.com/avatar.jpg", // optional
  "position": "Software Developer", // optional
  "accessToOthers": true, // optional, defaults to true
  "role": "EMPLOYEE" // optional, defaults to EMPLOYEE
}
```

- **Response**: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "cuid...",
    "email": "user@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://example.com/avatar.jpg",
    "position": "Software Developer",
    "accessToOthers": true,
    "role": "EMPLOYEE",
    "status": "ACTIVE",
    "createdAt": "2025-05-29T..."
  },
  "message": "User registered successfully"
}
```

### Login User

- **POST** `/api/v1/auth/login`
- **Description**: Login with email/username and password
- **Request Body**:

```json
{
  "identifier": "username or email",
  "password": "Password123!"
}
```

- **Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cuid...",
      "email": "user@example.com",
      "username": "username",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "https://example.com/avatar.jpg",
      "position": "Software Developer",
      "accessToOthers": true,
      "role": "EMPLOYEE",
      "status": "ACTIVE",
      "createdAt": "2025-05-29T...",
      "lastLogin": "2025-05-29T..."
    },
    "accessToken": "jwt_token...",
    "refreshToken": "refresh_token..."
  },
  "message": "Login successful"
}
```

### Get Current User

- **GET** `/api/v1/auth/me`
- **Description**: Get current authenticated user's profile
- **Headers**: Authorization: Bearer {accessToken}
- **Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "cuid...",
    "email": "user@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://example.com/avatar.jpg",
    "position": "Software Developer",
    "accessToOthers": true,
    "role": "EMPLOYEE",
    "status": "ACTIVE",
    "createdAt": "2025-05-29T...",
    "lastLogin": "2025-05-29T..."
  }
}
```

## User Endpoints

### Update Profile

- **PUT** `/api/v1/users/profile`
- **Description**: Update own user profile
- **Headers**: Authorization: Bearer {accessToken}
- **Request Body**:

```json
{
  "firstName": "John", // optional
  "lastName": "Doe", // optional
  "email": "user@example.com", // optional
  "username": "username", // optional
  "avatar": "https://example.com/avatar.jpg", // optional, can be null
  "position": "Senior Developer" // optional, can be null
}
```

- **Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "cuid...",
    "email": "user@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://example.com/avatar.jpg",
    "position": "Senior Developer",
    "accessToOthers": true,
    "role": "EMPLOYEE",
    "status": "ACTIVE",
    "updatedAt": "2025-05-29T..."
  },
  "message": "Profile updated successfully"
}
```

### Create User (Admin only)

- **POST** `/api/v1/users`
- **Description**: Create a new user (Admin only)
- **Headers**: Authorization: Bearer {accessToken}
- **Request Body**:

```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "EMPLOYEE", // optional, defaults to EMPLOYEE
  "avatar": "https://example.com/avatar.jpg", // optional
  "position": "Software Developer", // optional
  "accessToOthers": true // optional, defaults to true
}
```

- **Response**: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "cuid...",
    "email": "user@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://example.com/avatar.jpg",
    "position": "Software Developer",
    "accessToOthers": true,
    "role": "EMPLOYEE",
    "status": "ACTIVE",
    "createdAt": "2025-05-29T..."
  },
  "message": "User created successfully"
}
```

### Update User (Admin/Team Lead)

- **PUT** `/api/v1/users/:id`
- **Description**: Update any user (Admin) or employees only (Team Lead)
- **Headers**: Authorization: Bearer {accessToken}
- **Request Body**:

```json
{
  "firstName": "John", // optional
  "lastName": "Doe", // optional
  "email": "user@example.com", // optional
  "username": "username", // optional
  "role": "EMPLOYEE", // optional, Admin only
  "status": "ACTIVE", // optional, Admin only
  "avatar": "https://example.com/avatar.jpg", // optional, can be null
  "position": "Senior Developer", // optional, can be null
  "accessToOthers": true // optional
}
```

- **Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "cuid...",
    "email": "user@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://example.com/avatar.jpg",
    "position": "Senior Developer",
    "accessToOthers": true,
    "role": "EMPLOYEE",
    "status": "ACTIVE",
    "updatedAt": "2025-05-29T..."
  },
  "message": "User updated successfully"
}
```
