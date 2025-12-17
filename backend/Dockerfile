FROM node:20-alpine

WORKDIR /app

# Native build deps for hnswlib-node (node-gyp)
RUN apk add --no-cache python3 make g++ \
  && ln -sf python3 /usr/bin/python

# Install deps first (better caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the backend
COPY . .

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]
