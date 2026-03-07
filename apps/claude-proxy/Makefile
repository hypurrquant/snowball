LOG_FILE := claude-proxy.log

.PHONY: up down logs

up:
	@lsof -ti:3003 | xargs kill -9 2>/dev/null || true
	CLAUDE_PROXY_PORT=3003 CODEX_MODEL=gpt-5.4 CODEX_REASONING_EFFORT=xhigh \
		nohup node server.js >> $(LOG_FILE) 2>&1 &
	@sleep 1
	@echo "claude-proxy started (log: $(LOG_FILE))"
	@tail -f $(LOG_FILE)

down:
	@lsof -ti:3003 | xargs kill -9 2>/dev/null || true
	@echo "claude-proxy stopped"

logs:
	@tail -f $(LOG_FILE)
