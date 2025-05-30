# 🔧 Fuchsio Backend API Documentation

---

## 🌐 **Base URL & Network Configuration**

### **Server Information**

- **Local IP Address**: `192.168.1.2`
- **Default Port**: `3000`
- **Environment**: `development` (configurable via NODE_ENV)

### **Base URLs for Frontend Integration**

#### **Primary Base URL (Network Access)**

```
http://192.168.1.2:3000
```

**Use this URL for:**

- Frontend applications on the same network
- Mobile apps testing on physical devices
- Team development and testing

#### **Local Development URL**

```
http://localhost:3000
```

**Use this URL for:**

- Local frontend development
- Backend testing and debugging
- Development tools and scripts

#### **API Endpoints**

- **REST API Base**: `http://192.168.1.2:3000/api/v1`
- **WebSocket Connection**: `ws://192.168.1.2:3000`
- **Health Check**: `http://192.168.1.2:3000/health`
- **Monitoring Dashboard**: `http://192.168.1.2:3000/status-monitor` (dev only)

### **CORS Configuration**

The server accepts connections from:

- `http://localhost:3000` (default frontend)
- `http://localhost:5173` (Vite development server)
- Additional origins via `ALLOWED_ORIGINS` environment variable

### **Server Status**

✅ **Currently Running**: Port 3000 is active and listening
🔄 **Auto-restart**: Available via `npm run dev` with nodemon
📊 **Monitoring**: Real-time dashboard available at `/status-monitor`

---

## 👥 Admin Employee Management APIs

### Authentication Required

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

## 📋 User Management Endpoints

### 1. Create New User (Admin Only)

**POST** `/api/v1/users`

**Headers:**

