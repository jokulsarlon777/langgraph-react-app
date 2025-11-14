import { Client } from "@langchain/langgraph-sdk";

const LANGGRAPH_API_URL =
  process.env.NEXT_PUBLIC_LANGGRAPH_URL || "http://127.0.0.1:2024";
const LANGGRAPH_ASSISTANT_ID =
  process.env.NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID || "Deep Researcher";

export interface ThreadMetadata {
  title: string;
  created_at: string;
  message_count: number;
  messages: Message[];
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  tags?: string[];
}

export interface Thread {
  thread_id: string;
  values?: {
    messages?: any[];
  };
  created_at?: string;
}

export function createLangGraphClient(apiUrl: string, apiKey?: string | null) {
  return new Client({
    apiUrl,
    apiKey: apiKey || undefined,
  });
}

export async function checkServerHealth(
  client: Client
): Promise<boolean> {
  try {
    const assistants = await client.assistants.search();
    return assistants.length > 0;
  } catch (e) {
    console.error("Server health check failed:", e);
    return false;
  }
}

export async function createThread(client: Client): Promise<Thread | null> {
  try {
    const thread = await client.threads.create();
    return thread as Thread;
  } catch (e) {
    console.error("Thread creation failed:", e);
    return null;
  }
}

export async function loadThreadMessages(
  client: Client,
  threadId: string
): Promise<Message[]> {
  try {
    const state = await client.threads.getState(threadId);

    let messages: any[] = [];
    if (Array.isArray(state)) {
      messages = state;
    } else if (typeof state === "object" && state !== null) {
      messages = (state as any).values?.messages || [];
    }

    const formattedMessages: Message[] = [];
    for (const msg of messages) {
      if (typeof msg === "object" && msg !== null) {
        const role = msg.type || msg.role || "";
        const content = msg.content || "";
        const createdAt =
          (msg.created_at as string | undefined) ||
          (msg.timestamp as string | undefined) ||
          new Date().toISOString();
        const tags = Array.isArray((msg as any).tags)
          ? ((msg as any).tags as string[])
          : undefined;

        if (role.toLowerCase().includes("human") || role.toLowerCase().includes("user")) {
          formattedMessages.push({
            role: "user",
            content: String(content),
            timestamp: createdAt,
            tags,
          });
        } else if (role.toLowerCase().includes("ai") || role.toLowerCase().includes("assistant")) {
          formattedMessages.push({
            role: "assistant",
            content: String(content),
            timestamp: createdAt,
            tags,
          });
        }
      }
    }

    return formattedMessages;
  } catch (e) {
    console.error("Failed to load thread messages:", e);
    return [];
  }
}

export async function getServerThreads(
  client: Client,
  assistantId: string
): Promise<Thread[]> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      assistantId
    );

    const metadata = isUuid
      ? { assistant_id: assistantId }
      : { graph_id: assistantId };

    const threads = await client.threads.search({
      metadata,
      limit: 100,
    });

    return threads as Thread[];
  } catch (e) {
    console.error("Failed to get server threads:", e);
    return [];
  }
}

export async function* streamMessage(
  client: Client,
  threadId: string,
  assistantId: string,
  message: string
): AsyncGenerator<any, void, unknown> {
  const inputData = {
    messages: [
      {
        role: "user",
        content: message,
      },
    ],
  };

  const stream = await client.runs.stream(threadId, assistantId, {
    input: inputData,
    streamMode: ["updates", "values", "messages"],
  });

  for await (const chunk of stream) {
    yield chunk;
  }
}

export { LANGGRAPH_API_URL, LANGGRAPH_ASSISTANT_ID };

