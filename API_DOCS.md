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

## Project Management

### Project Model

```json
{
  "id": "string",
  "name": "string",
  "description": "string | null",
  "status": "PLANNING | ACTIVE | ON_HOLD | COMPLETED | CANCELLED",
  "startDate": "datetime | null",
  "endDate": "datetime | null",
  "budget": "number | null",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "createdBy": "string",
  "creator": "User",
  "members": "ProjectMember[]",
  "tasks": "Task[]",
  "messages": "ProjectMessage[]"
}
```

### Create Project

- **POST** `/api/v1/projects`
- **Authorization**: Admin, Team Lead
- **Request Body**:

```json
{
  "name": "Project Alpha",
  "description": "A new project description",
  "startDate": "2025-06-01",
  "endDate": "2025-12-31",
  "budget": 50000.0,
  "memberIds": ["user-id-1", "user-id-2"]
}
```

- **Response**:

```json
{
  "status": "success",
  "message": "Project created successfully",
  "data": {
    "id": "project-id",
    "name": "Project Alpha"
    // ... other project fields
  }
}
```

### Get Projects

- **GET** `/api/v1/projects`
- **Authorization**: All authenticated users
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10, max: 100)
  - `status`: Filter by project status
  - `search`: Search in name and description
  - `sortBy`: Sort field (name, status, createdAt, updatedAt, startDate, endDate)
  - `sortOrder`: Sort direction (asc, desc)

### Get Project

- **GET** `/api/v1/projects/:id`
- **Authorization**: Project members, Creator, Admin

### Update Project

- **PUT** `/api/v1/projects/:id`
- **Authorization**: Admin, Project Creator
- **Request Body**: Same as create project (all fields optional)

### Delete Project

- **DELETE** `/api/v1/projects/:id`
- **Authorization**: Admin, Project Creator

### Add Project Member

- **POST** `/api/v1/projects/:id/members`
- **Authorization**: Admin, Project Creator, Team Lead (project member)
- **Request Body**:

```json
{
  "userId": "user-id"
}
```

### Remove Project Member

- **DELETE** `/api/v1/projects/:id/members/:userId`
- **Authorization**: Admin, Project Creator

### Get Project Statistics

- **GET** `/api/v1/projects/:id/stats`
- **Authorization**: Project members, Creator, Admin
- **Response**:

```json
{
  "status": "success",
  "data": {
    "project": {
      "id": "project-id",
      "name": "Project Alpha",
      "status": "ACTIVE"
    },
    "tasks": {
      "total": 25,
      "byStatus": {
        "TODO": 5,
        "IN_PROGRESS": 8,
        "REVIEW": 3,
        "COMPLETED": 9
      },
      "completionPercentage": 36
    },
    "members": 6,
    "messages": 142
  }
}
```

## Task Management

### Task Model

```json
{
  "id": "string",
  "title": "string",
  "description": "string | null",
  "status": "TODO | IN_PROGRESS | REVIEW | COMPLETED | CANCELLED",
  "priority": "LOW | MEDIUM | HIGH | URGENT",
  "dueDate": "datetime | null",
  "estimatedHours": "number | null",
  "actualHours": "number | null",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "projectId": "string",
  "assignedToId": "string | null",
  "createdBy": "string",
  "project": "Project",
  "assignedTo": "User | null",
  "creator": "User"
}
```

### Create Task

- **POST** `/api/v1/tasks`
- **Authorization**: Admin, Team Lead, Project Creator
- **Request Body**:

```json
{
  "title": "Implement user authentication",
  "description": "Set up JWT-based authentication system",
  "projectId": "project-id",
  "assignedToId": "user-id",
  "priority": "HIGH",
  "dueDate": "2025-06-15",
  "estimatedHours": 8.5
}
```

### Get Tasks

- **GET** `/api/v1/tasks`
- **Authorization**: All authenticated users (filtered by accessible projects)
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10, max: 100)
  - `projectId`: Filter by project
  - `assignedToId`: Filter by assignee
  - `status`: Filter by task status
  - `priority`: Filter by priority
  - `search`: Search in title and description
  - `sortBy`: Sort field (title, status, priority, dueDate, createdAt, updatedAt)
  - `sortOrder`: Sort direction (asc, desc)

### Get My Tasks

- **GET** `/api/v1/tasks/my-tasks`
- **Authorization**: All authenticated users
- **Query Parameters**: Same as Get Tasks (excluding assignedToId)

### Get Task

- **GET** `/api/v1/tasks/:id`
- **Authorization**: Task assignee, Project members, Creator, Admin

### Update Task

- **PUT** `/api/v1/tasks/:id`
- **Authorization**:
  - Admin, Project Creator, Team Lead: Can update all fields
  - Task Assignee: Can only update status and actualHours
- **Request Body**: Same as create task (all fields optional)

### Delete Task

- **DELETE** `/api/v1/tasks/:id`
- **Authorization**: Admin, Project Creator, Task Creator

### Get Task Statistics

- **GET** `/api/v1/tasks/projects/:projectId/stats`
- **Authorization**: Project members, Creator, Admin
- **Response**:

```json
{
  "status": "success",
  "data": {
    "total": 25,
    "completed": 9,
    "overdue": 3,
    "completionPercentage": 36,
    "byStatus": {
      "TODO": 5,
      "IN_PROGRESS": 8,
      "REVIEW": 3,
      "COMPLETED": 9
    },
    "byPriority": {
      "LOW": 2,
      "MEDIUM": 10,
      "HIGH": 8,
      "URGENT": 5
    },
    "byAssignee": [
      {
        "assignedToId": "user-id",
        "_count": { "id": 5 },
        "assignee": {
          "id": "user-id",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        }
      }
    ]
  }
}
```

## Project Messaging

### Message Model

```json
{
  "id": "string",
  "content": "string",
  "isEdited": "boolean",
  "isFile": "boolean",
  "fileUrl": "string | null",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "projectId": "string",
  "sentBy": "string",
  "project": "Project",
  "sender": "User"
}
```

### Send Message

- **POST** `/api/v1/messages`
- **Authorization**: Project members, Creator, Admin
- **Request Body**:

```json
{
  "projectId": "project-id",
  "content": "Hello team! How's the progress on the authentication module?"
}
```

### Get Project Messages

- **GET** `/api/v1/messages/projects/:projectId`
- **Authorization**: Project members, Creator, Admin
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20, max: 100)
  - `sortOrder`: Sort direction (asc, desc)

### Update Message

- **PUT** `/api/v1/messages/:id`
- **Authorization**: Message sender (within 15 minutes)
- **Request Body**:

```json
{
  "content": "Updated message content"
}
```

### Delete Message

- **DELETE** `/api/v1/messages/:id`
- **Authorization**: Message sender, Project Creator, Admin

### Get Message Statistics

- **GET** `/api/v1/messages/projects/:projectId/stats`
- **Authorization**: Project members, Creator, Admin
- **Response**:

```json
{
  "status": "success",
  "data": {
    "total": 142,
    "today": 8,
    "topSenders": [
      {
        "sentBy": "user-id",
        "_count": { "id": 23 },
        "sender": {
          "id": "user-id",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "role": "TEAM_LEAD"
        }
      }
    ]
  }
}
```

## Common Response Format

All API responses follow this format:

### Success Response

```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": {
    /* response data */
  }
}
```

### Paginated Response

```json
{
  "status": "success",
  "data": [
    /* array of items */
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Error description",
  "errors": [
    /* validation errors if applicable */
  ]
}
```

## Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity (Validation Error)
- `500` - Internal Server Error
