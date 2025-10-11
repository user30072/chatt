FROM node:18-alpine

WORKDIR /app

# Install minimal production tools and PostgreSQL client for database operations
RUN apk add --no-cache curl postgresql-client postgresql-dev g++ make python3 bash openssl

# Copy package files for layer caching
COPY package*.json ./

# Install dependencies 
RUN npm install --production

# Copy Prisma schema first (for layer caching)
COPY prisma ./prisma/

# Generate Prisma client with pgvector URL
RUN npx prisma generate

# Copy application files
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose the port
EXPOSE 5000

# Create startup script with retry mechanism
RUN echo '#!/bin/bash\n\
# Run deploy script with retries\n\
MAX_RETRIES=5\n\
RETRY_COUNT=0\n\
\n\
echo "Starting deployment process..."\n\
\n\
# Ensure both database URLs are set\n\
if [ -z "$DATABASE_URL" ] || [ -z "$PGVECTOR_URL" ]; then\n\
  echo "ERROR: Both DATABASE_URL and PGVECTOR_URL must be set"\n\
  exit 1\n\
fi\n\
\n\
# Regenerate Prisma client to ensure it matches the current schema\n\
echo "Regenerating Prisma client..."\n\
DATABASE_URL=$PGVECTOR_URL npx prisma generate\n\
\n\
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do\n\
  echo "Attempt $(($RETRY_COUNT + 1)) of $MAX_RETRIES to run deployment script"\n\
  node scripts/deploy.js && break\n\
  RETRY_COUNT=$(($RETRY_COUNT + 1))\n\
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then\n\
    echo "Failed to run deployment script after $MAX_RETRIES attempts"\n\
    exit 1\n\
  fi\n\
  echo "Retrying in 5 seconds..."\n\
  sleep 5\n\
done\n\
\n\
# Start the server\n\
echo "Starting server..."\n\
node index.js' > /app/start.sh && chmod +x /app/start.sh

# Start the server with deploy script first
CMD ["/app/start.sh"] 