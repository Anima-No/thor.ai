# Thor.AI API 代理部署和使用指南

本文档提供了 Thor.AI API 代理的详细部署和使用指南，包括初始设置、配置选项、故障排除和高级用法。

## 目录

- [部署指南](#部署指南)
  - [前提条件](#前提条件)
  - [步骤 1：准备环境](#步骤-1准备环境)
  - [步骤 2：配置项目](#步骤-2配置项目)
  - [步骤 3：设置 API 密钥](#步骤-3设置-api-密钥)
  - [步骤 4：部署到 Cloudflare Workers](#步骤-4部署到-cloudflare-workers)
  - [步骤 5：验证部署](#步骤-5验证部署)
- [使用指南](#使用指南)
  - [基本用法](#基本用法)
  - [与 Ollama 集成](#与-ollama-集成)
  - [与其他工具集成](#与其他工具集成)
- [配置选项](#配置选项)
  - [默认模型](#默认模型)
  - [CORS 设置](#cors-设置)
  - [自定义域名](#自定义域名)
- [故障排除](#故障排除)
  - [常见错误](#常见错误)
  - [日志和监控](#日志和监控)
- [高级用法](#高级用法)
  - [流式响应](#流式响应)
  - [速率限制](#速率限制)
  - [多区域部署](#多区域部署)

## 部署指南

### 前提条件

在开始部署之前，请确保您已准备好以下内容：

- [Node.js](https://nodejs.org/) (v16 或更高版本)
- [npm](https://www.npmjs.com/) 或 [yarn](https://yarnpkg.com/)
- [Cloudflare 账户](https://dash.cloudflare.com/sign-up)
- [OpenRouter API 密钥](https://openrouter.ai/keys)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### 步骤 1：准备环境

1. 安装 Wrangler CLI：
   ```bash
   npm install -g wrangler
   ```

2. 登录到 Cloudflare 账户：
   ```bash
   wrangler login
   ```

3. 克隆项目仓库（如果适用）：
   ```bash
   git clone https://github.com/yourusername/thor-proxy.git
   cd thor-proxy
   ```

4. 安装依赖：
   ```bash
   npm install
   ```

### 步骤 2：配置项目

1. 检查 `wrangler.jsonc` 文件，确保配置正确：
   ```jsonc
   {
     "$schema": "node_modules/wrangler/config-schema.json",
     "name": "thor-proxy",
     "main": "src/index.js",
     "compatibility_date": "2025-04-14",
     "observability": {
       "enabled": true
     },
     "vars": {
       "OPENROUTER_API_KEY": ""
     }
   }
   ```

2. 如果需要，修改 `src/index.js` 中的配置：
   ```javascript
   const config = {
     openRouter: {
       baseUrl: 'https://openrouter.ai/api/v1',
     },
     defaultModel: 'openai/gpt-4o'  // 修改为您想要的默认模型
   };
   ```

### 步骤 3：设置 API 密钥

使用 Wrangler 设置 OpenRouter API 密钥：

```bash
wrangler secret put OPENROUTER_API_KEY
```

在提示中输入您的 OpenRouter API 密钥。这样可以安全地存储密钥，而不是将其硬编码在配置文件中。

### 步骤 4：部署到 Cloudflare Workers

运行以下命令部署您的 Worker：

```bash
npm run deploy
```

或者直接使用 Wrangler：

```bash
wrangler deploy
```

部署成功后，您将看到类似以下的输出：

```
Deployed thor-proxy to https://thor-proxy.<your-subdomain>.workers.dev
```

记下这个 URL，您将使用它来访问您的 API 代理。

### 步骤 5：验证部署

使用 curl 测试您的 API 代理是否正常工作：

```bash
curl https://thor-ai.chat/health
```

应该返回：

```json
{"status":"ok"}
```

然后测试聊天完成 API：

```bash
curl https://thor-ai.chat/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o",
    "messages": [
      {
        "role": "user",
        "content": "你好"
      }
    ]
  }'
```

如果一切正常，您应该收到来自 AI 模型的响应。

## 使用指南

### 基本用法

#### 使用 curl

```bash
curl https://thor-ai.chat/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o",
    "messages": [
      {
        "role": "user",
        "content": "你好，请介绍一下自己"
      }
    ]
  }'
```

#### 使用 Python

```python
from openai import OpenAI

client = OpenAI(
  base_url='https://thor-ai.chat/v1',
  api_key='your-openrouter-api-key'  # 使用您的 OpenRouter API 密钥
)

response = client.chat.completions.create(
  model="openai/gpt-4o",
  messages=[
    {"role": "user", "content": "你好，请介绍一下自己"}
  ]
)
print(response.choices[0].message.content)
```

#### 使用 JavaScript

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://thor-ai.chat/v1',
  apiKey: 'your-openrouter-api-key',  // 使用您的 OpenRouter API 密钥
});

const completion = await openai.chat.completions.create({
  model: 'openai/gpt-4o',
  messages: [{ role: 'user', content: '你好，请介绍一下自己' }],
});

console.log(completion.choices[0].message.content);
```

### 与 Ollama 集成

#### 设置环境变量

```bash
# Windows (PowerShell)
$env:OPENAI_API_BASE="https://thor-ai.chat/v1"
$env:OPENAI_API_KEY="your-openrouter-api-key"

# Linux/macOS
export OPENAI_API_BASE="https://thor-ai.chat/v1"
export OPENAI_API_KEY="your-openrouter-api-key"
```

#### 使用 Ollama 命令行

```bash
ollama run openai/gpt-4o "解释量子力学的基本原理"
```

#### 创建模型别名

您可以在 Ollama 中创建模型别名，指向特定的 OpenRouter 模型：

1. 创建 Modelfile：
   ```
   # 文件名：Modelfile
   FROM openai/gpt-4o
   ```

2. 创建模型：
   ```bash
   ollama create openrouter-gpt4o -f Modelfile
   ```

3. 使用模型：
   ```bash
   ollama run openrouter-gpt4o "解释量子力学的基本原理"
   ```

### 与其他工具集成

#### 与 LangChain 集成

```python
from langchain.chat_models import ChatOpenAI
from langchain.schema import HumanMessage

chat = ChatOpenAI(
    model="openai/gpt-4o",
    openai_api_base="https://thor-ai.chat/v1",
    openai_api_key="your-openrouter-api-key"
)

response = chat([HumanMessage(content="你好，请介绍一下自己")])
print(response.content)
```

#### 与 LlamaIndex 集成

```python
from llama_index.llms import OpenAI

llm = OpenAI(
    model="openai/gpt-4o",
    api_base="https://thor-ai.chat/v1",
    api_key="your-openrouter-api-key"
)

response = llm.complete("你好，请介绍一下自己")
print(response.text)
```

## 配置选项

### 默认模型

您可以在 `src/index.js` 文件中修改默认模型：

```javascript
const config = {
  openRouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
  },
  defaultModel: 'anthropic/claude-3-opus'  // 修改为您想要的默认模型
};
```

修改后，重新部署 Worker：

```bash
npm run deploy
```

### CORS 设置

默认情况下，API 代理允许来自任何域的跨域请求。如果您想限制特定域，可以修改 `src/index.js` 中的 `corsHeaders`：

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-domain.com',  // 限制特定域
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};
```

### 自定义域名

本项目已配置使用自定义域名 `thor-ai.chat`。如果您想使用自己的域名，请按照以下步骤操作：

1. 在 Cloudflare Dashboard 中添加您的域名（如果尚未添加）。
2. 在 `wrangler.jsonc` 文件中修改域名配置：
   ```jsonc
   "routes": [
     { "pattern": "your-domain.com/*", "zone_name": "your-domain.com" }
   ],
   ```
3. 重新部署 Worker：
   ```bash
   npm run deploy
   ```
4. 在 Cloudflare Dashboard 中的 Workers 部分，确认域名已正确配置。

## 故障排除

### 常见错误

#### 401 Unauthorized

如果您收到 401 错误，可能是因为：
- OpenRouter API 密钥无效或已过期
- 环境变量未正确设置

解决方法：
```bash
wrangler secret put OPENROUTER_API_KEY
# 输入有效的 API 密钥
```

#### 404 Not Found

如果您收到 404 错误，可能是因为：
- URL 路径不正确
- Worker 未正确部署

解决方法：
- 确保使用正确的 URL 路径（例如 `/v1/chat/completions`）
- 重新部署 Worker：`npm run deploy`

#### 超时错误

如果请求超时，可能是因为：
- OpenRouter 服务响应慢
- 请求的模型处理时间长

解决方法：
- 尝试使用不同的模型
- 减少请求的复杂性

### 日志和监控

您可以在 Cloudflare Dashboard 中查看 Worker 的日志和性能指标：

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 导航到 Workers & Pages
3. 选择您的 Worker
4. 点击"日志"选项卡查看实时日志
5. 点击"指标"选项卡查看性能指标

## 高级用法

### 流式响应

要使用流式响应，在请求中添加 `stream: true` 参数：

```javascript
const completion = await openai.chat.completions.create({
  model: 'openai/gpt-4o',
  messages: [{ role: 'user', content: '你好，请介绍一下自己' }],
  stream: true,
});

for await (const chunk of completion) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

### 速率限制

如果您想为您的 API 代理添加速率限制，可以使用 Cloudflare Workers 的 [Rate Limiting API](https://developers.cloudflare.com/workers/runtime-apis/rate-limiting/)。

### 多区域部署

Cloudflare Workers 默认在全球边缘网络上部署，提供低延迟访问。如果您想优化特定区域的性能，可以考虑使用 [Cloudflare Workers 的区域设置](https://developers.cloudflare.com/workers/configuration/regions/)。

---

如果您有任何问题或需要进一步的帮助，请提交 GitHub Issue 或联系项目维护者。
