FROM nginx:alpine

# 既定の nginx 設定を上書き（login.html を既定ページにする）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 静的ファイルを配信ルートへコピー。
# .dockerignore で data/staff.csv をビルドコンテキストから除外しているため
# 機密ファイルはイメージに含まれない。
COPY login.html index.html admin.html /usr/share/nginx/html/
COPY data/ /usr/share/nginx/html/data/

EXPOSE 80
