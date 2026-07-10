FROM node:18-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制项目文件
COPY package*.json ./
RUN npm install 2>/dev/null || true

COPY . .

# 暴露端口
EXPOSE 7860

# 启动脚本
CMD ["node", "server.js"]
