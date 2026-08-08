FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY index.html ./
COPY 404.html ./
COPY robots.txt ./
COPY sitemap.xml ./
COPY stroitelstvo-domov-pod-klyuch ./stroitelstvo-domov-pod-klyuch
COPY stoimost-stroitelstva-doma ./stoimost-stroitelstva-doma
COPY proektirovanie-domov ./proektirovanie-domov
COPY generalnyj-podryad ./generalnyj-podryad
COPY assets ./assets
EXPOSE 3000
CMD ["npm", "start"]
