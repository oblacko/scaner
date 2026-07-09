# Sentinel Security Monitor — Full Stack Docker
#
# Multi-stage build:
#  1. Fetch pre-built Nuclei CLI
#  2. Node stage — builds frontend
#  3. Runtime — serves everything

# --- Stage 1: Fetch Nuclei CLI ---
FROM alpine:3.21 AS nuclei-builder
ARG NUCLEI_VERSION=3.11.0
RUN apk add --no-cache wget unzip ca-certificates
RUN ARCH=$(uname -m); \
    case "$ARCH" in \
      x86_64) ARCH=amd64 ;; \
      aarch64) ARCH=arm64 ;; \
      *) echo "Unsupported architecture: $ARCH"; exit 1 ;; \
    esac && \
    wget -q "https://github.com/projectdiscovery/nuclei/releases/download/v${NUCLEI_VERSION}/nuclei_${NUCLEI_VERSION}_linux_${ARCH}.zip" -O /tmp/nuclei.zip && \
    unzip /tmp/nuclei.zip -d /usr/local/bin && \
    chmod +x /usr/local/bin/nuclei && \
    rm /tmp/nuclei.zip && \
    nuclei -update-templates

# --- Stage 2: Build Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Stage 3: Production Runtime ---
FROM node:20-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache ca-certificates

# Copy Nuclei binary + templates
COPY --from=nuclei-builder /usr/local/bin/nuclei /usr/local/bin/nuclei
COPY --from=nuclei-builder /root/nuclei-templates /root/nuclei-templates

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Copy server (CommonJS). better-sqlite3 is a native module — build it from
# source (no musl prebuilds), then drop the toolchain to keep the image small.
COPY server/ ./server/
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && cd server && npm install --build-from-source \
    && apk del .build-deps

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL=/data/sentinel.db
ENV DATA_DIR=/data
ENV NUCLEI_TEMPLATES=/root/nuclei-templates

VOLUME ["/data"]
EXPOSE 3001

CMD ["node", "server/index.js"]
