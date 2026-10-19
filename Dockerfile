FROM node:22-alpine

WORKDIR /app

# Native SQLite and Node dependencies
COPY package.json ./
COPY schema.sql ./
COPY database.js ./
COPY qr-backend.js ./
COPY student-backend.js ./
COPY server.js ./
COPY js ./js
COPY css ./css
COPY assets ./assets
COPY index.html ./
COPY student.html ./
COPY checkin.html ./

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["node", "server.js"]
