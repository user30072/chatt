FROM node:18-alpine

WORKDIR /app

# Copy all files first
COPY . .

# Check if prisma directory exists
RUN if [ ! -d "./prisma" ]; then echo "Prisma directory not found!"; mkdir -p ./prisma; fi

# Create minimal valid schema if none exists (will be overwritten by the real one)
RUN if [ ! -f "./prisma/schema.prisma" ]; then \
    echo "Creating minimal valid schema for build"; \
    echo 'generator client { provider = "prisma-client-js" }' > ./prisma/schema.prisma; \
    echo 'datasource db { provider = "postgresql" url = env("DATABASE_URL") }' >> ./prisma/schema.prisma; \
    fi

# Clean install dependencies
RUN npm ci --omit=dev

# Verify Prisma schema exists
RUN ls -la prisma/

# Generate Prisma client explicitly
RUN npx prisma generate

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV RAILWAY_ENVIRONMENT=true

# Expose the port
EXPOSE 3001

# Start the app
CMD ["npm", "start"] 