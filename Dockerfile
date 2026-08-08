FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY index.html ./
COPY 404.html ./
COPY robots.txt ./
COPY sitemap.xml ./
COPY assets ./assets
EXPOSE 3000
CMD ["npm", "start"]
