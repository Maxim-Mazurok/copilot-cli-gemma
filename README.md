# Copilot SDK Gemma Local Agent

Minimal Node agent using `@github/copilot-sdk` with a local OpenAI-compatible provider such as vMLX.

## Run

```bash
export COPILOT_PROVIDER_TYPE=openai
export COPILOT_PROVIDER_BASE_URL=http://localhost:8000/v1
export COPILOT_MODEL=gemma
export COPILOT_OFFLINE=true
export COPILOT_PROVIDER_MAX_PROMPT_TOKENS=12000
export COPILOT_PROVIDER_MAX_OUTPUT_TOKENS=1024

npm start -- "Inspect this repo and tell me how to run it"
```

## Defaults

- Verbose assistant output is on.
- Native vMLX thinking is opt-in with `AGENT_THINKING=1`.
- Tool calls and tool results are printed.
- Raw assistant stream deltas are hidden by default because local tool-call markup is noisy.
- Assistant text attached to tool-call turns is hidden by default because it can arrive before tool results and look like a fake final answer.
- RTK is exposed for compact supported commands, not as a general shell.
- vMLX/Gemma sampling stability params are injected by default.
- Tool-call limiting is off by default. Set `AGENT_MAX_TOOL_CALLS` only if you want a guardrail.
- Destructive shell patterns are blocked unless `ALLOW_UNSAFE_COMMANDS=1`.

## Useful Env

```bash
AGENT_THINKING=0          # default: no native thinking request
AGENT_THINKING=1          # request vMLX enable_thinking=true and show reasoning_content
AGENT_SHOW_THINKING=1     # show provider/SDK reasoning if emitted; does not request it
AGENT_NATIVE_THINKING=1   # alias: request provider native thinking
AGENT_REASONING_EFFORT=high # explicit provider reasoning effort
AGENT_SHOW_OUTPUT=0       # quiet final-answer mode
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
AGENT_REPETITION_PENALTY=1.08 # native thinking default: 1.12
AGENT_FREQUENCY_PENALTY=0.25  # native thinking default: 0.35
AGENT_PRESENCE_PENALTY=0.05   # native thinking default: 0.08
AGENT_PARALLEL_TOOL_CALLS=1 # allow provider parallel tool calls; default false
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

When native thinking is enabled, the injected defaults become `repetition_penalty=1.12`, `frequency_penalty=0.35`, and `presence_penalty=0.08`.

`PROXY_FORCE_PARALLEL_TOOLS_FALSE=1` injects `parallel_tool_calls:false` into chat-completion requests so you can test whether the local provider honors single-tool turns.

For this vMLX/Gemma setup, the proxy showed that `parallel_tool_calls:false` is present in the request but vMLX still returns multiple parsed tool calls. Use `AGENT_SINGLE_TOOL_TURNS=1` if you want the harness to force observe-before-next-tool behavior without capping total tool calls.

`AGENT_THINKING=1` displays only provider/SDK reasoning fields such as `reasoning_content`. If vMLX streams direct `content` despite `enable_thinking=true`, there is no real thinking field for the harness to print.
