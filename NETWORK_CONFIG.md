# 🌐 Fuchsio Backend - Network Configuration for Frontend Developers

## 📍 **Server Network Details**

### **Current Server Configuration**

- **IP Address**: `192.168.1.2`
- **Port**: `3000`
- **Status**: ✅ **ACTIVE** (confirmed listening on port 3000)

---

## 🔗 **Base URLs**

### **For Production/Team Use**

```bash
# Primary API Base URL
export REACT_APP_API_BASE_URL="http://192.168.1.2:3000/api/v1"

# WebSocket Base URL
export REACT_APP_WEBSOCKET_URL="ws://192.168.1.2:3000"
```

### **For Local Development**

```bash
# Local API Base URL
export REACT_APP_API_BASE_URL="http://localhost:3000/api/v1"

# Local WebSocket URL
export REACT_APP_WEBSOCKET_URL="ws://localhost:3000"
```

---

## ⚙️ **Frontend Configuration Examples**

### **React/Next.js (.env.local)**

```env
# Network-accessible backend
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.2:3000/api/v1
NEXT_PUBLIC_WEBSOCKET_URL=ws://192.168.1.2:3000

# Alternative for local development
# NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
# NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3000
```

### **Vue.js (.env)**

```env
VUE_APP_API_BASE_URL=http://192.168.1.2:3000/api/v1
VUE_APP_WEBSOCKET_URL=ws://192.168.1.2:3000
```

### **Angular (environment.ts)**

```typescript
export const environment = {
  production: false,
  apiBaseUrl: "http://192.168.1.2:3000/api/v1",
  websocketUrl: "ws://192.168.1.2:3000",
};
```

### **Mobile Development (React Native/Flutter)**

```javascript
// React Native
const Config = {
  API_BASE_URL: 'http://192.168.1.2:3000/api/v1',
  WEBSOCKET_URL: 'ws://192.168.1.2:3000'
};

// Flutter
const String apiBaseUrl = 'http://192.168.1.2:3000/api/v1';
const String websocketUrl = 'ws://192.168.1.2:3000';
```

---

## 🔒 **Authentication Headers**

### **Required Headers for API Requests**

```javascript
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${jwtToken}`,
  Accept: "application/json",
};
```

### **WebSocket Authentication**

```javascript
const socket = io("ws://192.168.1.2:3000", {
  auth: {
    token: jwtToken, // or use headers: { authorization: `Bearer ${jwtToken}` }
  },
});
```

---

## 🛠️ **Testing Connection**

### **Quick Health Check**

```bash
# Test API connectivity
curl http://192.168.1.2:3000/health

# Test root endpoint
curl http://192.168.1.2:3000/
```

### **Expected Response**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "development"
}
```

---

## 🚀 **Available Endpoints**

### **Core API Routes**

- **Authentication**: `POST /api/v1/auth/login`
- **Users**: `GET /api/v1/users/`
- **Projects**: `GET /api/v1/projects/`
- **Messages**: `GET /api/v1/messages/`
- **Time Tracking**: `GET /api/v1/timetracking/`

### **Monitoring & Debug**

- **Health Check**: `GET /health`
- **Server Info**: `GET /`
- **Metrics**: `GET /api/v1/monitoring/metrics`
- **Dashboard**: `GET /status-monitor` (development only)

---

## 🔧 **CORS Configuration**

The backend accepts requests from:

- `http://localhost:3000`
- `http://localhost:5173` (Vite dev server)
- Custom origins via `ALLOWED_ORIGINS` environment variable

### **If CORS Issues Occur**

Contact the backend team to add your frontend URL to the allowed origins list.

---

## 📱 **Network Requirements**

### **Same Network Access**

- Both frontend and backend must be on the same network (192.168.1.x)
- Firewall should allow connections on port 3000
- No VPN or proxy conflicts

### **Mobile Device Testing**

- Ensure mobile device is connected to the same Wi-Fi network
- Use the IP address `192.168.1.2:3000` instead of `localhost`

---

## ⚡ **WebSocket Real-time Features**

### **Connection Setup**

```javascript
import io from "socket.io-client";

const socket = io("ws://192.168.1.2:3000", {
  auth: { token: userJwtToken },
  autoConnect: true,
});

// Listen for connection
socket.on("connected", (data) => {
  console.log("Connected to Fuchsio real-time service:", data);
});
```

### **Available Real-time Events**

- Project notifications
- User presence tracking
- Typing indicators
- System status updates
- Real-time messaging

---

## 🆘 **Troubleshooting**

### **Connection Failed**

1. ✅ Check if backend server is running: `netstat -an | findstr :3000`
2. ✅ Verify IP address: `ipconfig`
3. ✅ Test with curl: `curl http://192.168.1.2:3000/health`
4. ✅ Check firewall settings
5. ✅ Ensure same network connectivity

### **CORS Errors**

- Add your frontend URL to `ALLOWED_ORIGINS` in backend `.env`
- Restart backend server after environment changes

### **WebSocket Issues**

- Verify JWT token is valid and not expired
- Check browser developer tools for WebSocket errors
- Ensure proper authentication headers

---

## 📞 **Contact Backend Team**

If you encounter issues:

1. Share the exact error message
2. Provide your frontend configuration
3. Confirm network connectivity with health check
4. Include browser/tool version information

**Server IP**: `192.168.1.2:3000`  
**Status**: 🟢 **ONLINE** (Last checked: ${new Date().toISOString()})
