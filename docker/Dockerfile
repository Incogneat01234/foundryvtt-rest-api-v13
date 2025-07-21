FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy server files
COPY server.js ./
COPY lib/ ./lib/

# Expose port
EXPOSE 8080

# Run the server
CMD ["node", "server.js"]