# 与 Cline VSCode 插件集成

本文档介绍如何将 Thor.AI API 代理与 [Cline VSCode 插件](https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev) 集成，使您能够在 VSCode 中使用 OpenRouter 上的各种 AI 模型进行代码辅助。

## 什么是 Cline？

Cline 是一个强大的 VSCode 插件，它可以帮助您在编码过程中使用 AI 辅助。它支持多种功能，包括：

- 代码生成和补全
- 代码解释和文档生成
- 代码重构和优化
- 自然语言对话
- 文件创建和编辑
- 执行终端命令
- 浏览器自动化

Cline 支持多种 AI 模型提供商，包括 OpenAI、Anthropic、Google 等，并且可以配置为使用 OpenAI 兼容的 API 服务，如 Thor.AI API 代理。

## 安装 Cline 插件

1. 打开 VSCode
2. 点击左侧的扩展图标或按下 `Ctrl+Shift+X`（Windows/Linux）或 `Cmd+Shift+X`（macOS）
3. 在搜索框中输入 "Cline"
4. 找到 "Cline" 插件（由 saoudrizwan 开发）并点击安装
5. 安装完成后，您将在 VSCode 左侧看到 Cline 的图标

## 配置 Cline 使用 Thor.AI API 代理

### 使用 OpenAI Compatible 模式

1. 在 VSCode 中，点击左侧的 Cline 图标打开 Cline 侧边栏
2. 点击设置图标（⚙️）打开 Cline 设置
3. 在 API 提供商选项中，选择 **"OpenAI-Compatible"**
4. 在配置表单中填写以下信息：
   - **Base URL**: `https://thor-proxy.<your-subdomain>.workers.dev/v1`
   - **API Key**: 输入您的 OpenRouter API 密钥
   - **Model ID**: 输入您想要使用的模型，例如 `openai/gpt-4o`、`anthropic/claude-3-opus` 等

![Cline OpenAI Compatible 配置](../assets/cline-openai-compatible.png)

5. 点击 "Let's go" 或 "Save" 按钮保存配置

## 配置说明

- **Base URL**: Thor.AI API 代理的 URL，确保包含 `/v1` 路径
- **API Key**: 您的 OpenRouter API 密钥，可以从 [OpenRouter 网站](https://openrouter.ai/keys) 获取
- **Model ID**: 您想要使用的模型，例如：
  - `openai/gpt-4o`
  - `anthropic/claude-3-opus`
  - `anthropic/claude-3-sonnet`
  - `meta-llama/llama-3-70b-instruct`
  - `mistral/mistral-large`

## 使用 Cline

配置完成后，您可以通过以下方式使用 Cline：

1. 在代码编辑器中，选择一段代码或将光标放在您想要获取帮助的位置
2. 点击 VSCode 左侧的 Cline 图标打开侧边栏
3. 在 Cline 侧边栏中，输入您的问题或指令
4. Cline 将使用您配置的 Thor.AI API 代理和选定的模型生成响应

您也可以使用快捷键：
- 按下 `Ctrl+Shift+I`（Windows/Linux）或 `Cmd+Shift+I`（macOS）打开 Cline 侧边栏

## 高级功能

Cline 提供了许多高级功能，包括：

1. **文件操作**：Cline 可以创建、编辑和删除文件
2. **终端命令**：Cline 可以执行终端命令（需要您的确认）
3. **浏览器自动化**：Cline 可以打开浏览器并执行操作
4. **自定义工具**：Cline 可以创建和使用自定义工具

## 故障排除

如果遇到问题，请检查以下几点：

1. 确保 Thor.AI API 代理正常工作：
   ```bash
   curl https://thor-proxy.<your-subdomain>.workers.dev/health
   ```

2. 验证您的 OpenRouter API 密钥是否有效：
   ```bash
   curl https://openrouter.ai/api/v1/auth/key -H "Authorization: Bearer your-openrouter-api-key"
   ```

3. 检查 Base URL 是否正确，包含 `/v1` 路径

4. 确保模型 ID 正确，包含提供商前缀（如 `openai/gpt-4o`）

## 示例：使用 Cline 生成代码

1. 在 VSCode 中打开一个项目
2. 点击 Cline 图标打开侧边栏
3. 输入一个请求，例如：
   ```
   创建一个简单的 React 组件，显示一个计数器，有增加和减少按钮
   ```
4. Cline 将使用您配置的 Thor.AI API 代理和选定的模型生成代码

## 示例：使用 Cline 解释代码

1. 在 VSCode 中选择一段代码
2. 点击 Cline 图标打开侧边栏
3. 输入 "解释这段代码"
4. Cline 将使用您配置的 Thor.AI API 代理和选定的模型解释所选代码
