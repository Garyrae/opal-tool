FROM node:18-alpine

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Install dependencies
COPY package*.json ./
COPY tsconfig.json ./

# Switch back to app directory
WORKDIR /app

# Install app dependencies
RUN npm install

# Copy application code
COPY src ./src

# Build the app
RUN npm run build

# Expose port
EXPOSE 3000

# Run the application
CMD ["node", "dist/index.js"]