#!/usr/bin/env python3
"""
Thor.AI API 代理 - Python 示例
这个示例展示了如何使用 Python 和 OpenAI 客户端库连接到 Thor.AI API 代理。
"""

from openai import OpenAI
import os
import sys

# 替换为您的 Thor.AI API 代理 URL
API_BASE = "https://thor-proxy.<your-subdomain>.workers.dev/v1"

# 创建 OpenAI 客户端
client = OpenAI(
    base_url=API_BASE,
    api_key="any-value",  # 可以是任何值，因为验证由 OpenRouter 处理
)

def chat_completion(prompt, model="openai/gpt-4o", stream=False):
    """
    发送聊天完成请求
    
    Args:
        prompt (str): 用户提示
        model (str): 要使用的模型
        stream (bool): 是否使用流式响应
        
    Returns:
        str: 模型的响应
    """
    try:
        if stream:
            # 流式响应
            stream_resp = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                stream=True,
            )
            
            # 打印流式响应
            print("流式响应:")
            for chunk in stream_resp:
                content = chunk.choices[0].delta.content
                if content:
                    print(content, end="", flush=True)
            print("\n")
            return None
        else:
            # 常规响应
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.choices[0].message.content
    except Exception as e:
        print(f"错误: {e}")
        return None

def main():
    # 检查命令行参数
    if len(sys.argv) > 1:
        prompt = sys.argv[1]
    else:
        prompt = "你好，请用中文介绍一下自己，并解释一下量子计算的基本原理。"
    
    # 常规响应
    print("发送请求到:", API_BASE)
    print("提示:", prompt)
    print("\n常规响应:")
    response = chat_completion(prompt)
    if response:
        print(response)
    
    # 流式响应
    print("\n\n使用相同的提示进行流式响应:")
    chat_completion(prompt, stream=True)

if __name__ == "__main__":
    main()
