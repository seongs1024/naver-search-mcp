#!/usr/bin/env node

import pkg from "../package.json" with { type: "json" };

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { NaverSearchClient } from "./clients/naver-search.client.js";
import { searchTools } from "./tools/search.tools.js";
import { datalabTools } from "./tools/datalab.tools.js";
import { searchToolHandlers } from "./handlers/search.handlers.js";
import { datalabToolHandlers } from "./handlers/datalab.handlers.js";

import { Hono } from "hono";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import { randomUUID } from "node:crypto";

// Environment variable validation
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
  console.error(
    "[MCP] Error: NAVER_CLIENT_ID and NAVER_CLIENT_SECRET environment variables are required",
  );
  process.exit(1);
}

// Initialize Naver Search Client
NaverSearchClient.getInstance().initialize({
  clientId: NAVER_CLIENT_ID,
  clientSecret: NAVER_CLIENT_SECRET,
});
console.error("[MCP] NaverSearchClient initialized");

// Map to store transports by session ID for multi-client support
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Error response helper function
function createErrorResponse(error: unknown): {
  content: Array<{ type: string; text: string }>;
  isError: boolean;
} {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error("[MCP] API Error:", errorMessage);
  return {
    content: [{ type: "text", text: `Error: ${errorMessage}` }],
    isError: true,
  };
}

// Creates a new MCP Server instance for each session to ensure isolation
function createMcpServer() {
  const server = new Server(
    {
      name: "naver-search",
      version: pkg.version,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Register tool listing handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error("[MCP] ListToolsRequestSchema handler called");
    return {
      tools: [...searchTools, ...datalabTools],
    };
  });

  const toolHandlers: Record<string, (args: any) => Promise<any>> = {
    ...searchToolHandlers,
    ...datalabToolHandlers,
  };

  // Register tool calling handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;
      console.error(`[MCP] Executing tool: ${name} with args:`, args);

      if (!args) {
        throw new Error("Arguments are required");
      }

      const handler = toolHandlers[name];
      if (!handler) throw new Error(`Unknown tool: ${name}`);
      const result = await handler(args);

      console.error(`[MCP] Tool ${name} executed successfully`);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  return server;
}

const app = new Hono();

app.use("*", logger()); // And that this line is here

// Handle POST requests for client-to-server communication
app.post("/mcp/", async (c) => {
  const { req, res } = toReqRes(c.req.raw);
  const body = await c.req.json().catch(() => ({}));

  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        transports[newSessionId] = transport;
        console.error(`[MCP] New session initialized: ${newSessionId}`);
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        console.error(`[MCP] Session closed: ${transport.sessionId}`);
        delete transports[transport.sessionId];
      }
    };

    // Each session gets its own server instance for isolation
    const server = createMcpServer();
    await server.connect(transport);
    console.error("[MCP] New server instance connected to transport");
  } else {
    console.error("[MCP] Bad Request: Invalid session or initialization");
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message:
            "Bad Request: No valid session ID provided or not an initialization request",
        },
        id: "id" in body && body.id ? body.id : null,
      }),
    );
    return toFetchResponse(res);
  }

  await transport.handleRequest(req, res, body);
  return toFetchResponse(res);
});

// Reusable handler for GET and DELETE session-based requests
const handleSessionRequest = async (c: any) => {
  const { req, res } = toReqRes(c.req.raw);
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId || !transports[sessionId]) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "text/plain");
    res.end("Invalid or missing session ID");
    return toFetchResponse(res);
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
  return toFetchResponse(res);
};

// Handle GET requests for server-to-client notifications via SSE
app.get("/mcp/", handleSessionRequest);

// Handle DELETE requests for session termination
app.delete("/mcp/", handleSessionRequest);

async function runServer() {
  // Global error handlers
  process.on("uncaughtException", (error) => {
    console.error("[MCP] Uncaught Exception:", error);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("[MCP] Unhandled Rejection at:", promise, "reason:", reason);
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

  console.error(`[MCP] Starting server...`);
  serve(
    {
      fetch: app.fetch,
      port: port,
    },
    (info) => {
      console.error(
        `[MCP] Naver Search MCP Server running on http://${info.address}:${info.port}`,
      );
    },
  );
}

runServer().catch((error) => {
  console.error("[MCP] Fatal error running server:", error);
  process.exit(1);
});
