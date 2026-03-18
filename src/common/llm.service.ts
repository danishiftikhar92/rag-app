import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly llm: ChatOllama;

  constructor(private readonly config: ConfigService) {
    const baseUrl =
      this.config.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';
    const model = this.config.get<string>('OLLAMA_MODEL') || 'phi3:mini';

    this.llm = new ChatOllama({
      baseUrl,
      model,
      temperature: 0.3,
    });

    this.logger.log(`LLM configured: ${model} at ${baseUrl}`);
  }

  async generate(prompt: string, context: string): Promise<string> {
    const systemPrompt = `You are a helpful AI assistant. Answer the user's question based on the provided context. 
If the context doesn't contain enough information to answer, say so honestly.
Always be accurate and cite the source when possible.

Context:
${context}`;

    const response = await this.llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(prompt),
    ]);

    return response.content as string;
  }

  async generateWithSources(
    prompt: string,
    chunks: { text: string; metadata: Record<string, any> }[],
  ): Promise<{ answer: string; sources: Record<string, any>[] }> {
    const context = chunks
      .map(
        (chunk, i) =>
          `[Source ${i + 1}] (${chunk.metadata.source_type || 'unknown'} - ${chunk.metadata.source || 'N/A'}):\n${chunk.text}`,
      )
      .join('\n\n---\n\n');

    const answer = await this.generate(prompt, context);

    const sources = chunks.map((chunk) => ({
      source: chunk.metadata.source || 'Unknown',
      source_type: chunk.metadata.source_type || 'unknown',
      collection: chunk.metadata.collection_name || 'Unknown',
    }));

    const uniqueSources = sources.filter(
      (s, i, arr) =>
        arr.findIndex(
          (x) => x.source === s.source && x.source_type === s.source_type,
        ) === i,
    );

    return { answer, sources: uniqueSources };
  }
}