```json
{
  "Authorization": "Bearer <admin_jwt_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**

```json
{
  "email": "john.doe@company.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "EMPLOYEE",
  "avatar": "https://example.com/avatar.jpg",
  "position": "Frontend Developer",
  "accessToOthers": true
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "user_uuid_12345",
    "email": "john.doe@company.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "role": "EMPLOYEE",
    "status": "ACTIVE",
    "avatar": "https://example.com/avatar.jpg",
    "position": "Frontend Developer",
    "accessToOthers": true,
    "createdAt": "2025-05-30T10:00:00.000Z"
  }
}
```

---

### 2. Update User (Admin/Team Lead)

**PUT** `/api/v1/users/:id`

**Headers:**

```json
{
  "Authorization": "Bearer <admin_or_teamlead_jwt_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**

```json
{
  "firstName": "John Updated",
  "lastName": "Doe Updated",
  "email": "john.updated@company.com",
  "username": "johnupdated",
  "role": "TEAM_LEAD",
  "status": "ACTIVE",
  "avatar": "https://example.com/new-avatar.jpg",
  "position": "Senior Frontend Developer",
  "accessToOthers": false
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "user_uuid_12345",
    "email": "john.updated@company.com",
    "username": "johnupdated",
    "firstName": "John Updated",
    "lastName": "Doe Updated",
    "role": "TEAM_LEAD",
    "status": "ACTIVE",
    "avatar": "https://example.com/new-avatar.jpg",
    "position": "Senior Frontend Developer",
    "accessToOthers": false,
    "updatedAt": "2025-05-30T11:00:00.000Z"
  }
}
```

---

### 3. Delete User (Admin Only)

**DELETE** `/api/v1/users/:id`

**Headers:**

```json
{
  "Authorization": "Bearer <admin_jwt_token>"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": null
}
```

---

### 4. Get Users by Role (Admin/Team Lead)

**GET** `/api/v1/users/role/:role`

**Path Parameters:**

- `role`: ADMIN | TEAM_LEAD | EMPLOYEE

**Headers:**

```json
{
  "Authorization": "Bearer <admin_or_teamlead_jwt_token>"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": "user_uuid_12345",
      "email": "john.doe@company.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "role": "EMPLOYEE",
      "status": "ACTIVE",
      "avatar": "https://example.com/avatar.jpg",
      "position": "Frontend Developer",
      "accessToOthers": true,
      "createdAt": "2025-05-30T10:00:00.000Z",
      "lastLogin": "2025-05-30T09:30:00.000Z"
    },
    {
      "id": "user_uuid_67890",
      "email": "jane.smith@company.com",
      "username": "janesmith",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "EMPLOYEE",
      "status": "ACTIVE",
      "avatar": null,
      "position": "Backend Developer",
      "accessToOthers": true,
      "createdAt": "2025-05-29T14:00:00.000Z",
      "lastLogin": "2025-05-30T08:15:00.000Z"
    }
  ]
}
```

---

### 5. Get User Statistics (Admin Only)

**GET** `/api/v1/users/stats`

**Headers:**

```json
{
  "Authorization": "Bearer <admin_jwt_token>"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "User statistics retrieved successfully",
  "data": {
    "totalUsers": 25,
    "roleCounts": [
      { "role": "EMPLOYEE", "count": 20 },
      { "role": "TEAM_LEAD", "count": 4 },
      { "role": "ADMIN", "count": 1 }
    ],
    "statusCounts": [
      { "status": "ACTIVE", "count": 23 },
      { "status": "INACTIVE", "count": 1 },
      { "status": "SUSPENDED", "count": 1 }
    ],
    "recentUsers": [
      {
        "id": "user_uuid_new1",
        "email": "new.user@company.com",
        "username": "newuser",
        "firstName": "New",
        "lastName": "User",
        "role": "EMPLOYEE",
        "status": "ACTIVE",
        "avatar": null,
        "position": "Intern Developer",
        "accessToOthers": true,
        "createdAt": "2025-05-30T09:00:00.000Z"
      }
    ],
    "activeUsers": [
      {
        "id": "user_uuid_12345",
        "email": "john.doe@company.com",
        "username": "johndoe",
        "firstName": "John",
        "lastName": "Doe",
        "role": "EMPLOYEE",
        "status": "ACTIVE",
        "avatar": "https://example.com/avatar.jpg",
        "position": "Frontend Developer",
        "accessToOthers": true,
        "lastLogin": "2025-05-30T09:30:00.000Z"
      }
    ]
  }
}
```

---

### 6. Toggle User Status (Admin Only)

**PATCH** `/api/v1/users/:id/status`

**Headers:**

```json
{
  "Authorization": "Bearer <admin_jwt_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**

```json
{
  "status": "SUSPENDED"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "User suspended successfully",
  "data": {
    "id": "user_uuid_12345",
    "email": "john.doe@company.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "role": "EMPLOYEE",
    "status": "SUSPENDED",
    "updatedAt": "2025-05-30T11:30:00.000Z"
  }
}
```

---

### 7. Update Own Profile (All Users)

**PUT** `/api/v1/users/profile`

**Headers:**

```json
{
  "Authorization": "Bearer <user_jwt_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**

```json
{
  "firstName": "John Updated",
  "lastName": "Doe Updated",
  "email": "john.newemail@company.com",
  "username": "johnupdated",
  "avatar": "https://example.com/new-avatar.jpg",
  "position": "Senior Developer"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "user_uuid_12345",
    "email": "john.newemail@company.com",
    "username": "johnupdated",
    "firstName": "John Updated",
    "lastName": "Doe Updated",
    "role": "EMPLOYEE",
    "status": "ACTIVE",
    "avatar": "https://example.com/new-avatar.jpg",
    "position": "Senior Developer",
    "accessToOthers": true,
    "updatedAt": "2025-05-30T12:00:00.000Z"
  }
}
```

---

## 🔌 WebSocket Real-time Features

### Connection Setup

**WebSocket Endpoint:** `ws://localhost:3000` or `wss://yourdomain.com`

**Authentication:**

```javascript
const socket = io("ws://localhost:3000", {
  auth: {
    token: "Bearer <your_jwt_token>",
  },
});
```

---

### 📡 WebSocket Events

### 1. Connection Events

#### **connected** (Server → Client)

Sent immediately after successful connection.

```json
{
  "message": "Successfully connected to Fuchsio real-time service",
  "userId": "user_uuid_12345",
  "timestamp": "2025-05-30T10:00:00.000Z",
  "features": [
    "Real-time notifications",
    "Project collaboration",
    "Typing indicators",
    "User presence tracking"
  ]
}
```

#### **connect_error** (Server → Client)

Sent when connection fails.

```json
{
  "message": "Authentication failed",
  "timestamp": "2025-05-30T10:00:00.000Z"
}
```

---

### 2. Project Room Management

#### **join_project** (Client → Server)

Join a project room for real-time collaboration.

**Emit:**

```javascript
socket.emit("join_project", "project_uuid_12345");
```

**Response:**

```json
{
  "projectId": "project_uuid_12345",
  "success": true
}
```

#### **leave_project** (Client → Server)

Leave a project room.

**Emit:**

```javascript
socket.emit("leave_project", "project_uuid_12345");
```

**Response:**

```json
{
  "projectId": "project_uuid_12345",
  "success": true
}
```

---

### 3. Real-time Notifications

#### **notification** (Server → Client)

General notification event for all real-time updates.

**Task Created:**

```json
{
  "type": "task_created",
  "data": {
    "taskId": "task_uuid_12345",
    "title": "New Frontend Feature",
    "description": "Implement user dashboard",
    "priority": "HIGH",
    "status": "TODO",
    "assigneeId": "user_uuid_67890",
    "projectId": "project_uuid_12345",
    "createdBy": "user_uuid_admin",
    "dueDate": "2025-06-15T23:59:59.000Z"
  },
  "timestamp": "2025-05-30T10:00:00.000Z",
  "projectId": "project_uuid_12345"
}
```

**Task Assigned:**

```json
{
  "type": "task_assigned",
  "data": {
    "taskId": "task_uuid_12345",
    "title": "New Frontend Feature",
    "assigneeId": "user_uuid_67890",
    "assignedBy": "user_uuid_admin",
    "projectId": "project_uuid_12345",
    "dueDate": "2025-06-15T23:59:59.000Z"
  },
  "timestamp": "2025-05-30T10:05:00.000Z",
  "userId": "user_uuid_67890"
}
```

**Project Member Added:**

```json
{
  "type": "project_member_added",
  "data": {
    "projectId": "project_uuid_12345",
    "projectName": "E-commerce Platform",
    "memberId": "user_uuid_new",
    "memberName": "New Team Member",
    "role": "MEMBER",
    "addedBy": "user_uuid_admin"
  },
  "timestamp": "2025-05-30T10:10:00.000Z",
  "projectId": "project_uuid_12345"
}
```

**Message Sent:**

```json
{
  "type": "message_sent",
  "data": {
    "messageId": "message_uuid_12345",
    "content": "Great progress on the frontend!",
    "authorId": "user_uuid_admin",
    "authorName": "Admin User",
    "projectId": "project_uuid_12345",
    "attachments": [],
    "mentions": ["user_uuid_67890"]
  },
  "timestamp": "2025-05-30T10:15:00.000Z",
  "projectId": "project_uuid_12345"
}
```

**Time Entry Submitted:**

```json
{
  "type": "time_entry_submitted",
  "data": {
    "timeEntryId": "time_uuid_12345",
    "userId": "user_uuid_67890",
    "userName": "John Doe",
    "projectId": "project_uuid_12345",
    "taskId": "task_uuid_12345",
    "hours": 8.5,
    "description": "Worked on frontend components",
    "date": "2025-05-30",
    "isBillable": true
  },
  "timestamp": "2025-05-30T10:20:00.000Z",
  "userId": "user_uuid_admin"
}
```

**File Uploaded:**

```json
{
  "type": "file_uploaded",
  "data": {
    "fileId": "file_uuid_12345",
    "filename": "design-mockup.png",
    "originalName": "UI Design Mockup.png",
    "mimeType": "image/png",
    "size": 2048576,
    "category": "IMAGE",
    "uploaderId": "user_uuid_67890",
    "uploaderName": "John Doe",
    "projectId": "project_uuid_12345",
    "url": "/api/v1/upload/file_uuid_12345/download"
  },
  "timestamp": "2025-05-30T10:25:00.000Z",
  "projectId": "project_uuid_12345"
}
```

---

### 4. Typing Indicators

#### **typing_start** (Client → Server)

Indicate user started typing in project chat.

**Emit:**

```javascript
socket.emit("typing_start", {
  projectId: "project_uuid_12345",
});
```

#### **user_typing** (Server → Client)

Notify others that a user is typing.

```json
{
  "userId": "user_uuid_67890",
  "projectId": "project_uuid_12345",
  "timestamp": "2025-05-30T10:30:00.000Z"
}
```

#### **typing_stop** (Client → Server)

Indicate user stopped typing.

**Emit:**

```javascript
socket.emit("typing_stop", {
  projectId: "project_uuid_12345",
});
```

#### **user_stopped_typing** (Server → Client)

Notify others that a user stopped typing.

```json
{
  "userId": "user_uuid_67890",
  "projectId": "project_uuid_12345",
  "timestamp": "2025-05-30T10:30:30.000Z"
}
```

---

### 5. User Presence Tracking

#### **user_presence** (Server → Client)

Notify about user online/offline status.

**User Joined:**

```json
{
  "type": "user_presence",
  "data": {
    "userId": "user_uuid_67890",
    "action": "joined",
    "timestamp": "2025-05-30T10:00:00.000Z"
  },
  "timestamp": "2025-05-30T10:00:00.000Z",
  "projectId": "project_uuid_12345"
}
```

**User Left:**

```json
{
  "type": "user_presence",
  "data": {
    "userId": "user_uuid_67890",
    "action": "left",
    "timestamp": "2025-05-30T11:00:00.000Z"
  },
  "timestamp": "2025-05-30T11:00:00.000Z",
  "projectId": "project_uuid_12345"
}
```

---

### 6. System Information

#### **get_system_status** (Client → Server)

Request current system status.

**Emit:**

```javascript
socket.emit("get_system_status");
```

#### **system_status** (Server → Client)

System status response.

```json
{
  "onlineUsers": 15,
  "serverTime": "2025-05-30T10:35:00.000Z",
  "uptime": 86400
}
```

#### **get_project_users** (Client → Server)

Get users currently in a project room.

**Emit:**

```javascript
socket.emit("get_project_users", "project_uuid_12345");
```

#### **project_users** (Server → Client)

Project users response.

```json
{
  "projectId": "project_uuid_12345",
  "users": ["user_uuid_67890", "user_uuid_admin", "user_uuid_12345"],
  "count": 3
}
```

---

### 7. Ping/Pong for Connection Health

#### **ping** (Client → Server)

Test connection health.

**Emit:**

```javascript
socket.emit("ping");
```

#### **pong** (Server → Client)

Connection health response.

```json
{
  "timestamp": "2025-05-30T10:40:00.000Z"
}
```

---

## 🚨 Error Responses

### Validation Errors (400)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    },
    {
      "field": "password",
      "message": "Password should contain at least one lowercase letter, one uppercase letter, one number, and one special character"
    }
  ]
}
```

### Unauthorized (401)

```json
{
  "success": false,
  "message": "Invalid token",
  "error": "UNAUTHORIZED"
}
```

### Forbidden (403)

```json
{
  "success": false,
  "message": "Access denied. Admin privileges required.",
  "error": "FORBIDDEN"
}
```

### Not Found (404)

```json
{
  "success": false,
  "message": "User not found",
  "error": "NOT_FOUND"
}
```

### Conflict (409)

```json
{
  "success": false,
  "message": "Email already in use",
  "error": "CONFLICT"
}
```

---

## 📊 Rate Limiting

All API endpoints are protected by rate limiting:

- **Window**: 15 minutes
- **Max Requests**: 100 per window per IP
- **Headers**:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time

---

## 🔐 Security Headers

All responses include security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

---

## 📝 Notes

1. **JWT Token Expiry**: Access tokens expire in 1 hour, refresh tokens in 7 days
2. **Real-time Connection**: WebSocket connections are automatically cleaned up on user disconnect
3. **Role Hierarchy**: ADMIN > TEAM_LEAD > EMPLOYEE
4. **Project Access**: Users can only access projects they are members of
5. **Audit Logging**: All admin actions are logged for security compliance

---

**API Version**: v1  
**Last Updated**: May 30, 2025  
**Documentation Status**: Complete
