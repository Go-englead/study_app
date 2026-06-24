FROM node:22-alpine

WORKDIR /app

# 依存だけ先にインストールしてレイヤーキャッシュを効かせる
COPY package.json ./
RUN npm install

# API ソースをコピー
COPY . .

EXPOSE 3000

CMD ["npm", "run", "start"]
