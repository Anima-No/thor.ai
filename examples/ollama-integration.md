# 与 Ollama 集成

本文档介绍如何将 Thor.AI API 代理与 Ollama 集成，使您能够通过 Ollama 的界面访问 OpenRouter 上的各种模型。

## 设置环境变量

要将 Thor.AI API 代理与 Ollama 集成，您需要设置以下环境变量：

### Windows (PowerShell)

```powershell
$env:OLLAMA_HOST="http://localhost:11434"
$env:OPENAI_API_BASE="https://thor-proxy.<your-subdomain>.workers.dev/v1"
$env:OPENAI_API_KEY="any-value"
```

### Linux/macOS

```bash
export OLLAMA_HOST="http://localhost:11434"
export OPENAI_API_BASE="https://thor-proxy.<your-subdomain>.workers.dev/v1"
export OPENAI_API_KEY="any-value"
```

## 创建模型别名

您可以在 Ollama 中创建模型别名，指向特定的 OpenRouter 模型：

1. 创建 Modelfile：

```
# 文件名：Modelfile-gpt4o
FROM openai/gpt-4o
```

2. 创建模型：

```bash
ollama create openrouter-gpt4o -f Modelfile-gpt4o
```

3. 为其他模型创建别名：

```
# 文件名：Modelfile-claude
FROM anthropic/claude-3-opus
```

```bash
ollama create openrouter-claude -f Modelfile-claude
```

## 使用模型

创建别名后，您可以像使用普通 Ollama 模型一样使用这些模型：

```bash
# 使用 GPT-4o
ollama run openrouter-gpt4o "解释量子力学的基本原理"

# 使用 Claude
ollama run openrouter-claude "解释量子力学的基本原理"
```

## 直接使用模型 ID

您也可以直接使用 OpenRouter 的模型 ID：

```bash
ollama run openai/gpt-4o "解释量子力学的基本原理"
ollama run anthropic/claude-3-opus "解释量子力学的基本原理"
```

## 故障排除

如果遇到问题，请检查以下几点：

1. 确保 Ollama 正在运行：
   ```bash
   ollama serve
   ```

2. 确保环境变量正确设置：
   ```bash
   # Windows (PowerShell)
   echo $env:OPENAI_API_BASE
   
   # Linux/macOS
   echo $OPENAI_API_BASE
   ```

3. 确保 Thor.AI API 代理正常工作：
   ```bash
   curl https://thor-proxy.<your-subdomain>.workers.dev/health
   ```

4. 检查 Ollama 日志：
   ```bash
   # 查看 Ollama 日志
   # 位置取决于您的操作系统
   ```

## 高级配置

### 永久设置环境变量

要永久设置环境变量，您可以将它们添加到您的 shell 配置文件中：

#### Windows

在 PowerShell 配置文件中添加：

```powershell
# 编辑 PowerShell 配置文件
notepad $PROFILE

# 添加以下行
$env:OPENAI_API_BASE="https://thor-proxy.<your-subdomain>.workers.dev/v1"
$env:OPENAI_API_KEY="any-value"
```

#### Linux/macOS

在 `~/.bashrc` 或 `~/.zshrc` 中添加：

```bash
# 添加以下行
export OPENAI_API_BASE="https://thor-proxy.<your-subdomain>.workers.dev/v1"
export OPENAI_API_KEY="any-value"
```

### 使用 Ollama Web UI

如果您使用 Ollama Web UI，您可以在其配置中设置 API 端点：

1. 打开 Ollama Web UI 设置
2. 找到 API 设置部分
3. 设置 API 端点为 `https://thor-proxy.<your-subdomain>.workers.dev/v1`
4. 设置 API 密钥为任意值

## 示例：创建聊天机器人

使用 Ollama 和 Thor.AI API 代理创建一个简单的聊天机器人：

```bash
#!/bin/bash
# 简单的聊天机器人脚本

# 设置环境变量
export OPENAI_API_BASE="https://thor-proxy.<your-subdomain>.workers.dev/v1"
export OPENAI_API_KEY="any-value"

# 选择模型
MODEL="openai/gpt-4o"

echo "聊天机器人已启动 (使用 $MODEL)"
echo "输入 'exit' 退出"
echo ""

while true; do
  # 获取用户输入
  echo -n "您: "
  read USER_INPUT
  
  # 检查是否退出
  if [ "$USER_INPUT" = "exit" ]; then
    echo "再见!"
    break
  fi
  
  # 发送到 Ollama
  echo -n "机器人: "
  ollama run $MODEL "$USER_INPUT"
  echo ""
done
```

保存为 `chatbot.sh`，然后运行：

```bash
chmod +x chatbot.sh
./chatbot.sh
```
