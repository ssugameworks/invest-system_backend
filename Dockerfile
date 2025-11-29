# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Verify dist folder exists
RUN ls -la dist/

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Verify dist folder is copied
RUN ls -la && ls -la dist/

# Expose port (Railway will override this)
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start:prod"]

