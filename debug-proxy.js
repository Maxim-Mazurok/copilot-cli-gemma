import http from "node:http";
import fs from "node:fs";
import { inspect } from "node:util";

const upstream = new URL(process.env.PROXY_UPSTREAM || "http://localhost:8000");
const port = Number(process.env.PROXY_PORT || 8999);
const logFile = process.env.PROXY_LOG_FILE;
const forceParallelToolCallsFalse = ["1", "true", "yes", "on"].includes(
  String(process.env.PROXY_FORCE_PARALLEL_TOOLS_FALSE || "").toLowerCase(),
);
const injectSamplingParams = !["0", "false", "no", "off"].includes(
  String(process.env.PROXY_INJECT_SAMPLING ?? "1").toLowerCase(),
);
const samplingParams = {
  temperature: envNumber(0.1, "PROXY_TEMPERATURE", "AGENT_TEMPERATURE", "COPILOT_TEMPERATURE"),
  repetition_penalty: envNumber(1.08, "PROXY_REPETITION_PENALTY", "AGENT_REPETITION_PENALTY", "COPILOT_REPETITION_PENALTY"),
  frequency_penalty: envNumber(0.25, "PROXY_FREQUENCY_PENALTY", "AGENT_FREQUENCY_PENALTY", "COPILOT_FREQUENCY_PENALTY"),
  presence_penalty: envNumber(0.05, "PROXY_PRESENCE_PENALTY", "AGENT_PRESENCE_PENALTY", "COPILOT_PRESENCE_PENALTY"),
};
let requestSeq = 0;

function now() {
  return new Date().toISOString();
}

function envNumber(defaultValue, ...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value === undefined || value === "") continue;
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return defaultValue;
}

function prettyBody(body) {
  if (!body) return "";
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

function log(id, ...parts) {
  const line = `[${now()}] [${id}] ${parts.join(" ")}`;
  console.log(line);
  if (logFile) fs.appendFileSync(logFile, `${line}\n`);
}

function outboundBodyFor(pathname, body) {
  if (!pathname.endsWith("/chat/completions") || body.length === 0) {
    return body;
  }

  try {
    const parsed = JSON.parse(body.toString("utf8"));
    if (!parsed || typeof parsed !== "object") return body;
    if (injectSamplingParams) {
      Object.assign(parsed, samplingParams);
    }
    if (forceParallelToolCallsFalse && Array.isArray(parsed.tools) && parsed.tools.length > 0) {
      parsed.parallel_tool_calls = false;
    }
    return Buffer.from(JSON.stringify(parsed));
  } catch {
    return body;
  }
}

const server = http.createServer((clientReq, clientRes) => {
  const id = ++requestSeq;
  const bodyParts = [];

  clientReq.on("data", (chunk) => {
    bodyParts.push(chunk);
  });

  clientReq.on("end", () => {
    const body = Buffer.concat(bodyParts);
    const target = new URL(clientReq.url || "/", upstream);

    log(id, `==== REQUEST ${clientReq.method} ${target.pathname}${target.search}`);
    log(id, "headers", inspect(clientReq.headers, { depth: null, colors: false, breakLength: 140 }));
    const outboundBody = outboundBodyFor(target.pathname, body);
    if (body.length > 0) log(id, "\n" + prettyBody(outboundBody.toString("utf8")));

    const headers = { ...clientReq.headers };
    delete headers.host;
    headers.host = upstream.host;
    headers["content-length"] = String(outboundBody.length);

    const upstreamReq = http.request(
      {
        protocol: upstream.protocol,
        hostname: upstream.hostname,
        port: upstream.port || (upstream.protocol === "https:" ? 443 : 80),
        method: clientReq.method,
        path: `${target.pathname}${target.search}`,
        headers,
      },
      (upstreamRes) => {
        log(id, `==== RESPONSE ${upstreamRes.statusCode}`);
        log(id, "headers", inspect(upstreamRes.headers, { depth: null, colors: false, breakLength: 140 }));

        clientRes.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
        upstreamRes.on("data", (chunk) => {
          const text = chunk.toString("utf8");
          log(id, "---- RAW RESPONSE CHUNK ----\n" + text);
          clientRes.write(chunk);
        });
        upstreamRes.on("end", () => {
          log(id, "==== RESPONSE END");
          clientRes.end();
        });
      },
    );

    upstreamReq.on("error", (error) => {
      log(id, "upstream error", error.stack || error.message);
      clientRes.writeHead(502, { "content-type": "application/json" });
      clientRes.end(JSON.stringify({ error: error.message }));
    });

    upstreamReq.end(outboundBody);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[${now()}] debug proxy listening on http://127.0.0.1:${port} -> ${upstream.href}`);
});
