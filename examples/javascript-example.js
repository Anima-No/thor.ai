/**
 * Thor.AI API 代理 - JavaScript 示例
 * 这个示例展示了如何使用 JavaScript 和 OpenAI 客户端库连接到 Thor.AI API 代理。
 */

import OpenAI from 'openai';

// 替换为您的 Thor.AI API 代理 URL
const API_BASE = "https://thor-proxy.<your-subdomain>.workers.dev/v1";

// 创建 OpenAI 客户端
const openai = new OpenAI({
  baseURL: API_BASE,
  apiKey: 'any-value', // 可以是任何值，因为验证由 OpenRouter 处理
});

/**
 * 发送聊天完成请求
 * @param {string} prompt - 用户提示
 * @param {string} model - 要使用的模型
 * @param {boolean} stream - 是否使用流式响应
 * @returns {Promise<string|null>} - 模型的响应
 */
async function chatCompletion(prompt, model = "openai/gpt-4o", stream = false) {
  try {
    if (stream) {
      // 流式响应
      console.log("流式响应:");
      const streamResponse = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
      });
      
      // 打印流式响应
      process.stdout.write(""); // 初始化输出
      for await (const chunk of streamResponse) {
        const content = chunk.choices[0]?.delta?.content || "";
        process.stdout.write(content);
      }
      console.log("\n"); // 结束后换行
      return null;
    } else {
      // 常规响应
      const response = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
      });
      return response.choices[0].message.content;
    }
  } catch (error) {
    console.error("错误:", error);
    return null;
  }
}

/**
 * 主函数
 */
async function main() {
  // 设置提示
  const prompt = process.argv[2] || "你好，请用中文介绍一下自己，并解释一下量子计算的基本原理。";
  
  // 常规响应
  console.log("发送请求到:", API_BASE);
  console.log("提示:", prompt);
  console.log("\n常规响应:");
  const response = await chatCompletion(prompt);
  if (response) {
    console.log(response);
  }
  
  // 流式响应
  console.log("\n\n使用相同的提示进行流式响应:");
  await chatCompletion(prompt, "openai/gpt-4o", true);
}

// 运行主函数
main().catch(console.error);
