# Fuchsio Backend API

A fresh Express.js backend API project with modern best practices and security features.

## Features

- ⚡ Express.js framework
- 🔒 Security middleware (Helmet, CORS, Rate Limiting)
- 📝 Request logging with Morgan
- 🗜️ Response compression
- 🌍 Environment variable management
- 📁 Organized project structure
- 🔧 ESLint for code quality

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Start the development server:

```bash
npm run dev
```

The server will start at `http://localhost:3000`

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## API Endpoints

### Base URLs

- Health Check: `GET /health`
- API Base: `GET /api/v1`

### Authentication Routes

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/me` - Get current user profile

### User Routes

- `PUT /api/v1/users/profile` - Update own profile
- `POST /api/v1/users` - Create new user (Admin)
- `PUT /api/v1/users/:id` - Update user (Admin/Team Lead)
- `DELETE /api/v1/users/:id` - Delete user (Admin)
- `GET /api/v1/users/stats` - Get user statistics (Admin)

## Project Structure

```
src/
├── middleware/         # Custom middleware
├── routes/            # API routes
├── utils/             # Utility functions
└── server.js          # Main server file
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window

## Security Features

- **Helmet** - Sets various HTTP headers
- **CORS** - Cross-Origin Resource Sharing
- **Rate Limiting** - Prevents abuse
- **Input Validation** - Request validation
- **Error Handling** - Secure error responses

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License
