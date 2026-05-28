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

npm start -- "Check what time is it, if it is past 4pm - check if google.com accessible, otherwise check if x.com is accessible. at the end write executive report about what you found out into report.md file"
```

## Defaults

- Verbose assistant output is on.
- Thinking/reasoning mode is on.
- Tool calls and tool results are printed.
- RTK is exposed as the preferred compact command tool.
- Raw `curl`/`wget` through `bash` is blocked; use `rtk` for web checks.

## Useful Env

```bash
AGENT_THINKING=0          # disable reasoning request
AGENT_SHOW_OUTPUT=0       # quiet final-answer mode
AGENT_SHOW_THINKING=0     # hide reasoning events/text
AGENT_SHOW_EVENTS=1       # useful event summary
AGENT_SHOW_EVENTS=raw     # full SDK event stream
TOOL_FALLBACK_MS=0        # default: disabled, wait for idle/overall timeout
AGENT_TIMEOUT_MS=300000   # whole-run timeout
AGENT_STOP_TIMEOUT_MS=3000 # force exit if SDK shutdown hangs
```

## RTK Pattern

The agent prompt is intentionally tiny. For compact output it should use `rtk` first:

```text
rtk command: curl -sS -o /dev/null -w 'http_code=%{http_code}\n' --max-time 5 https://www.google.com
rtk command: read -l aggressive index.js
```

RTK handles output reduction. The agent code does not manually strip cookies or headers from RTK output.
