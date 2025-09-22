# 初期構築
## dockerでSurrealDBを立てる
```bash
docker run -d \
  --name surrealdb-dev \
  -p 8000:8000 \
  -v surreal_data:/data \
  docker.io/surrealdb/surrealdb:latest \
  start --log=trace --user=root --pass=root --bind=0.0.0.0:8000 memory
```

## Next.jsプロジェクトを作成
```bash
npx create-next-app@latest surrealdb-chat-app --typescript --tailwind --eslint
```
```bash
cd surrealdb-chat-app
```

## 依存関係をインストール
```bash
npm install date-fns
npm install --save surrealdb
```

## 構造構築
```bash
mkdir lib components
``` 