# Thor.AI API 代理

Thor.AI API 代理是一个轻量级的 API 代理服务，它允许您通过 OpenRouter 使用 OpenAI 兼容的 API。这个代理服务部署在 Cloudflare Workers 上，提供全球低延迟访问。

## 功能特点

- 完全兼容 OpenAI API 格式
- 通过 OpenRouter 访问多种 AI 模型
- 支持流式响应
- 全球边缘网络部署，低延迟
- 简单易用，无需复杂配置
- 可与 Ollama 等工具无缝集成

## 快速开始

### 使用 API

API 端点：`https://thor-proxy.<your-subdomain>.workers.dev/v1`

#### 使用 curl

```bash
curl https://thor-proxy.<your-subdomain>.workers.dev/v1/chat/completions \
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
  base_url='https://thor-proxy.<your-subdomain>.workers.dev/v1',
  api_key='any-value',  # 可以是任何值，因为验证由 OpenRouter 处理
)

response = client.chat.completions.create(
  model="openai/gpt-4o",  # 可以省略，将使用默认模型
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
  baseURL: 'https://thor-proxy.<your-subdomain>.workers.dev/v1',
  apiKey: 'any-value',  // 可以是任何值，因为验证由 OpenRouter 处理
});

const completion = await openai.chat.completions.create({
  model: 'openai/gpt-4o',  // 可以省略，将使用默认模型
  messages: [{ role: 'user', content: '你好，请介绍一下自己' }],
});

console.log(completion.choices[0].message.content);
```

### 与 Ollama 集成

要将此 API 代理与 Ollama 集成，请设置以下环境变量：

```bash
# Windows (PowerShell)
$env:OPENAI_API_BASE="https://thor-proxy.<your-subdomain>.workers.dev/v1"
$env:OPENAI_API_KEY="any-value"

# Linux/macOS
export OPENAI_API_BASE="https://thor-proxy.<your-subdomain>.workers.dev/v1"
export OPENAI_API_KEY="any-value"
```

然后，您可以像使用普通 Ollama 模型一样使用 OpenRouter 的模型：

```bash
ollama run openai/gpt-4o "解释量子力学的基本原理"
```

## 支持的模型

Thor.AI API 代理支持 OpenRouter 上的所有模型，包括但不限于：

- `openai/gpt-4o`
- `openai/gpt-4-turbo`
- `openai/gpt-3.5-turbo`
- `anthropic/claude-3-opus`
- `anthropic/claude-3-sonnet`
- `anthropic/claude-3-haiku`
- `meta-llama/llama-3-70b-instruct`
- `mistral/mistral-large`

