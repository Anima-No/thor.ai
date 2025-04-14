/**
 * Thor.AI API Proxy
 * 使用OpenAI API通过OpenRouter作为代理实现聊天完成和流式响应
 */

// 定义配置
const config = {
  openRouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
  },
  defaultModel: 'deepseek/deepseek-r1-zero:free'
};

// CORS头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// 处理CORS预检请求
function handleCORS() {
  return new Response(null, {
    headers: corsHeaders
  });
}

export default {
  async fetch(request, env) {
    // 添加CORS支持
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    // 解析请求URL
    const url = new URL(request.url);
    const path = url.pathname;

    // 健康检查端点
    if (path === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // 根路径信息
    if (path === '/' || path === '') {
      return new Response(JSON.stringify({
        name: 'Thor.AI API Proxy',
        description: '使用OpenAI API通过OpenRouter作为代理实现聊天完成和流式响应',
        endpoints: {
          '/v1/chat/completions': 'OpenAI兼容的聊天完成API',
          '/v1/api/chat': 'Ollama兼容的聊天API',
          '/health': '健康检查端点'
        },
        usage: {
          'API Key': '客户端提供的API Key将用于调用OpenRouter API，请使用您的OpenRouter API Key',
          '模型指定': '有三种方式指定模型: 1) URL参数 2) 请求体中的model字段 3) 默认模型',
          'URL参数': '可以通过URL参数指定模型，例如: /v1/chat/completions?model=google/gemini-pro',
          '模型格式': '支持的模型格式包括: openai/gpt-4o, google/gemini-pro, anthropic/claude-3-opus 等',
          '自动添加前缀': '如果模型名称不包含"/"，将自动添加"openai/"前缀，例如gpt-4变为openai/gpt-4',
          '流式响应': '支持流式响应，设置 stream: true',
          'Continue插件配置': '在Continue插件中选择OpenAI Compatible，设置API Base URL为此服务地址，API Key为您的OpenRouter API Key',
          '示例': 'curl -H "Authorization: Bearer your_openrouter_api_key" -H "Content-Type: application/json" -d \'{\'model\':\'google/gemini-pro\', \'messages\':[{\'role\':\'user\',\'content\':\'hello\'}]}\' https://thor-proxy.lll01ltt77.workers.dev/v1/chat/completions'
        }
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // 处理聊天完成API和Ollama的API路径
    if (path === '/v1/chat/completions' || path === '/v1/api/chat') {
      // 获取URL查询参数
      const urlParams = new URL(request.url).searchParams;
      const modelFromUrl = urlParams.get('model');

      // 获取请求体
      let body;
      try {
        body = await request.clone().json();
      } catch (e) {
        console.error('解析请求体错误:', e);
        // 如果无法解析JSON，创建一个空对象
        body = {};
      }

      // 优先使用URL中的模型，其次是请求体中的模型，最后是默认模型
      let modelToUse = config.defaultModel;

      if (modelFromUrl) {
        // URL参数中指定的模型优先级最高
        modelToUse = modelFromUrl;
        console.log('使用URL中指定的模型:', modelToUse);
      } else if (body.model) {
        // 其次是请求体中的模型
        modelToUse = body.model;
        console.log('使用请求体中的模型:', modelToUse);
      } else {
        // 最后是默认模型
        console.log('使用默认模型:', modelToUse);
      }

      // 将最终使用的模型设置到请求体中
      body.model = modelToUse;

      // 检查模型是否需要添加前缀
      // 如果模型不包含"/"，并且不是以“openai/”或“google/”等开头，添加“openai/”前缀
      if (!body.model.includes('/') &&
          !body.model.startsWith('openai/') &&
          !body.model.startsWith('google/') &&
          !body.model.startsWith('anthropic/') &&
          !body.model.startsWith('meta-llama/') &&
          !body.model.startsWith('mistral/')) {
        body.model = `openai/${body.model}`;
        console.log('添加前缀后的模型:', body.model);
      }

      // 创建新的请求头
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');

      // 从请求头中提取客户端提供的API Key
      const clientApiKey = request.headers.get('Authorization')?.replace('Bearer ', '');

      // 使用客户端提供的API Key，如果没有则使用环境变量中的默认值
      const apiKeyToUse = clientApiKey || env.OPENROUTER_API_KEY || '';

      // 添加OpenRouter授权头
      headers.set('Authorization', `Bearer ${apiKeyToUse}`);

      // 记录使用的API Key类型（用于调试）
      console.log('使用的API Key类型:', clientApiKey ? '客户端提供' : '环境变量默认值');

      // 添加OpenRouter特定的头信息（可选）
      headers.set('HTTP-Referer', request.headers.get('origin') || 'https://thor-proxy.workers.dev');
      headers.set('X-Title', 'Thor.AI API Proxy');

      // 创建新的请求
      const newRequest = new Request(`${config.openRouter.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });

      // 发送请求到OpenRouter
      try {
        console.log('发送请求到OpenRouter:', `${config.openRouter.baseUrl}/chat/completions`);
        const response = await fetch(newRequest);

        // 检查是否是流式响应
        const isStreamRequest = body.stream === true;

        // 如果是流式请求，直接返回原始响应
        if (isStreamRequest) {
          console.log('检测到流式请求，直接返回原始响应');
          // 创建一个新的响应，保留原始流
          const newResponse = new Response(response.body, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              ...corsHeaders
            }
          });
          return newResponse;
        }

        // 非流式请求，获取响应文本
        const responseText = await response.text();
        console.log('OpenRouter原始响应:', responseText.substring(0, 100) + '...');

        // 如果响应包含"OPENROUTER PROCESSING"，这是一个流式响应的标记
        if (responseText.includes('OPENROUTER PROCESSING')) {
          console.log('检测到流式响应标记，返回模拟的完成响应');

          // 创建一个符合Ollama期望的响应
          const simulatedResponse = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: body.model || config.defaultModel,
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: '正在处理您的请求。请尝试使用流式模式或使用不同的模型。'
              },
              finish_reason: 'stop'
            }],
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0
            }
          };

          return new Response(JSON.stringify(simulatedResponse), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        // 检查响应状态
        if (!response.ok) {
          console.error('OpenRouter响应错误:', response.status, responseText);

          // 创建一个符合Ollama期望的错误响应
          const errorResponse = {
            id: `error-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: body.model || config.defaultModel,
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: `错误: ${response.status} - ${responseText.substring(0, 100)}`
              },
              finish_reason: 'stop'
            }],
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0
            }
          };

          return new Response(JSON.stringify(errorResponse), {
            status: 200, // 返回200状态码，但包含错误信息
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        // 获取响应数据
        let responseData;
        try {
          // 尝试解析JSON
          responseData = JSON.parse(responseText);
          console.log('OpenRouter响应成功解析');
        } catch (e) {
          console.error('OpenRouter响应解析错误:', e);

          // 创建一个符合Ollama期望的错误响应
          const errorResponse = {
            id: `error-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: body.model || config.defaultModel,
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: `响应解析错误: ${e.message}\n\n原始响应: ${responseText.substring(0, 100)}...`
              },
              finish_reason: 'stop'
            }],
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0
            }
          };

          return new Response(JSON.stringify(errorResponse), {
            status: 200, // 返回200状态码，但包含错误信息
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        // 确保响应格式与Ollama期望的完全匹配
        if (path === '/v1/api/chat') {
          // 添加Ollama期望的字段
          if (!responseData.id) responseData.id = `chatcmpl-${Date.now()}`;
          if (!responseData.object) responseData.object = 'chat.completion';
          if (!responseData.created) responseData.created = Math.floor(Date.now() / 1000);
          if (!responseData.usage) responseData.usage = {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
          };
        }

        // 创建新的响应，添加CORS头
        const newResponse = new Response(JSON.stringify(responseData), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });

        return newResponse;
      } catch (error) {
        return new Response(JSON.stringify({ error: '代理请求失败', message: error.message }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }

    // 处理所有以/v1开头的请求
    if (path.startsWith('/v1') && path !== '/v1/chat/completions' && path !== '/v1/api/chat') {
      // 获取URL查询参数
      const urlParams = new URL(request.url).searchParams;
      const modelFromUrl = urlParams.get('model');

      // 获取请求体
      let body;
      try {
        body = await request.clone().json();
      } catch (e) {
        console.error('解析请求体错误:', e);
        // 如果没有请求体或不是JSON，创建一个空对象
        body = {};
      }

      // 优先使用URL中的模型，其次是请求体中的模型，最后是默认模型
      let modelToUse = config.defaultModel;

      if (modelFromUrl) {
        // URL参数中指定的模型优先级最高
        modelToUse = modelFromUrl;
        console.log('使用URL中指定的模型:', modelToUse);
      } else if (body.model) {
        // 其次是请求体中的模型
        modelToUse = body.model;
        console.log('使用请求体中的模型:', modelToUse);
      } else {
        // 最后是默认模型
        console.log('使用默认模型:', modelToUse);
      }

      // 将最终使用的模型设置到请求体中
      body.model = modelToUse;

      // 检查模型是否需要添加前缀
      // 如果模型不包含"/"，并且不是以“openai/”或“google/”等开头，添加“openai/”前缀
      if (!body.model.includes('/') &&
          !body.model.startsWith('openai/') &&
          !body.model.startsWith('google/') &&
          !body.model.startsWith('anthropic/') &&
          !body.model.startsWith('meta-llama/') &&
          !body.model.startsWith('mistral/')) {
        body.model = `openai/${body.model}`;
        console.log('添加前缀后的模型:', body.model);
      }

      // 创建新的请求头
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');

      // 从请求头中提取客户端提供的API Key
      const clientApiKey = request.headers.get('Authorization')?.replace('Bearer ', '');

      // 使用客户端提供的API Key，如果没有则使用环境变量中的默认值
      const apiKeyToUse = clientApiKey || env.OPENROUTER_API_KEY || '';

      // 添加OpenRouter授权头
      headers.set('Authorization', `Bearer ${apiKeyToUse}`);

      // 记录使用的API Key类型（用于调试）
      console.log('使用的API Key类型:', clientApiKey ? '客户端提供' : '环境变量默认值');

      // 注意：我们始终使用chat/completions端点，无论原始请求路径是什么

      // 创建新的请求
      const newRequest = new Request(`${config.openRouter.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });

      // 发送请求到OpenRouter
      try {
        console.log('发送请求到OpenRouter:', `${config.openRouter.baseUrl}/chat/completions`);
        const response = await fetch(newRequest);

        // 检查是否是流式响应
        const isStreamRequest = body.stream === true;

        // 如果是流式请求，直接返回原始响应
        if (isStreamRequest) {
          console.log('检测到流式请求，直接返回原始响应');
          // 创建一个新的响应，保留原始流
          const newResponse = new Response(response.body, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              ...corsHeaders
            }
          });
          return newResponse;
        }

        // 非流式请求，获取响应文本
        const responseText = await response.text();
        console.log('OpenRouter原始响应:', responseText.substring(0, 100) + '...');

        // 如果响应包含"OPENROUTER PROCESSING"，这是一个流式响应的标记
        if (responseText.includes('OPENROUTER PROCESSING')) {
          console.log('检测到流式响应标记，返回模拟的完成响应');

          // 创建一个符合Ollama期望的响应
          const simulatedResponse = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: body.model || config.defaultModel,
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: '正在处理您的请求。请尝试使用流式模式或使用不同的模型。'
              },
              finish_reason: 'stop'
            }],
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0
            }
          };

          return new Response(JSON.stringify(simulatedResponse), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        // 检查响应状态
        if (!response.ok) {
          console.error('OpenRouter响应错误:', response.status, responseText);

          // 创建一个符合Ollama期望的错误响应
          const errorResponse = {
            id: `error-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: body.model || config.defaultModel,
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: `错误: ${response.status} - ${responseText.substring(0, 100)}`
              },
              finish_reason: 'stop'
            }],
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0
            }
          };

          return new Response(JSON.stringify(errorResponse), {
            status: 200, // 返回200状态码，但包含错误信息
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        // 获取响应数据
        let responseData;
        try {
          // 尝试解析JSON
          responseData = JSON.parse(responseText);
          console.log('OpenRouter响应成功解析');
        } catch (e) {
          console.error('OpenRouter响应解析错误:', e);

          // 创建一个符合Ollama期望的错误响应
          const errorResponse = {
            id: `error-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: body.model || config.defaultModel,
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: `响应解析错误: ${e.message}\n\n原始响应: ${responseText.substring(0, 100)}...`
              },
              finish_reason: 'stop'
            }],
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0
            }
          };

          return new Response(JSON.stringify(errorResponse), {
            status: 200, // 返回200状态码，但包含错误信息
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        // 确保响应格式与Ollama期望的完全匹配
        if (path === '/v1/api/chat') {
          // 添加Ollama期望的字段
          if (!responseData.id) responseData.id = `chatcmpl-${Date.now()}`;
          if (!responseData.object) responseData.object = 'chat.completion';
          if (!responseData.created) responseData.created = Math.floor(Date.now() / 1000);
          if (!responseData.usage) responseData.usage = {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
          };
        }

        // 创建新的响应，添加CORS头
        const newResponse = new Response(JSON.stringify(responseData), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });

        return newResponse;
      } catch (error) {
        return new Response(JSON.stringify({ error: '代理请求失败', message: error.message }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }

    // 对于其他路径，返回404
    return new Response(JSON.stringify({ error: '未找到路径', path: path }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
};
