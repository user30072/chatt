FROM node:18-alpine AS base

# Build args that can be passed from Railway
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_FRONTEND_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID

# Set as environment variables for the build
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_FRONTEND_URL=${NEXT_PUBLIC_FRONTEND_URL}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
# Install dependencies with npm install (not npm ci)
RUN npm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Re-declare build args for this stage
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_FRONTEND_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID

# Set as environment variables
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_FRONTEND_URL=${NEXT_PUBLIC_FRONTEND_URL}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}

# Copy node modules and other files
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set up build directories
RUN mkdir -p src/widget/dist public/widget

# Do not create .eslintignore file - using eslint.config.mjs instead

# Fix any import issues before building
RUN node verify-imports.js

# Build widget
RUN cd src/widget && npx webpack || echo "Widget build failed, continuing..."

# Copy widget to public
RUN if [ -f "src/widget/dist/widget.js" ]; then \
      cp -f src/widget/dist/widget.js public/widget/; \
    else \
      echo "Widget not found, creating empty file..."; \
      touch public/widget/widget.js; \
    fi

# Build Next.js with proper environment variables
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Clear any existing build cache
RUN rm -rf .next

# Print environment variables during build for debugging
RUN echo "Building with environment variables:"
RUN echo "NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL"
RUN echo "NEXT_PUBLIC_FRONTEND_URL: $NEXT_PUBLIC_FRONTEND_URL"
RUN echo "PRIMARY_BACKEND_URL: $PRIMARY_BACKEND_URL"
RUN echo "BACKUP_BACKEND_URL: $BACKUP_BACKEND_URL"

# Run the build command
RUN npm run build

# Check if standalone directory was created
RUN ls -la .next || echo "No .next directory"
RUN if [ -d ".next/standalone" ]; then echo "Standalone directory exists"; else echo "ERROR: Standalone directory not found"; exit 1; fi

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create a script to print environment variables and start the server
RUN echo '#!/bin/sh' > ./start.sh && \
    echo 'echo "Server starting with environment:"' >> ./start.sh && \
    echo 'echo "NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL"' >> ./start.sh && \
    echo 'echo "NEXT_PUBLIC_FRONTEND_URL: $NEXT_PUBLIC_FRONTEND_URL"' >> ./start.sh && \
    echo 'echo "PRIMARY_BACKEND_URL: $PRIMARY_BACKEND_URL"' >> ./start.sh && \
    echo 'echo "BACKUP_BACKEND_URL: $BACKUP_BACKEND_URL"' >> ./start.sh && \
    echo 'node server.js' >> ./start.sh && \
    chmod +x ./start.sh

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Use the start script instead of direct node command
CMD ["./start.sh"] 