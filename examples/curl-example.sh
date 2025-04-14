#!/bin/bash
# Thor.AI API 代理 - curl 示例
# 这个示例展示了如何使用 curl 连接到 Thor.AI API 代理。

# 替换为您的 Thor.AI API 代理 URL
API_BASE="https://thor-proxy.<your-subdomain>.workers.dev"

# 设置提示（可以从命令行参数获取）
PROMPT=${1:-"你好，请用中文介绍一下自己，并解释一下量子计算的基本原理。"}

# 设置模型
MODEL=${2:-"openai/gpt-4o"}

echo "发送请求到: $API_BASE"
echo "模型: $MODEL"
echo "提示: $PROMPT"
echo ""
echo "发送请求..."

# 发送请求
curl -s "$API_BASE/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"$MODEL\",
    \"messages\": [
      {
        \"role\": \"user\",
        \"content\": \"$PROMPT\"
      }
    ]
  }" | jq .choices[0].message.content

echo ""
echo "请求完成。"
