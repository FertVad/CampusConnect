# Architecture Documentation

## 1. Overview

EduPortal is a college management system built as a full-stack web application. It enables educational institutions to manage students, teachers, schedules, curriculum plans, grades, and various administrative tasks. The system provides role-based access with different interfaces and capabilities for students, teachers, administrators, and directors.

## 2. System Architecture

The application follows a modern client-server architecture with a clear separation of concerns:

```
┌────────────────┐        ┌────────────────┐        ┌────────────────┐
│                │        │                │        │                │
│  React Client  │◄─────► │ Express Server │◄─────► │  PostgreSQL DB │
│                │        │                │        │                │
└────────────────┘        └────────────────┘        └────────────────┘
```

### 2.1. Frontend Architecture

The frontend is a single-page application (SPA) built with React and follows a component-based architecture. It uses:

- **React**: For building the user interface with a component-based approach
- **Wouter**: For client-side routing (lighter alternative to React Router)
- **React Query**: For handling server state, caching, and data fetching
- **React Hook Form**: For form state management and validation
- **TailwindCSS**: For utility-first styling
- **Shadcn UI**: For a comprehensive set of accessible UI components
- **i18n**: For internationalization

### 2.2. Backend Architecture

The backend is built with Express.js and follows a RESTful API architecture. It uses:

- **Express.js**: For handling HTTP requests and serving the API
- **Drizzle ORM**: For database operations with a type-safe query builder
- **Passport.js**: For authentication and session management
- **Multer**: For file uploads
- **Bcrypt**: For password hashing

### 2.3. Database Architecture

The application uses PostgreSQL as its primary database. The schema is managed using Drizzle ORM, which provides:

- Type-safety for database operations
- Schema migrations
- Relational data modeling
- Enum support for specialized data types

## 3. Key Components

### 3.1. Frontend Components

#### 3.1.1. Core Structure
- **App.tsx**: Entry point that configures routing
- **Main.tsx**: Configures global providers (Auth, Query Client, Theme)
- **Layout Components**: Provide consistent UI structure across pages

#### 3.1.2. Feature Modules
- **Authentication**: Login, registration, and session management
- **Dashboard**: Role-specific dashboards for different user types
- **Users Management**: CRUD operations for users
- **Schedule Management**: View and manage class schedules
- **Curriculum Planning**: Create and edit curriculum plans with visual tools
- **Tasks**: To-do management for administrators
- **Grading**: View and manage student grades
- **Documents**: Manage certificates and invoices

#### 3.1.3. State Management
- **React Query**: For server state (data fetching, caching, synchronization)
- **Context API**: For global application state (auth, theme)
- **Local component state**: For UI-specific state

### 3.2. Backend Components

#### 3.2.1. API Routes
- **Authentication Routes**: Login, logout, session management
- **User Routes**: CRUD operations for user profiles
- **Curriculum Routes**: Manage educational plans
- **Schedule Routes**: Class scheduling and calendar management
- **Document Routes**: File uploads and document management
- **Task Routes**: Administrative task tracking

#### 3.2.2. Middleware
- **Authentication Middleware**: Validates user sessions
- **Error Handling Middleware**: Centralizes error responses
- **Logging Middleware**: Tracks API usage
- **CORS Middleware**: Handles cross-origin requests

#### 3.2.3. Services
- **Storage Service**: Abstraction for database operations
- **Auth Service**: Handles user authentication and authorization
- **CSV and Google Sheets Helpers**: Import data from external sources

### 3.3. Database Models

The application uses a relational database model with the following key entities:

- **Users**: Student, teacher, admin, and director profiles
- **Subjects**: Academic courses and classes
- **Schedule Items**: Timetable entries for classes
- **Curriculum Plans**: Educational roadmaps
- **Assignments**: Student tasks and homework
- **Grades**: Student performance records
- **Documents**: Certificates, invoices, and other official documents
- **Requests**: Student or teacher administrative requests
- **Tasks**: Administrative to-do items
- **Activity Logs**: System audit trail

## 4. Data Flow

### 4.1. Authentication Flow

1. User enters credentials on the login page
2. Client sends credentials to `/api/auth/login` endpoint
3. Server validates credentials against hashed passwords in the database
4. On success, server creates a session and returns user data
5. Client stores user context and redirects to the appropriate dashboard
6. Subsequent requests include session cookies for authentication

### 4.2. CRUD Operations Flow

1. Client fetches data using React Query hooks
2. Server authenticates the request using session data
3. Server authorizes the action based on the user's role
4. Server interacts with the database using Drizzle ORM
5. Server returns the response, which React Query caches on the client
6. UI updates to reflect the new data state

### 4.3. File Upload Flow

1. User selects files using the file input component
2. Client uploads files to the server using multipart form data
3. Server processes the upload with Multer middleware
4. Files are stored in the `uploads` directory
5. Server creates database records with file metadata
6. Client receives confirmation and updates the UI

## 5. External Dependencies

### 5.1. Frontend Dependencies

- **React**: UI component library
- **TailwindCSS**: Utility-first CSS framework
- **Shadcn UI**: UI component collection
- **React Query**: Data fetching and caching
- **React Hook Form**: Form management
- **Zod**: Schema validation
- **date-fns**: Date manipulation
- **Lucide Icons**: SVG icon library
- **dnd-kit**: Drag and drop functionality

### 5.2. Backend Dependencies

- **Express**: Web framework
- **Drizzle ORM**: Database ORM
- **Passport**: Authentication
- **Bcrypt**: Password hashing
- **Multer**: File upload handling
- **Neon Database SDK**: PostgreSQL serverless connector
- **CSV-Parser**: CSV file processing
- **iconv-lite**: Character encoding conversion
- **ws**: WebSocket implementation

### 5.3. Development Dependencies

- **TypeScript**: Static typing
- **Vite**: Frontend build tool
- **ESBuild**: Backend build tool
- **tsx**: TypeScript execution

## 6. Deployment Strategy

The application is configured for deployment on Replit, with specific considerations:

### 6.1. Build Process

1. The frontend is built using Vite: `vite build`
2. The backend is built using ESBuild: `esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist`
3. Both are configured in the `build.sh` script

### 6.2. Runtime Configuration

- **Development**: `npm run dev` starts both client and server with hot reloading
- **Production**: `npm run start` runs the bundled application from the `dist` directory

### 6.3. Database Connection

- The application connects to a PostgreSQL database using the `DATABASE_URL` environment variable
- For development, it can use Replit's built-in PostgreSQL database
- For production, it supports Neon Database's serverless PostgreSQL

### 6.4. File Storage

- Uploaded files are stored in the `uploads` directory
- The application supports CSV imports for schedule data
- Production deployments should consider using cloud storage solutions for scalability

## 7. Security Considerations

### 7.1. Authentication

- Uses session-based authentication with HTTP-only cookies
- Passwords are hashed using bcrypt
- Sessions are stored in MemoryStore (for development) or in the database (for production)

### 7.2. Authorization

- Role-based access control (RBAC) system with four roles: student, teacher, admin, director
- Each API endpoint validates appropriate permissions
- UI components are conditionally rendered based on the user's role

### 7.3. Data Validation

- All input data is validated using Zod schemas
- Frontend forms use React Hook Form with Zod integration
- Backend routes validate request bodies against shared schemas

## 8. Scalability Considerations

The application architecture supports scaling in several ways:

- **Stateless backend**: Enables horizontal scaling of server instances
- **Database abstraction**: The storage interface can be implemented for different database solutions
- **Modular design**: Features are encapsulated in their own components and routes
- **Shared validation schemas**: Ensuring data consistency between client and server