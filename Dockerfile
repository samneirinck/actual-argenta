FROM mcr.microsoft.com/playwright:v1.58.2-noble

ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99
ENV PORT=3000

RUN apt-get update && apt-get install -y \
    xvfb \
    x11vnc \
    fluxbox \
    novnc \
    websockify \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

RUN mkdir -p /app/data/movements && chown -R pwuser:pwuser /app

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

USER pwuser

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]

