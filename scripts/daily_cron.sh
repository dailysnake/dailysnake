#!/bin/bash
# set -e

# System paths
export HOME=/home/yhc
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
    nvm use default || true
fi
export PATH=$PATH:/usr/local/bin:/usr/bin:/bin:/home/yhc/.local/bin

PROJECT_DIR="/home/yhc/Projects/daily_snake"
FEISHU_SCRIPT="/home/yhc/Projects/AutoBlogComment/auto-fill/.codex/skills/feishu-ops/scripts/send-app-bot-notification.mjs"
FEISHU_CONFIG="/home/yhc/Projects/AutoBlogComment/auto-fill/.codex/skills/feishu-ops/config.json"

cd "$PROJECT_DIR"
echo "==== [$(date)] Starting Daily Snake Generation ===="

# Get today's date
TODAY=$(date +%Y-%m-%d)
THEME_DIR="games/daily-$TODAY"

# 1. Load prompts from text files inside the project
PROMPT_FILE="$PROJECT_DIR/prompts/generate_snake.txt"
if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: Prompt file not found at $PROMPT_FILE"
    exit 1
fi
PROMPT=$(cat "$PROMPT_FILE")

MAX_RETRIES=3
RETRY_COUNT=0
SUCCESS=false

echo "Running initial prompt with agy..."
# Run agy non-interactively with auto-approving permissions
/home/yhc/.local/bin/agy --prompt "$PROMPT" --dangerously-skip-permissions

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    echo "Verifying deployment status..."
    git fetch origin main || true
    
    LOCAL_HASH=$(git rev-parse HEAD)
    REMOTE_HASH=$(git rev-parse origin/main || echo "")
    DIRTY_FILES=$(git status --porcelain)
    
    # If remote matches local and status is clean, then it succeeded!
    if [ "$LOCAL_HASH" = "$REMOTE_HASH" ] && [ -z "$DIRTY_FILES" ]; then
        SUCCESS=true
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        break
    fi
    
    echo "Verification failed (Local: $LOCAL_HASH, Remote: $REMOTE_HASH, Dirty: $DIRTY_FILES). Retrying ($RETRY_COUNT/$MAX_RETRIES)..."
    
    # Continue the session and tell it to fix the issue and push
    RETRY_PROMPT_FILE="$PROJECT_DIR/prompts/retry_snake.txt"
    if [ ! -f "$RETRY_PROMPT_FILE" ]; then
        echo "Error: Retry prompt file not found at $RETRY_PROMPT_FILE"
        exit 1
    fi
    RETRY_PROMPT=$(cat "$RETRY_PROMPT_FILE")
    /home/yhc/.local/bin/agy --continue --prompt "$RETRY_PROMPT" --dangerously-skip-permissions
done

if [ "$SUCCESS" = true ]; then
    echo "==== [$(date)] Daily Snake successfully generated and pushed! ===="
    
    # Get the theme name from git commit or latest game folder if possible
    THEME_INFO="全新的贪吃蛇创意变体已集成发布"
    
    HTTP_PROXY="" HTTPS_PROXY="" http_proxy="" https_proxy="" node "$FEISHU_SCRIPT" \
        --config-file "$FEISHU_CONFIG" \
        --level normal \
        --title "📅 每日贪吃蛇发布成功" \
        --message "今天 ($TODAY) 的贪吃蛇创意变体已成功自动生成、集成并推送到 GitHub 仓库！线上已自动通过 Cloudflare Pages 完成部署。\n\n访问地址: https://daily-snake.pages.dev" \
        --source "daily-snake-cron"
else
    echo "==== [$(date)] Daily Snake generation FAILED after $MAX_RETRIES retries. ===="
    
    HTTP_PROXY="" HTTPS_PROXY="" http_proxy="" https_proxy="" node "$FEISHU_SCRIPT" \
        --config-file "$FEISHU_CONFIG" \
        --level normal \
        --title "⚠️ 每日贪吃蛇发布失败" \
        --message "今天 ($TODAY) 的贪吃蛇定时任务在重试 $MAX_RETRIES 次后未能成功推送到 GitHub。请开发人员登录服务器进行排查。\n项目路径: /home/yhc/Projects/daily_snake" \
        --source "daily-snake-cron"
    exit 1
fi
