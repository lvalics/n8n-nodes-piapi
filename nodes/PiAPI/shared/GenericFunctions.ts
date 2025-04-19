import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	NodeApiError,
	JsonObject,
} from 'n8n-workflow';

export async function piApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const credentials = await this.getCredentials('piAPIApi');
	
	const options: IDataObject = {
		method,
		body,
		qs,
		url: `https://api.piapi.ai${resource}`,
		headers: {
			'Content-Type': 'application/json',
			'X-API-Key': credentials.apiKey as string,
		},
		json: true,
	};

	try {
		return await this.helpers.request!(options as JsonObject);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

// Special request function for LLM API endpoints which require Bearer token auth
export async function llmApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	body: IDataObject = {},
) {
	const credentials = await this.getCredentials('piAPIApi');
	
	const options: IDataObject = {
		method: 'POST',
		body,
		url: 'https://api.piapi.ai/v1/chat/completions',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${credentials.apiKey as string}`,
		},
		json: true,
	};

	try {
		return await this.helpers.request!(options as JsonObject);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function waitForTaskCompletion(
	this: IExecuteFunctions,
	taskId: string,
	maxRetries = 20,
	retryInterval = 3000,
): Promise<IDataObject> {
	let retries = 0;
	
	while (retries < maxRetries) {
		const response = await piApiRequest.call(
			this,
			'GET',
			`/api/v1/task/${taskId}`,
		);
		
		const status = response.data?.status;
		
		if (status === 'success' || status === 'completed') {
			return response.data;
		}
		
		if (status === 'failed') {
			throw new Error(`Task failed: ${JSON.stringify(response.data?.error || 'Unknown error')}`);
		}
		
		// Wait before trying again
		await new Promise(resolve => setTimeout(resolve, retryInterval));
		retries++;
	}
	
	throw new Error(`Task timed out after ${maxRetries} retries`);
}

/**
 * Extracts image URL from GPT-4o response content, either from markdown image syntax
 * or from the response data containing image URLs directly
 * @param content - The response content string from GPT-4o
 * @returns The extracted image URL or null if not found
 */
export function extractImageUrlFromResponse(content: string): string | null {
  // First, try the markdown pattern
  const imageUrlPattern = /!\[.*?\]\((.*?)\)/;
  const markdownMatch = content.match(imageUrlPattern);
  if (markdownMatch) return markdownMatch[1];
  
  // If no markdown match, try to parse the response as JSON chunks
  try {
    // Look for image URLs in the data stream
    const imageUrlJsonPattern = /"image(?:_url|Url|URL)"\s*:\s*"(https?:\/\/[^"]+)"/;
    const jsonMatch = content.match(imageUrlJsonPattern);
    if (jsonMatch) return jsonMatch[1];
    
    // Look for URLs in the streamed content
    const urlPattern = /https?:\/\/\S+\.(?:png|jpe?g|gif|webp|bmp)/i;
    const urlMatch = content.match(urlPattern);
    if (urlMatch) return urlMatch[0];
    
    // Try to parse the data chunks if they contain the full response
    const dataChunks = content.split('\n\n').filter(chunk => chunk.startsWith('data: '));
    for (const chunk of dataChunks) {
      try {
        const jsonStr = chunk.substring(6); // Remove 'data: ' prefix
        const jsonData = JSON.parse(jsonStr);
        
        // Check if the chunk contains choices with content that has URLs
        if (jsonData.choices && jsonData.choices[0]?.delta?.content) {
          const deltaContent = jsonData.choices[0].delta.content;
          const contentUrlMatch = deltaContent.match(urlPattern);
          if (contentUrlMatch) return contentUrlMatch[0];
        }
      } catch (e) {
        // Ignore parsing errors for individual chunks
      }
    }
    
    // If we're here, we couldn't find an image URL
    return null;
  } catch (e) {
    // If all attempts fail, return null
    return null;
  }
}

/**
 * Checks if a GPT-4o response indicates a generation failure
 * @param content - The response content string from GPT-4o
 * @returns Boolean indicating if generation failed
 */
export function isGenerationFailed(content: string): boolean {
  return content.includes('Generation failed') || content.includes('Failure reason');
}

/**
 * Extracts failure details from GPT-4o response
 * @param content - The error response content string
 * @returns Object containing the reason and suggestion
 */
export function extractFailureDetails(content: string): { reason: string; suggestion: string } {
  const reason = content.match(/Reason: (.*?)(?:\n|$)/i)?.[1] || 'Unknown reason';
  const suggestion = content.match(/Suggestion: (.*?)(?:\n|$)/i)?.[1] || '';
  return { reason, suggestion };
}

/**
 * Processes streamed GPT-4o response to extract full content
 * @param streamResponse - The full streamed response from GPT-4o
 * @returns The extracted complete content string
 */
export function processStreamedResponse(streamResponse: string): string {
  let fullContent = '';
  
  const dataChunks = streamResponse.split('\n\n').filter(chunk => chunk.startsWith('data: '));
  for (const chunk of dataChunks) {
    try {
      const jsonStr = chunk.substring(6); // Remove 'data: ' prefix
      const jsonData = JSON.parse(jsonStr);
      
      // Extract content from delta if available
      if (jsonData.choices && jsonData.choices[0]?.delta?.content) {
        fullContent += jsonData.choices[0].delta.content;
      }
    } catch (e) {
      // Skip chunks that can't be parsed
    }
  }
  
  return fullContent;
}
