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
          '/v1/api/tags': '获取可用模型列表',
          '/health': '健康检查端点'
        },
        usage: {
          'API Key': '客户端提供的API Key将用于调用OpenRouter API，请使用您的OpenRouter API Key',
          '模型指定': '有三种方式指定模型: 1) URL参数 2) 请求体中的model字段 3) 默认模型',
          'URL参数': '可以通过URL参数指定模型，例如: /v1/chat/completions?model=google/gemini-pro',
          '模型格式': '支持的模型格式包括: openai/gpt-4o, google/gemini-pro, anthropic/claude-3-opus 等',
          '自动添加前缀': '如果模型名称不包含"/"，将自动添加"openai/"前缀，例如gpt-4变为openai/gpt-4',
          '流式响应': '支持流式响应，设置 stream: true',
          'Cline插件配置': '在Cline插件中选择OpenAI-Compatible，设置Base URL为此服务地址，API Key为您的OpenRouter API Key，Model ID为您想要使用的模型',
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

      // 获取请求体 - 只有在POST/PUT/PATCH请求时才尝试解析JSON
      let body = {};
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          body = await request.clone().json();
        } catch (e) {
          console.error('解析请求体错误:', e);
          // 如果无法解析JSON，保持空对象
        }
      } else {
        console.log('GET请求，不尝试解析请求体');
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
      // 如果模型不包含"/"，并且不是以"openai/"或"google/"等开头，添加"openai/"前缀
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
      const authHeader = request.headers.get('Authorization');
      console.log('原始Authorization头:', authHeader);

      // 完全移除Bearer前缀，确保即使有多个空格也能正确处理
      const clientApiKey = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;
      console.log('提取的客户端API Key:', clientApiKey || '无');
      console.log('环境变量API Key是否存在:', env.OPENROUTER_API_KEY ? '是' : '否');

      // 检查API Key是否存在
      console.log('打印的API Key是否存在?:', clientApiKey ? '是' : '否');
      console.log('API Key长度:', clientApiKey?.length || 0);
      console.log('API Key前缀:', clientApiKey?.substring(0, 10) || '无');

      // 检查API Key是否有效 - 对于OpenRouter，应该以sk-or-v1-开头
      // 注意：我们不再检查是否以sk-or-v1-开头，只要有API Key就认为有效
      const isValidOpenRouterKey = !!clientApiKey && clientApiKey.length > 5;
      console.log('API Key是否有效:', isValidOpenRouterKey ? '是' : '否');

      if (path !== '/v1/models' && (!clientApiKey || clientApiKey === 'any-value' || clientApiKey === 'sk-')) {
        console.error('API Key无效或缺失');
        return new Response(JSON.stringify({
          error: 'API Key错误',
          message: '请提供有效的OpenRouter API Key。在Cline插件中，请确保您输入了真实的OpenRouter API Key，应该以sk-or-v1-开头。请不要使用"any-value"或其他占位符。',
          documentation: 'https://openrouter.ai/keys'
        }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 添加OpenRouter授权头 - 添加Bearer前缀
      if (clientApiKey) {
        // 如果有提取的API Key，添加Bearer前缀
        headers.set('Authorization', `Bearer ${clientApiKey}`);
      } else if (env.OPENROUTER_API_KEY) {
        // 如果有环境变量API Key，添加Bearer前缀
        headers.set('Authorization', `Bearer ${env.OPENROUTER_API_KEY}`);
      }
      console.log('最终发送的Authorization头:', headers.get('Authorization'));

      // 记录使用的API Key类型（用于调试）
      console.log('使用的API Key类型:', clientApiKey ? '客户端提供' : '环境变量默认值');

      // 添加OpenRouter特定的头信息（可选）
      headers.set('HTTP-Referer', request.headers.get('origin') || 'https://thor-proxy.workers.dev');
      headers.set('X-Title', 'Thor.AI API Proxy');

      // 打印请求信息（用于调试）
      console.log('请求信息:', {
        url: `${config.openRouter.baseUrl}/chat/completions`,
        method: 'POST',
        headers: Object.fromEntries(headers.entries()),
        body: {
          ...body,
          stream: body.stream === true ? true : false // 显示流式设置
        }
      });

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

          // 检查响应状态
          if (!response.ok) {
            console.error('流式请求失败，状态码:', response.status);
            // 返回错误信息
            let errorMessage = '请检查API密钥和模型ID是否正确';

            // 根据状态码提供更具体的错误信息
            if (response.status === 401 || response.status === 403) {
              errorMessage = '请提供有效的OpenRouter API Key。在Cline插件中，请确保您输入了真实的OpenRouter API Key，应该以sk-or-v1-开头。请不要使用"any-value"或其他占位符。您可以在 https://openrouter.ai/keys 获取API Key。';
            } else if (response.status === 404) {
              errorMessage = `模型不存在或无法访问：请检查模型 ID "${body.model}"是否正确。`;
            } else if (response.status === 429) {
              errorMessage = '请求频率超限或配额用尽：请稍后再试。\n\n可能的原因：\n1. 您的OpenRouter API密钥已达到使用限制\n2. 您使用的是免费层级，它有更严格的限制\n3. 您选择的模型可能有特定的使用限制\n\n建议解决方案：\n1. 等待几分钟后再试\n2. 尝试使用不同的模型，特别是标记为"free"的模型\n3. 如果您经常使用这个服务，考虑升级您的OpenRouter账户';
            }

            return new Response(JSON.stringify({
              error: '流式请求失败',
              status: response.status,
              message: errorMessage,
              documentation: 'https://openrouter.ai/keys'
            }), {
              status: 200, // 返回200状态码，但包含错误信息
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          // 创建一个新的响应，保留原始流
          try {
            // 使用转换流函数处理流式响应
            const transformedStream = new ReadableStream({
              async start(controller) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                // 添加错误标志变量
                let errorSent = false;

                try {
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    // 解码二进制数据
                    const chunk = decoder.decode(value, { stream: true });
                    console.log('收到流式数据块:', chunk);

                    // 如果已经发送过错误消息，则不再处理
                    if (!errorSent) {
                      // 改进错误检测逻辑
                      // 首先检查标准错误格式
                      if (chunk.includes('"error"') || 
                          chunk.includes('Provider returned error') || 
                          chunk.includes('code":429') || 
                          chunk.includes('"code": 429') || 
                          chunk.includes('rate limit') || 
                          chunk.includes('quota exceeded') || 
                          chunk.includes('RESOURCE_EXHAUSTED')) {
                        
                      console.log('检测到错误响应:', chunk);

                        // 提取错误代码(如果存在)
                          let errorCode = null;
                        const codeMatch = chunk.match(/"code"\s*:\s*(\d+)/i) || chunk.match(/"code"\s*:\s*"(\d+)"/i);
                          if (codeMatch && codeMatch[1]) {
                            errorCode = codeMatch[1];
                            console.log('提取到错误代码:', errorCode);
                          }

                        // 提取原始错误消息
                          let rawErrorMessage = null;
                        const messageMatch = chunk.match(/"message"\s*:\s*"([^"]*)"/i);
                          if (messageMatch && messageMatch[1]) {
                            rawErrorMessage = messageMatch[1];
                            console.log('提取到原始错误消息:', rawErrorMessage);
                          }

                        // 提取提供商名称
                          let providerName = null;
                        const providerMatch = chunk.match(/"provider_name"\s*:\s*"([^"]*)"/i) || chunk.match(/provider_name=([^,&]*)/i);
                          if (providerMatch && providerMatch[1]) {
                            providerName = providerMatch[1];
                            console.log('提取到提供商名称:', providerName);
                          }

                        // 提取模型名称
                        let modelName = body.model || '未知模型';
                        const modelMatch = chunk.match(/"model"\s*:\s*"([^"]+)"/i) || chunk.match(/model=([^,&]*)/i);
                          if (modelMatch && modelMatch[1]) {
                            modelName = modelMatch[1];
                            console.log('提取到模型名称:', modelName);
                          }

                        // 错误消息构建 - 确保错误消息中不包含可能破坏JSON格式的字符
                        let errorMessage = '请求处理错误';
                        let errorDetails = '';
                        
                        // 安全处理原始错误消息，移除或转义可能导致JSON解析失败的字符
                        if (rawErrorMessage) {
                          try {
                            // 测试是否为有效JSON字符串
                            JSON.parse(`{"test":"${rawErrorMessage}"}`);
                            errorDetails = rawErrorMessage;
                          } catch (e) {
                            // 如果包含会破坏JSON结构的字符，进行简单处理
                            errorDetails = rawErrorMessage.replace(/["\\]/g, '');
                            console.log('原始错误消息含有特殊字符，已处理');
                          }
                        }

                        let errorFound = false;

                        // 按照错误类型分类处理 - 优先检查特定错误模式
                        // 配额/频率限制错误 (429) - 最常见，最优先检查
                        if (errorCode === '429' || 
                             chunk.includes('code":429') || 
                             chunk.includes('"code": 429') || 
                             chunk.includes('rate limit') || 
                             chunk.includes('quota') || 
                             chunk.includes('RESOURCE_EXHAUSTED') || 
                             chunk.includes('exceeded') || 
                             chunk.includes('limit')) {
                          console.log('检测到频率/配额限制错误');
                          let baseMessage = `配额限制错误 (429): 您已达到模型 "${modelName}" 的使用限制。`;

                            if (providerName) {
                            baseMessage = `${providerName} 配额限制错误 (429): 您已达到模型 "${modelName}" 的使用限制。`;
                          }

                          errorMessage = baseMessage + 
                            "\n\n具体原因：" +
                            "\n1. 您使用的模型已达到免费层级的配额限制" +
                            "\n2. 您的API密钥可能有每分钟/每小时/每天的请求限制" +
                            "\n\n建议解决方案：" +
                            "\n1. 更换模型: 请尝试使用其他模型，如 anthropic/claude-3-haiku 或 deepseek/deepseek-r1-zero:free" +
                            "\n2. 等待配额重置: 大多数免费层级配额每24小时重置一次" +
                            "\n3. 升级账户: 如果您经常使用这个模型，考虑升级您的账户以获得更高的配额";
                          
                          errorCode = '429';
                          errorFound = true;
                        }
                        // 地理位置限制错误
                        else if (chunk.includes('User location is not supported') || 
                            chunk.includes('location not supported') || 
                            chunk.includes('geo')) {
                          console.log('检测到地理位置限制错误');
                          errorMessage = `地理位置限制: ${providerName || '所选模型提供商'} 不支持您的地理位置。\n\n建议解决方案：\n1. 尝试使用其他模型，如 anthropic/claude-3-haiku 或 deepseek/deepseek-r1-zero:free\n2. 使用VPN或代理服务连接到支持的地区`;
                          errorCode = errorCode || '400';
                          errorFound = true;
                        }
                        // 其他错误按错误代码处理
                        else if (errorCode === '400' || chunk.includes('code":400') || chunk.includes('"code":400')) {
                          errorMessage = `错误请求 (400): 无效或缺失参数，或者可能是CORS问题。请检查您的请求参数是否正确。${errorDetails ? '\n\n详细信息: ' + errorDetails : ''}`;
                          errorFound = true;
                        } else if (errorCode === '401' || chunk.includes('code":401') || chunk.includes('"code":401') || chunk.includes('invalid_api_key')) {
                          errorMessage = `凭据无效 (401): OAuth会话过期或API密钥已禁用/无效。请检查您的API Key是否正确。${errorDetails ? '\n\n详细信息: ' + errorDetails : ''}`;
                          errorFound = true;
                        } else if (errorCode === '402' || chunk.includes('code":402') || chunk.includes('"code":402')) {
                          errorMessage = `积分不足 (402): 您的账户或API密钥积分不足。请添加更多积分，然后重试请求。${errorDetails ? '\n\n详细信息: ' + errorDetails : ''}`;
                          errorFound = true;
                        } else if (errorCode === '403' || chunk.includes('code":403') || chunk.includes('"code":403')) {
                          errorMessage = `内容审核 (403): 您选择的模型需要内容审核，您的输入被标记为不适当内容。请修改您的输入内容。${errorDetails ? '\n\n详细信息: ' + errorDetails : ''}`;
                          errorFound = true;
                        } else if (errorCode === '408' || chunk.includes('code":408') || chunk.includes('"code":408')) {
                          errorMessage = `请求超时 (408): 您的请求处理时间过长。请简化您的请求或稍后重试。${errorDetails ? '\n\n详细信息: ' + errorDetails : ''}`;
                          errorFound = true;
                          } else if (errorCode === '502' || chunk.includes('code":502') || chunk.includes('"code":502')) {
                          errorMessage = `模型服务错误 (502): 您选择的模型已关闭，或者我们收到了来自该模型的无效响应。请稍后重试或选择其他模型。${errorDetails ? '\n\n详细信息: ' + errorDetails : ''}`;
                          errorFound = true;
                          } else if (errorCode === '503' || chunk.includes('code":503') || chunk.includes('"code":503')) {
                          errorMessage = `无可用模型 (503): 没有满足路由要求的可用模型提供程序。请尝试使用其他模型。${errorDetails ? '\n\n详细信息: ' + errorDetails : ''}`;
                          errorFound = true;
                          } else if (chunk.includes('model not found') || errorCode === '404' || chunk.includes('code":404') || chunk.includes('"code":404')) {
                          errorMessage = `模型不存在 (404): 模型不存在或无法访问。请检查模型 ID是否正确。${errorDetails ? '\n\n详细信息: ' + errorDetails : ''}`;
                          errorFound = true;
                        } else if (errorDetails) {
                            // 如果有原始错误消息但没有匹配到常见错误，直接使用原始错误消息
                          errorMessage = errorDetails;

                            // 如果有提供商信息，添加到错误消息中
                            if (providerName) {
                              errorMessage = `${providerName} 返回错误: ${errorMessage}`;
                            }
                          errorFound = true;
                        }

                        // 仅在确实找到错误的情况下发送错误消息
                        if (errorFound) {
                          // 构建错误响应对象 - 使用简化的结构，避免嵌套过深
                          const errorObj = {
                            error: {
                              message: errorMessage,
                              code: errorCode || "500",
                              type: "proxy_error"
                            }
                          };
                          
                          // 发送错误消息给客户端 - 确保JSON格式正确
                          try {
                            // 使用JSON.stringify处理错误信息，确保所有特殊字符被正确转义
                            const safeErrorObj = {
                              error: {
                                message: String(errorMessage).replace(/\n/g, '\\n'),
                                code: errorCode || "500",
                                type: "proxy_error",
                                provider: providerName || undefined,
                                model: modelName || undefined
                              }
                            };
                            
                            const jsonString = JSON.stringify(safeErrorObj);
                            // 测试能否正确解析
                            JSON.parse(jsonString);
                            
                            // 格式化为标准SSE数据格式
                            const errorEvent = `data: ${jsonString}\n\n`;
                          controller.enqueue(new TextEncoder().encode(errorEvent));
                            console.log('发送错误消息到客户端:', errorMessage.substring(0, 50) + (errorMessage.length > 50 ? '...' : ''));
                            console.log('发送的JSON:', jsonString.substring(0, 100) + (jsonString.length > 100 ? '...' : ''));
                        } catch (e) {
                            console.error('构建错误消息JSON时出错:', e);
                            
                            // 极简错误响应，确保不会有格式问题
                            const fallbackError = {
                            error: {
                                message: "处理请求时出错，请检查API密钥和模型设置",
                                code: "500"
                              }
                            };
                            
                            const fallbackEvent = `data: ${JSON.stringify(fallbackError)}\n\n`;
                            controller.enqueue(new TextEncoder().encode(fallbackEvent));
                            console.log('发送极简错误消息到客户端');
                          }
                          
                          // 设置错误标志
                          errorSent = true;
                        }
                      }
                    }

                    // 将数据块发送到新流 - 只有在未发送错误消息时才发送原始数据
                    if (!errorSent) {
                    controller.enqueue(value);
                    }
                  }
                  controller.close();
                } catch (error) {
                  console.error('读取流时出错:', error);
                  controller.error(error);
                }
              }
            });

            const newResponse = new Response(transformedStream, {
              status: 200,
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no', // 禁用Nginx缓冲
                ...corsHeaders
              }
            });
            return newResponse;
          } catch (error) {
            console.error('创建流式响应时出错:', error);
            // 如果出错，回退到原始方法
            const newResponse = new Response(response.body, {
              status: 200,
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no', // 禁用Nginx缓冲
                ...corsHeaders
              }
            });
            return newResponse;
          }
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

          // 分析错误类型
          let errorMessage = '';
          let errorDetails = '';

          // 尝试解析错误响应
          try {
            const errorJson = JSON.parse(responseText);
            errorDetails = errorJson.error?.message || errorJson.message || errorJson.error || responseText;
          } catch (e) {
            errorDetails = responseText.substring(0, 200);
          }

          // 根据状态码和错误消息判断错误类型
          if (response.status === 400) {
            if (errorDetails.includes('User location is not supported')) {
              // 处理地理位置限制错误
              let providerName = 'Google AI';
              // 尝试从错误详情中提取提供商名称
              const providerMatch = errorDetails.match(/provider_name":"([^"]+)"/i);
              if (providerMatch && providerMatch[1]) {
                providerName = providerMatch[1];
              }

              errorMessage = `地理位置限制: ${providerName} 不支持您的地理位置。状态码: ${response.status}\n\n建议解决方案：\n1. 尝试使用其他模型，如 anthropic/claude-3-haiku 或 deepseek/deepseek-r1-zero:free\n2. 使用VPN或代理服务连接到支持的地区`;
              console.error('地理位置限制错误:', errorDetails);
            } else {
              errorMessage = `错误请求 (400): 无效或缺失参数，或者可能是CORS问题。状态码: ${response.status}`;
              console.error('参数错误:', errorDetails);
            }
          } else if (response.status === 401) {
            errorMessage = `凭据无效 (401): OAuth会话过期或API密钥已禁用/无效。请检查您的OpenRouter API Key是否正确。状态码: ${response.status}`;
            console.error('API Key错误:', errorDetails);
          } else if (response.status === 402) {
            errorMessage = `积分不足 (402): 您的账户或API密钥积分不足。请添加更多积分，然后重试请求。状态码: ${response.status}`;
            console.error('积分不足:', errorDetails);
          } else if (response.status === 403) {
            errorMessage = `内容审核 (403): 您选择的模型需要内容审核，您的输入被标记为不适当内容。请修改您的输入内容。状态码: ${response.status}`;
            console.error('内容审核错误:', errorDetails);
          } else if (response.status === 404) {
            errorMessage = `模型不存在 (404): 模型不存在或无法访问。请检查模型 ID "${body.model}"是否正确。状态码: ${response.status}`;
            console.error('模型错误:', errorDetails);
          } else if (response.status === 408) {
            errorMessage = `请求超时 (408): 您的请求处理时间过长。请简化您的请求或稍后重试。状态码: ${response.status}`;
            console.error('请求超时:', errorDetails);
          } else if (response.status === 429) {
            // 提取模型名称
            let modelName = body.model || '未知模型';
            try {
              // 尝试从错误中提取模型名称
              const modelMatch = errorDetails.match(/"model":\s*"([^"]+)"/i);
              if (modelMatch && modelMatch[1]) {
                modelName = modelMatch[1];
              }
            } catch (e) {
              console.error('提取模型名称失败:', e);
            }

            errorMessage = `速率限制 (429): 您已达到模型 "${modelName}" 的使用限制。状态码: ${response.status}\n\n具体原因：\n1. 您使用的模型已达到免费层级的配额限制\n2. 您的API密钥可能有每分钟/每小时/每天的请求限制\n\n建议解决方案：\n1. 更换模型: 请尝试使用其他模型，如 anthropic/claude-3-haiku 或 deepseek/deepseek-r1-zero:free\n2. 等待配额重置: 大多数免费层级配额每24小时重置一次\n3. 升级账户: 如果您经常使用这个模型，考虑升级您的账户以获得更高的配额`;
            console.error('频率限制:', errorDetails);
          } else if (response.status === 502) {
            errorMessage = `模型服务错误 (502): 您选择的模型已关闭，或者我们收到了来自该模型的无效响应。请稍后重试或选择其他模型。状态码: ${response.status}`;
            console.error('模型服务错误:', errorDetails);
          } else if (response.status === 503) {
            errorMessage = `无可用模型 (503): 没有满足路由要求的可用模型提供程序。请尝试使用其他模型。状态码: ${response.status}`;
            console.error('无可用模型:', errorDetails);
          } else {
            errorMessage = `OpenRouter响应错误，状态码: ${response.status}`;
            console.error('其他错误:', errorDetails);
          }

          // 添加错误详情
          errorMessage += `\n\n错误详情: ${errorDetails}`;

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
                content: errorMessage
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

        // 处理 /v1/api/tags 端点 - 返回可用模型列表
    if (path === '/v1/api/tags') {
      console.log('处理 /v1/api/tags 请求');

      // 创建一个模拟的标签/模型列表响应
      const tagsResponse = {
        object: "list",
        data: [
          { id: "openai/gpt-4o", name: "GPT-4o", type: "model" },
          { id: "openai/gpt-4-turbo", name: "GPT-4 Turbo", type: "model" },
          { id: "openai/gpt-3.5-turbo", name: "GPT-3.5 Turbo", type: "model" },
          { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", type: "model" },
          { id: "anthropic/claude-3-sonnet", name: "Claude 3 Sonnet", type: "model" },
          { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", type: "model" },
          { id: "meta-llama/llama-3-70b-instruct", name: "Llama 3 70B", type: "model" },
          { id: "mistral/mistral-large", name: "Mistral Large", type: "model" },
          { id: "deepseek/deepseek-r1-zero", name: "DeepSeek R1 Zero", type: "model" },
          { id: config.defaultModel, name: "Default Model", type: "model" }
        ]
      };

      return new Response(JSON.stringify(tagsResponse), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // 处理 /v1/models 端点 - 返回可用模型列表
    if (path === '/v1/models') {
      console.log('处理 /v1/models 请求');

      // 创建一个模拟的模型列表响应
      const modelsResponse = {
        object: "list",
        data: [
          { id: "openai/gpt-4o", object: "model", created: Math.floor(Date.now() / 1000), owned_by: "openai" },
          { id: "openai/gpt-4-turbo", object: "model", created: Math.floor(Date.now() / 1000), owned_by: "openai" },
          { id: "openai/gpt-3.5-turbo", object: "model", created: Math.floor(Date.now() / 1000), owned_by: "openai" },
          { id: "anthropic/claude-3-opus", object: "model", created: Math.floor(Date.now() / 1000), owned_by: "anthropic" },
          { id: "anthropic/claude-3-sonnet", object: "model", created: Math.floor(Date.now() / 1000), owned_by: "anthropic" },
          { id: "anthropic/claude-3-haiku", object: "model", created: Math.floor(Date.now() / 1000), owned_by: "anthropic" },
          { id: "meta-llama/llama-3-70b-instruct", object: "model", created: Math.floor(Date.now() / 1000), owned_by: "meta" },
          { id: "mistral/mistral-large", object: "model", created: Math.floor(Date.now() / 1000), owned_by: "mistral" },
          { id: "deepseek/deepseek-r1-zero", object: "model", created: Math.floor(Date.now() / 1000), owned_by: "deepseek" },
          { id: config.defaultModel, object: "model", created: Math.floor(Date.now() / 1000), owned_by: "default" }
        ]
      };

      return new Response(JSON.stringify(modelsResponse), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // 处理所有以/v1开头的请求
    if (path.startsWith('/v1') && path !== '/v1/chat/completions' && path !== '/v1/api/chat' && path !== '/v1/api/tags' && path !== '/v1/models') {
      // 获取URL查询参数
      const urlParams = new URL(request.url).searchParams;
      const modelFromUrl = urlParams.get('model');

      // 获取请求体 - 只有在POST/PUT/PATCH请求时才尝试解析JSON
      let body = {};
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          body = await request.clone().json();
        } catch (e) {
          console.error('解析请求体错误:', e);
          // 如果无法解析JSON，保持空对象
        }
      } else {
        console.log('GET请求，不尝试解析请求体');
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
      // 如果模型不包含"/"，并且不是以"openai/"或"google/"等开头，添加"openai/"前缀
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
      const authHeader = request.headers.get('Authorization');
      console.log('原始Authorization头:', authHeader);

      // 完全移除Bearer前缀，确保即使有多个空格也能正确处理
      const clientApiKey = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;
      console.log('提取的客户端API Key:', clientApiKey || '无');
      console.log('环境变量API Key是否存在:', env.OPENROUTER_API_KEY ? '是' : '否');

      // 检查API Key是否存在
      console.log('打印的API Key是否存在?:', clientApiKey ? '是' : '否');
      console.log('API Key长度:', clientApiKey?.length || 0);
      console.log('API Key前缀:', clientApiKey?.substring(0, 10) || '无');

      // 检查API Key是否有效 - 对于OpenRouter，应该以sk-or-v1-开头
      // 注意：我们不再检查是否以sk-or-v1-开头，只要有API Key就认为有效
      const isValidOpenRouterKey = !!clientApiKey && clientApiKey.length > 5;
      console.log('API Key是否有效:', isValidOpenRouterKey ? '是' : '否');

      if (path !== '/v1/models' && (!clientApiKey || clientApiKey === 'any-value' || clientApiKey === 'sk-')) {
        console.error('API Key无效或缺失');
        return new Response(JSON.stringify({
          error: 'API Key错误',
          message: '请提供有效的OpenRouter API Key。在Cline插件中，请确保您输入了真实的OpenRouter API Key，应该以sk-or-v1-开头。请不要使用"any-value"或其他占位符。',
          documentation: 'https://openrouter.ai/keys'
        }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 添加OpenRouter授权头 - 添加Bearer前缀
      if (clientApiKey) {
        // 如果有提取的API Key，添加Bearer前缀
        headers.set('Authorization', `Bearer ${clientApiKey}`);
      } else if (env.OPENROUTER_API_KEY) {
        // 如果有环境变量API Key，添加Bearer前缀
        headers.set('Authorization', `Bearer ${env.OPENROUTER_API_KEY}`);
      }
      console.log('最终发送的Authorization头:', headers.get('Authorization'));

      // 记录使用的API Key类型（用于调试）
      console.log('使用的API Key类型:', clientApiKey ? '客户端提供' : '环境变量默认值');

      // 注意：我们始终使用chat/completions端点，无论原始请求路径是什么

      // 打印请求信息（用于调试）
      console.log('请求信息:', {
        url: `${config.openRouter.baseUrl}/chat/completions`,
        method: 'POST',
        headers: Object.fromEntries(headers.entries()),
        body: {
          ...body,
          stream: body.stream === true ? true : false // 显示流式设置
        }
      });

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

          // 检查响应状态
          if (!response.ok) {
            console.error('流式请求失败，状态码:', response.status);
            // 返回错误信息
            let errorMessage = '请检查API密钥和模型ID是否正确';

            // 根据状态码提供更具体的错误信息
            if (response.status === 401 || response.status === 403) {
              errorMessage = '请提供有效的OpenRouter API Key。在Cline插件中，请确保您输入了真实的OpenRouter API Key，应该以sk-or-v1-开头。请不要使用"any-value"或其他占位符。您可以在 https://openrouter.ai/keys 获取API Key。';
            } else if (response.status === 404) {
              errorMessage = `模型不存在或无法访问：请检查模型 ID "${body.model}"是否正确。`;
            } else if (response.status === 429) {
              errorMessage = '请求频率超限或配额用尽：请稍后再试。';
            }

            return new Response(JSON.stringify({
              error: '流式请求失败',
              status: response.status,
              message: errorMessage,
              documentation: 'https://openrouter.ai/keys'
            }), {
              status: 200, // 返回200状态码，但包含错误信息
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          // 创建一个新的响应，保留原始流
          try {
            // 使用转换流函数处理流式响应
            const transformedStream = new ReadableStream({
              async start(controller) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                // 添加错误标志变量
                let errorSent = false;

                try {
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    // 解码二进制数据
                    const chunk = decoder.decode(value, { stream: true });
                    console.log('收到流式数据块:', chunk);

                    // 如果已经发送过错误消息，则不再处理
                    if (!errorSent) {
                      // 改进错误检测逻辑
                      // 首先检查标准错误格式
                      if (chunk.includes('"error"') || 
                          chunk.includes('Provider returned error') || 
                          chunk.includes('code":429') || 
                          chunk.includes('"code": 429') || 
                          chunk.includes('rate limit') || 
                          chunk.includes('quota exceeded') || 
                          chunk.includes('RESOURCE_EXHAUSTED')) {
                        
                        console.log('检测到错误响应:', chunk);
                        
                        // 提取错误代码(如果存在)
                        let errorCode = null;
                        const codeMatch = chunk.match(/"code"\s*:\s*(\d+)/i) || chunk.match(/"code"\s*:\s*"(\d+)"/i);
                        if (codeMatch && codeMatch[1]) {
                          errorCode = codeMatch[1];
                          console.log('提取到错误代码:', errorCode);
                        }
                        
                        // 提取原始错误消息
                        let rawErrorMessage = null;
                        const messageMatch = chunk.match(/"message"\s*:\s*"([^"]*)"/i);
                        if (messageMatch && messageMatch[1]) {
                          rawErrorMessage = messageMatch[1];
                          console.log('提取到原始错误消息:', rawErrorMessage);
                        }
                        
                        // 提取提供商名称
                        let providerName = null;
                        const providerMatch = chunk.match(/"provider_name"\s*:\s*"([^"]*)"/i) || chunk.match(/provider_name=([^,&]*)/i);
                        if (providerMatch && providerMatch[1]) {
                          providerName = providerMatch[1];
                          console.log('提取到提供商名称:', providerName);
                        }
                        
                        // 提取模型名称
                        let modelName = body.model || '未知模型';
                        const modelMatch = chunk.match(/"model"\s*:\s*"([^"]+)"/i) || chunk.match(/model=([^,&]*)/i);
                        if (modelMatch && modelMatch[1]) {
                          modelName = modelMatch[1];
                          console.log('提取到模型名称:', modelName);
                        }
                        
                        // 错误消息构建 - 确保错误消息中不包含可能破坏JSON格式的字符
                        let errorMessage = '请求处理错误';
                        let errorDetails = '';
                        
                        // 安全处理原始错误消息，移除或转义可能导致JSON解析失败的字符
                        if (rawErrorMessage) {
                          try {
                            // 测试是否为有效JSON字符串
                            JSON.parse(`{"test":"${rawErrorMessage}"}`);
                            errorDetails = rawErrorMessage;
                          } catch (e) {
                            // 如果包含会破坏JSON结构的字符，进行简单处理
                            errorDetails = rawErrorMessage.replace(/["\\]/g, '');
                            console.log('原始错误消息含有特殊字符，已处理');
                          }
                        }

                        let errorFound = false;

                        // 按照错误类型分类处理 - 优先检查特定错误模式
                        // 配额/频率限制错误 (429) - 最常见，最优先检查
                        if (errorCode === '429' || 
                             chunk.includes('code":429') || 
                             chunk.includes('"code": 429') || 
                             chunk.includes('rate limit') || 
                             chunk.includes('quota') || 
                             chunk.includes('RESOURCE_EXHAUSTED') || 
                             chunk.includes('exceeded') || 
                             chunk.includes('limit')) {
                          console.log('检测到频率/配额限制错误');
                          let baseMessage = `配额限制错误 (429): 您已达到模型 "${modelName}" 的使用限制。`;

                          if (providerName) {
                            baseMessage = `${providerName} 配额限制错误 (429): 您已达到模型 "${modelName}" 的使用限制。`;
                          }

                          errorMessage = baseMessage + 
                            "\n\n具体原因：" +
                            "\n1. 您使用的模型已达到免费层级的配额限制" +
                            "\n2. 您的API密钥可能有每分钟/每小时/每天的请求限制" +
                            "\n\n建议解决方案：" +
                            "\n1. 更换模型: 请尝试使用其他模型，如 anthropic/claude-3-haiku 或 deepseek/deepseek-r1-zero:free" +
                            "\n2. 等待配额重置: 大多数免费层级配额每24小时重置一次" +
                            "\n3. 升级账户: 如果您经常使用这个模型，考虑升级您的账户以获得更高的配额";
                          
                          errorCode = '429';
                          errorFound = true;
                        }
                        // 地理位置限制错误
                        else if (chunk.includes('User location is not supported') || 
                            chunk.includes('location not supported') || 
                            chunk.includes('geo')) {
                          console.log('检测到地理位置限制错误');
                          errorMessage = `地理位置限制: ${providerName || '所选模型提供商'} 不支持您的地理位置。\n\n建议解决方案：\n1. 尝试使用其他模型，如 anthropic/claude-3-haiku 或 deepseek/deepseek-r1-zero:free\n2. 使用VPN或代理服务连接到支持的地区`;
                          errorCode = errorCode || '400';
                          errorFound = true;
                        }
                        // 其他错误按错误代码处理
                        else if (errorCode === '400' || chunk.includes('code":400') || chunk.includes('"code":400')) {
                          errorMessage = `错误请求 (400): 无效或缺失参数，或者可能是CORS问题。请检查您的请求参数是否正确。${errorDetails ? '\n\n详细信息: ' + errorDetails : ''}`;
                          errorFound = true;
                        } else if (errorCode === '401' || chunk.includes('code":401') || chunk.includes('"code":401') || chunk.includes('invalid_api_key')) {
                          errorMessage = `凭据无效 (401): OAuth会话过期或API密钥已禁用/无效。请检查您的API Key是否正确。${errorDetails ? '\n\n详细信息: ' + errorDetails : ''}`;
                          errorFound = true;
                        } else if (errorCode === '402' || chunk.includes('code":402') || chunk.includes('"code":402')) {
                          errorMessage = `积分不足 (402): 您的账户或API密钥积分不足。请添加更多积分，然后重试请求。${errorDetails ? '\n\n详细信息: ' + errorDetails : ''}`;
                          errorFound = true;
                        } else if (errorCode === '403' || chunk.includes('code":403') || chunk.includes('"code":403')) {
                          errorMessage = `内容审核 (403): 您选择的模型需要内容审核，您的输入被标记为不适当内容。请修改您的输入内容。${errorDetails ? '\n\n详细信息: ' + errorDetails : ''}`;
                          errorFound = true;
                        } else if (errorCode === '408' || chunk.includes('code":408') || chunk.includes('"code":408')) {
                          errorMessage = `请求超时 (408): 您的请求处理时间过长。请简化您的请求或稍后重试。${errorDetails ? '\n\n详细信息: ' + errorDetails : ''}`;
                          errorFound = true;
                        } else if (errorCode === '502' || chunk.includes('code":502') || chunk.includes('"code":502')) {
                          errorMessage = `模型服务错误 (502): 您选择的模型已关闭，或者我们收到了来自该模型的无效响应。请稍后重试或选择其他模型。${errorDetails ? '\n\n详细信息: ' + errorDetails : ''}`;
                          errorFound = true;
                        } else if (errorCode === '503' || chunk.includes('code":503') || chunk.includes('"code":503')) {
                          errorMessage = `无可用模型 (503): 没有满足路由要求的可用模型提供程序。请尝试使用其他模型。${errorDetails ? '\n\n详细信息: ' + errorDetails : ''}`;
                          errorFound = true;
                        } else if (chunk.includes('model not found') || errorCode === '404' || chunk.includes('code":404') || chunk.includes('"code":404')) {
                          errorMessage = `模型不存在 (404): 模型不存在或无法访问。请检查模型 ID是否正确。${errorDetails ? '\n\n详细信息: ' + errorDetails : ''}`;
                          errorFound = true;
                        } else if (errorDetails) {
                          // 如果有原始错误消息但没有匹配到常见错误，直接使用原始错误消息
                          errorMessage = errorDetails;
                          
                          // 如果有提供商信息，添加到错误消息中
                          if (providerName) {
                            errorMessage = `${providerName} 返回错误: ${errorMessage}`;
                          }
                          errorFound = true;
                        }

                        // 仅在确实找到错误的情况下发送错误消息
                        if (errorFound) {
                          // 构建错误响应对象 - 使用简化的结构，避免嵌套过深
                          const errorObj = {
                            error: {
                              message: errorMessage,
                              code: errorCode || "500",
                              type: "proxy_error"
                            }
                          };
                          
                          // 发送错误消息给客户端 - 确保JSON格式正确
                          try {
                            // 使用JSON.stringify处理错误信息，确保所有特殊字符被正确转义
                            const safeErrorObj = {
                              error: {
                                message: String(errorMessage).replace(/\n/g, '\\n'),
                                code: errorCode || "500",
                                type: "proxy_error",
                                provider: providerName || undefined,
                                model: modelName || undefined
                              }
                            };
                            
                            const jsonString = JSON.stringify(safeErrorObj);
                            // 测试能否正确解析
                            JSON.parse(jsonString);
                            
                            // 格式化为标准SSE数据格式
                            const errorEvent = `data: ${jsonString}\n\n`;
                            controller.enqueue(new TextEncoder().encode(errorEvent));
                            console.log('发送错误消息到客户端:', errorMessage.substring(0, 50) + (errorMessage.length > 50 ? '...' : ''));
                            console.log('发送的JSON:', jsonString.substring(0, 100) + (jsonString.length > 100 ? '...' : ''));
                          } catch (e) {
                            console.error('构建错误消息JSON时出错:', e);
                            
                            // 极简错误响应，确保不会有格式问题
                            const fallbackError = {
                              error: {
                                message: "处理请求时出错，请检查API密钥和模型设置",
                                code: "500"
                              }
                            };
                            
                            const fallbackEvent = `data: ${JSON.stringify(fallbackError)}\n\n`;
                            controller.enqueue(new TextEncoder().encode(fallbackEvent));
                            console.log('发送极简错误消息到客户端');
                          }
                          
                          // 设置错误标志
                          errorSent = true;
                        }
                      }
                    }

                    // 将数据块发送到新流 - 只有在未发送错误消息时才发送原始数据
                    if (!errorSent) {
                    controller.enqueue(value);
                    }
                  }
                  controller.close();
                } catch (error) {
                  console.error('读取流时出错:', error);
                  controller.error(error);
                }
              }
            });

            const newResponse = new Response(transformedStream, {
              status: 200,
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no', // 禁用Nginx缓冲
                ...corsHeaders
              }
            });
            return newResponse;
          } catch (error) {
            console.error('创建流式响应时出错:', error);
            // 如果出错，回退到原始方法
            const newResponse = new Response(response.body, {
              status: 200,
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no', // 禁用Nginx缓冲
                ...corsHeaders
              }
            });
            return newResponse;
          }
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

          // 分析错误类型
          let errorMessage = '';
          let errorDetails = '';

          // 尝试解析错误响应
          try {
            const errorJson = JSON.parse(responseText);
            errorDetails = errorJson.error?.message || errorJson.message || errorJson.error || responseText;
          } catch (e) {
            errorDetails = responseText.substring(0, 200);
          }

          // 根据状态码判断错误类型
          if (response.status === 401 || response.status === 403) {
            errorMessage = `API Key错误或无效：请检查您的OpenRouter API Key是否正确。状态码: ${response.status}`;
            console.error('API Key错误:', errorDetails);
          } else if (response.status === 404) {
            errorMessage = `模型不存在或无法访问：请检查模型 ID "${body.model}"是否正确。状态码: ${response.status}`;
            console.error('模型错误:', errorDetails);
          } else if (response.status === 429) {
            errorMessage = `请求频率超限或配额用尽：请稍后再试。状态码: ${response.status}`;
            console.error('频率限制:', errorDetails);
          } else {
            errorMessage = `OpenRouter响应错误，状态码: ${response.status}`;
            console.error('其他错误:', errorDetails);
          }

          // 添加错误详情
          errorMessage += `\n\n错误详情: ${errorDetails}`;

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
                content: errorMessage
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