完整的模型列表请参考 [OpenRouter 模型页面](https://openrouter.ai/models)。

## 自行部署

如果您想自行部署此 API 代理，请按照以下步骤操作：

### 前提条件

- [Node.js](https://nodejs.org/) (v16 或更高版本)
- [npm](https://www.npmjs.com/) 或 [yarn](https://yarnpkg.com/)
- [Cloudflare 账户](https://dash.cloudflare.com/sign-up)
- [OpenRouter API 密钥](https://openrouter.ai/keys)

### 部署步骤

1. 克隆此仓库：
   ```bash
   git clone https://github.com/yourusername/thor-proxy.git
   cd thor-proxy
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 配置 OpenRouter API 密钥：
   ```bash
   wrangler secret put OPENROUTER_API_KEY
   # 在提示中输入您的 OpenRouter API 密钥
   ```

4. 部署到 Cloudflare Workers：
   ```bash
   npm run deploy
   ```

5. 部署完成后，您将获得一个 `*.workers.dev` 域名，可以用于访问您的 API 代理。

### 自定义配置

您可以通过修改 `src/index.js` 文件中的 `config` 对象来自定义配置：

```javascript
const config = {
  openRouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
  },
  defaultModel: 'openai/gpt-4o'  // 修改默认模型
};
```

## API 端点

- `/v1/chat/completions` - OpenAI 兼容的聊天完成 API
- `/v1/api/chat` - Ollama 兼容的聊天 API
- `/v1/api/tags` - 获取可用模型列表（用于客户端的模型选择器）
- `/health` - 健康检查端点
- `/` - API 信息

## 注意事项

- 此 API 代理使用您的 OpenRouter API 密钥，所有请求都会计入您的 OpenRouter 配额。
- 默认模型设置为 `openai/gpt-4o`，您可以在请求中指定其他模型。
- API 密钥存储在 Cloudflare Workers 的环境变量中，不会暴露给客户端。

## 常见问题

### 如何更改默认模型？

修改 `src/index.js` 文件中的 `defaultModel` 配置项，然后重新部署。

### 如何处理流式响应？

API 代理支持流式响应，您可以在请求中设置 `stream: true` 参数：

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

### 如何设置自定义域名？

您可以在 Cloudflare Dashboard 中为您的 Worker 设置自定义域名。请参考 [Cloudflare 文档](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)。

### 如何获取可用模型列表？

您可以使用 `/v1/api/tags` 端点获取可用模型列表，这对于需要在客户端显示模型选择器的应用程序非常有用：

```bash
curl https://thor-proxy.<your-subdomain>.workers.dev/v1/api/tags
```

响应示例：

```json
{
  "object": "list",
  "data": [
    { "id": "openai/gpt-4o", "name": "GPT-4o", "type": "model" },
    { "id": "openai/gpt-4-turbo", "name": "GPT-4 Turbo", "type": "model" },
    { "id": "openai/gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "type": "model" },
    { "id": "anthropic/claude-3-opus", "name": "Claude 3 Opus", "type": "model" },
    { "id": "anthropic/claude-3-sonnet", "name": "Claude 3 Sonnet", "type": "model" },
    { "id": "anthropic/claude-3-haiku", "name": "Claude 3 Haiku", "type": "model" },
    { "id": "meta-llama/llama-3-70b-instruct", "name": "Llama 3 70B", "type": "model" },
    { "id": "mistral/mistral-large", "name": "Mistral Large", "type": "model" },
    { "id": "deepseek/deepseek-r1-zero", "name": "DeepSeek R1 Zero", "type": "model" },
    { "id": "deepseek/deepseek-r1-zero:free", "name": "Default Model", "type": "model" }
  ]
}
```

### 如何配置 Cline VSCode 插件使用 Thor.AI API 代理？

[Cline](https://cline.bot/) 是一个强大的 VSCode 插件，可以帮助您在编码过程中使用 AI 辅助。您可以通过以下步骤配置 Cline 使用 Thor.AI API 代理：

1. 在 VSCode 中安装 [Cline 插件](https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev)

2. 点击左侧的 Cline 图标打开 Cline 侧边栏

3. 点击设置图标（⚙️）打开 Cline 设置

4. 在 API 提供商选项中，选择 **"OpenAI-Compatible"**

5. 在配置表单中填写以下信息：
   - **Base URL**: `https://thor-proxy.<your-subdomain>.workers.dev/v1`
   - **API Key**: 输入您的 OpenRouter API 密钥
   - **Model ID**: 输入您想要使用的模型，例如 `openai/gpt-4o`、`anthropic/claude-3-opus` 等

6. 点击 "Let's go" 或 "Save" 按钮保存配置

注意：
- 确保将 Base URL 设置为您的 Thor.AI API 代理 URL，包含 `/v1` 路径
- 将 API Key 设置为您的 OpenRouter API 密钥
- 在 Model ID 中输入您想要使用的模型，使用 OpenRouter 支持的任何模型

有关更详细的配置说明和高级用法，请参考 [与 Cline VSCode 插件集成](examples/cline-vscode-integration.md) 文档。

## 许可证

MIT

## 致谢

- [OpenRouter](https://openrouter.ai/) - 提供统一的 API 访问多种 AI 模型
- [Cloudflare Workers](https://workers.cloudflare.com/) - 提供全球边缘计算平台
- [OpenAI](https://openai.com/) - 提供 API 规范
