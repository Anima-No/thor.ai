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
  async fetch(request, env, ctx) {
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
          '/health': '健康检查端点'
        }
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // 只处理聊天完成API
    if (path === '/v1/chat/completions') {
      // 获取请求体
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return new Response(JSON.stringify({ error: '无效的JSON请求体' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 如果没有指定模型，使用默认模型
      if (!body.model) {
        body.model = config.defaultModel;
      }

      // 创建新的请求头
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');

      // 添加OpenRouter授权头
      headers.set('Authorization', `Bearer ${env.OPENROUTER_API_KEY}`);

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
        const response = await fetch(newRequest);

        // 创建新的响应，添加CORS头
        const newResponse = new Response(response.body, response);

        // 添加CORS头
        Object.keys(corsHeaders).forEach(key => {
          newResponse.headers.set(key, corsHeaders[key]);
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
    return new Response(JSON.stringify({ error: '未找到路径' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
};
