FROM node:22-alpine AS build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY frontend/ ./

# Vercel 배포에서는 대시보드의 VITE_API_BASE_URL이 EC2 백엔드 주소를 가리킵니다.
# 이 Dockerfile은 자체 호스팅이 필요할 때만 사용합니다.
ARG VITE_API_BASE_URL=
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_GOOGLE_ALLOWED_ORIGINS=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_GOOGLE_ALLOWED_ORIGINS=${VITE_GOOGLE_ALLOWED_ORIGINS}

RUN npm run build

FROM nginx:1.27-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
