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
- Thinking/reasoning mode is on.
- Tool calls and tool results are printed.
- Raw assistant stream deltas are hidden by default because local tool-call markup is noisy.
- RTK is exposed as the preferred compact command tool.
- Destructive shell patterns are blocked unless `ALLOW_UNSAFE_COMMANDS=1`.

## Useful Env

```bash
AGENT_THINKING=0          # disable reasoning request
AGENT_SHOW_OUTPUT=0       # quiet final-answer mode
AGENT_SHOW_THINKING=0     # hide reasoning events/text
AGENT_SHOW_RAW_DELTAS=1   # show raw streamed assistant/tool markup
AGENT_SHOW_EVENTS=1       # useful event summary
AGENT_SHOW_EVENTS=raw     # full SDK event stream
AGENT_LOG_STREAM=stderr   # send verbose log stream to stderr
TOOL_FALLBACK_MS=0        # default: disabled, wait for idle/overall timeout
AGENT_TIMEOUT_MS=300000   # whole-run timeout
AGENT_STOP_TIMEOUT_MS=3000 # force exit if SDK shutdown hangs
```

## RTK Usage

The agent prompt is intentionally tiny. RTK is the compact command path:

```text
rtk command: read -l aggressive index.js
rtk command: grep "defineTool" index.js
rtk command: ls
```

RTK handles output reduction. The agent code does not manually strip command output.
