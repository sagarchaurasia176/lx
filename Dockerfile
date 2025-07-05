FROM node:21.5.0

WORKDIR /Backend

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the full source code, including prisma/
COPY . .

# Compile TypeScript (without Prisma generation)
RUN npm run build

EXPOSE 8000

# Generate Prisma client at runtime, then start the app
CMD ["sh", "-c", "npx prisma generate && node dist/index.js"]