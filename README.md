# Copilot SDK Local Agent

Minimal Node agent using `@github/copilot-sdk` with a local OpenAI-compatible provider such as oMLX or vMLX.

## Run

```bash
export COPILOT_PROVIDER_TYPE=openai
export COPILOT_PROVIDER_BASE_URL=http://127.0.0.1:8001/v1
export COPILOT_MODEL=Qwen3.6-27B-OptiQ-4bit
export COPILOT_OFFLINE=true
export COPILOT_PROVIDER_MAX_PROMPT_TOKENS=12000
export COPILOT_PROVIDER_MAX_OUTPUT_TOKENS=1024

npm start -- "Inspect this repo and tell me how to run it"
```

Current code defaults match the oMLX/Qwen values above. Override the env vars for other local providers.

## Defaults

- Verbose assistant output is on.
- Native provider thinking is on by default. Disable with `AGENT_THINKING=0`.
- Tool calls and tool results are printed.
- Raw assistant stream deltas are hidden by default because local tool-call markup is noisy.
- Assistant text attached to tool-call turns is hidden by default because it can arrive before tool results and look like a fake final answer.
- RTK is exposed for compact supported commands, not as a general shell.
- Sampling stability params are injected by default.
- A local provider proxy is enabled by default for OpenAI providers. It normalizes oMLX stream chunks for Copilot SDK, sends keepalives, and serializes chat-completion requests.
- Tool-call limiting is off by default. Set `AGENT_MAX_TOOL_CALLS` only if you want a guardrail.
- Destructive shell patterns are blocked unless `ALLOW_UNSAFE_COMMANDS=1`.

## Useful Env

```bash
AGENT_THINKING=0          # disable native thinking request/output
AGENT_THINKING=1          # default: request provider enable_thinking=true and show reasoning_content
AGENT_SHOW_THINKING=1     # show provider/SDK reasoning if emitted; does not request it
AGENT_NATIVE_THINKING=1   # alias: request provider native thinking
AGENT_REASONING_EFFORT=high # explicit provider reasoning effort
AGENT_SHOW_OUTPUT=0       # quiet final-answer mode
AGENT_STREAMING=0         # disable SDK streaming if a provider is badly broken
AGENT_SHOW_THINKING=0     # hide reasoning events/text even if present
AGENT_TEE_PROVIDER_REASONING=0 # disable raw SSE reasoning_content tee
AGENT_SHOW_TOOL_TEXT=1    # show assistant text attached to tool-call turns
AGENT_SHOW_RAW_DELTAS=1   # show raw streamed assistant/tool markup
AGENT_SHOW_EVENTS=1       # useful event summary
AGENT_SHOW_EVENTS=raw     # full SDK event stream
AGENT_SHOW_EVENT_DATA=1   # include event JSON with shown events
AGENT_LOG_STREAM=stderr   # send verbose log stream to stderr
AGENT_INJECT_SAMPLING=0   # disable OpenAI chat-completion sampling injection
AGENT_TEMPERATURE=0.1
AGENT_REPETITION_PENALTY=1.08 # native thinking default: 1.2
AGENT_FREQUENCY_PENALTY=0.25  # native thinking default: 0.35
AGENT_PRESENCE_PENALTY=0.05   # native thinking default: 0.08
AGENT_PARALLEL_TOOL_CALLS=1 # allow provider parallel tool calls; default false
AGENT_PROVIDER_SINGLE_FLIGHT=0 # disable proxy serialization; default true
AGENT_PROVIDER_PREEMPTIVE_STREAM=0 # disable proxy SSE prelude; default true
AGENT_PROVIDER_HEARTBEAT_MS=5000 # proxy OpenAI-compatible keepalive interval
AGENT_PROVIDER_TIMEOUT_MS=600000 # proxy upstream timeout
AGENT_PROVIDER_DEBUG=1    # print provider proxy request boundaries
AGENT_PROVIDER_TRACE_SSE=1 # print first normalized SSE chunks
AGENT_SDK_LOG_LEVEL=debug # pass SDK log level through
TOOL_FALLBACK_MS=0        # default: disabled, wait for idle/overall timeout
AGENT_MAX_TOOL_CALLS=40   # optional guardrail; unset means no tool-call cap
AGENT_SINGLE_TOOL_TURNS=1 # reject extra same-turn tool calls; no total-call cap
AGENT_TIMEOUT_MS=300000   # whole-run timeout
AGENT_STOP_TIMEOUT_MS=3000 # force exit if SDK shutdown hangs
```

## RTK Usage

The agent prompt is intentionally tiny. RTK is the compact path for supported commands:

```text
rtk command: read -l aggressive index.js
rtk command: grep "defineTool" index.js
rtk command: ls
```

RTK handles output reduction. The agent code does not manually strip command output.

## Debug Proxy

```bash
npm run proxy
COPILOT_PROVIDER_BASE_URL=http://localhost:8999/v1 npm start -- "your prompt"
```

The proxy logs provider request JSON and raw streamed response chunks. It also injects the same sampling params by default.

Useful proxy flags:

```bash
PROXY_UPSTREAM=http://127.0.0.1:8001 node debug-proxy.js
PROXY_LOG_FILE=debug-proxy.log node debug-proxy.js
PROXY_INJECT_SAMPLING=0 node debug-proxy.js
PROXY_FORCE_PARALLEL_TOOLS_FALSE=1 node debug-proxy.js
PROXY_NATIVE_THINKING=1 node debug-proxy.js
```

Sampling defaults:

```json
{
  "temperature": 0.1,
  "repetition_penalty": 1.08,
  "frequency_penalty": 0.25,
  "presence_penalty": 0.05
}
```

When native thinking is enabled, the injected defaults become `repetition_penalty=1.2`, `frequency_penalty=0.35`, and `presence_penalty=0.08`.

`PROXY_FORCE_PARALLEL_TOOLS_FALSE=1` injects `parallel_tool_calls:false` into chat-completion requests so you can test whether the local provider honors single-tool turns.

For oMLX/Qwen, the in-process provider proxy also fixes two stream-shape issues that trigger Copilot SDK retries: missing `finish_reason:null` on non-final chunks and changing chunk IDs between keepalive and real completion chunks.

`AGENT_THINKING=1` displays provider/SDK reasoning fields such as `reasoning_content`. It does not add prompt-based fake thinking.
