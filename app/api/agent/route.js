import Anthropic from '@anthropic-ai/sdk';
import { getFile, commitFile, listFiles } from '../../../lib/github';

export const runtime = 'nodejs';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a website editor. You are editing a statically rebuilt website stored in a GitHub repository. The site is deployed on Vercel and any commit you make will trigger an automatic redeploy. Fulfill edit requests by reading the relevant files, making precise changes, and committing them. Always read the file before editing. Only edit files that already exist. Make the smallest change that fulfills the request. After committing, tell the user exactly what changed and which file. If a request is ambiguous, ask one clarifying question. If a request cannot be done with static HTML/CSS, explain why.`;

const tools = [
  {
    name: 'get_file',
    description:
      'Read the contents of a file from the GitHub repository. Use this before editing to get the current content.',
    input_schema: {
      type: 'object',
      properties: {
        repo: {
          type: 'string',
          description: 'The GitHub repository name (without owner prefix)',
        },
        path: {
          type: 'string',
          description: 'The file path within the repository (e.g. "index.html" or "css/style.css")',
        },
      },
      required: ['repo', 'path'],
    },
  },
  {
    name: 'commit_file',
    description:
      'Write and commit a file to the GitHub repository. This will trigger an automatic Vercel redeploy. Always read the file first, then make the minimal change and commit.',
    input_schema: {
      type: 'object',
      properties: {
        repo: {
          type: 'string',
          description: 'The GitHub repository name (without owner prefix)',
        },
        path: {
          type: 'string',
          description: 'The file path within the repository',
        },
        content: {
          type: 'string',
          description: 'The full new content of the file',
        },
        message: {
          type: 'string',
          description: 'A short git commit message describing the change',
        },
      },
      required: ['repo', 'path', 'content', 'message'],
    },
  },
  {
    name: 'list_files',
    description: 'List files in a directory of the GitHub repository. Use to discover available files.',
    input_schema: {
      type: 'object',
      properties: {
        repo: {
          type: 'string',
          description: 'The GitHub repository name',
        },
        path: {
          type: 'string',
          description: 'Directory path (empty string for root)',
        },
      },
      required: ['repo'],
    },
  },
];

async function processTool(toolName, toolInput) {
  if (toolName === 'get_file') {
    const { content, sha } = await getFile(toolInput.repo, toolInput.path);
    return { content, sha };
  }

  if (toolName === 'commit_file') {
    const result = await commitFile(
      toolInput.repo,
      toolInput.path,
      toolInput.content,
      toolInput.message
    );
    return { success: true, commit: result?.commit?.sha || 'committed' };
  }

  if (toolName === 'list_files') {
    const files = await listFiles(toolInput.repo, toolInput.path || '');
    return { files };
  }

  throw new Error(`Unknown tool: ${toolName}`);
}

export async function POST(request) {
  try {
    const { message, history = [], repoName } = await request.json();

    if (!message || !repoName) {
      return Response.json(
        { error: 'Missing required fields: message and repoName' },
        { status: 400 }
      );
    }

    // Build the messages array from history + new message
    const messages = [
      ...history,
      { role: 'user', content: message },
    ];

    let committed = false;
    let reply = '';
    let currentMessages = [...messages];

    // Agentic loop — keep going until we get a final text response
    while (true) {
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools,
        messages: currentMessages,
      });

      // Collect text content from the response
      const textBlocks = response.content.filter((b) => b.type === 'text');
      const toolBlocks = response.content.filter((b) => b.type === 'tool_use');

      if (response.stop_reason === 'end_turn' || toolBlocks.length === 0) {
        // Final response
        reply = textBlocks.map((b) => b.text).join('\n');
        break;
      }

      // Process tool calls
      const toolResults = [];
      for (const toolBlock of toolBlocks) {
        let toolResult;
        try {
          toolResult = await processTool(toolBlock.name, toolBlock.input);
          if (toolBlock.name === 'commit_file') {
            committed = true;
          }
        } catch (err) {
          toolResult = { error: err.message };
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Add assistant response + tool results to messages
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ];
    }

    return Response.json({ reply, committed });
  } catch (err) {
    console.error('Agent error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
