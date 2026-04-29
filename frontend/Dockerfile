FROM --platform=linux/amd64 node:20-alpine AS build

WORKDIR /app

ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json package-lock.json* ./
RUN npm install

COPY . ./
RUN npm run build

FROM --platform=linux/amd64 nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3010

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3010/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
