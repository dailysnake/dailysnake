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

# Proxy settings for network requests (Google access from China)
export http_proxy="http://127.0.0.1:7890"
export https_proxy="http://127.0.0.1:7890"
export HTTP_PROXY="http://127.0.0.1:7890"
export HTTPS_PROXY="http://127.0.0.1:7890"
export no_proxy="127.0.0.1,localhost,192.168.*,172.*,10.*"
export NO_PROXY="127.0.0.1,localhost,192.168.*,172.*,10.*"

PROJECT_DIR="/home/yhc/Projects/daily_snake"
AGY_BIN="${AGY_BIN:-/home/yhc/.local/bin/agy}"
FEISHU_SCRIPT="${FEISHU_SCRIPT:-/home/yhc/Projects/AutoBlogComment/auto-fill/.codex/skills/feishu-ops/scripts/send-app-bot-notification.mjs}"
FEISHU_CONFIG="${FEISHU_CONFIG:-/home/yhc/Projects/AutoBlogComment/auto-fill/.codex/skills/feishu-ops/config.json}"

cd "$PROJECT_DIR"
echo "==== [$(date)] Starting Daily Snake Generation ===="

# Wait for internet connectivity to Google using exponential backoff (resolves boot/wakeup/network downtime issues)
DELAY=60       # Initial delay: 1 minute (60s)
MAX_DELAY=3600 # Maximum delay: 1 hour (3600s)
FAILED_HOURS=0

echo "Checking network connectivity to Google OAuth server..."
while true; do
    if curl -s --connect-timeout 10 https://oauth2.googleapis.com > /dev/null; then
        echo "Network connectivity to Google is OK."
        break
    fi
    
    # If the current delay has reached the maximum (1 hour), send a status update to Feishu
    if [ $DELAY -eq $MAX_DELAY ]; then
        FAILED_HOURS=$((FAILED_HOURS + 1))
        echo "Google OAuth server is still unreachable after $FAILED_HOURS hour(s)."
        
        # Send Feishu status notification
        HTTP_PROXY="" HTTPS_PROXY="" http_proxy="" https_proxy="" node "$FEISHU_SCRIPT" \
            --config-file "$FEISHU_CONFIG" \
            --level normal \
            --title "⚠️ 每日贪吃蛇 - 持续断网报警" \
            --message "今天 ($(date +%Y-%m-%d)) 的贪吃蛇定时任务由于网络持续无法连接到 Google 认证服务器已等待 $FAILED_HOURS 小时。\n脚本将继续在后台尝试连接。" \
            --source "daily-snake-cron"
    else
        echo "Google OAuth server is unreachable. Sleeping for ${DELAY}s before retry..."
    fi
    
    sleep $DELAY
    
    # Double the delay
    DELAY=$((DELAY * 2))
    if [ $DELAY -gt $MAX_DELAY ]; then
        DELAY=$MAX_DELAY
    fi
done

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
FAILURE_REASON=""
START_REMOTE_HASH=""
PUBLISHED_HASH=""
DEPLOY_URL="https://daily-snake.pages.dev"
RECOVERY_DATES=""
INITIAL_DIRTY_FILES=""

# A previous daily run may have left a strictly scoped, untracked daily game behind.
# Recover that game first; unrelated user work is never treated as automation residue.
if ! git fetch origin main; then
    FAILURE_REASON="initial git fetch failed"
elif ! START_REMOTE_HASH=$(git rev-parse --verify origin/main); then
    FAILURE_REASON="unable to resolve origin/main before generation"
else
    INITIAL_DIRTY_FILES=$(git status --porcelain --untracked-files=all)
    if [ -n "$INITIAL_DIRTY_FILES" ]; then
        UNRELATED_DIRTY=$(printf '%s\n' "$INITIAL_DIRTY_FILES" | grep -Ev '^\?\? (games/daily-[0-9]{4}-[0-9]{2}-[0-9]{2}/(index\.html|style\.css|game\.js)|assets/daily-[0-9]{4}-[0-9]{2}-[0-9]{2}-.*)$' || true)
        if [ -n "$UNRELATED_DIRTY" ]; then
            FAILURE_REASON="workspace contains changes unrelated to a recoverable daily-game run; they were left untouched"
        else
            RECOVERY_DATES=$(printf '%s\n' "$INITIAL_DIRTY_FILES" \
                | sed -nE 's#^\?\? (games|assets)/daily-([0-9]{4}-[0-9]{2}-[0-9]{2}).*#\2#p' \
                | sort -u)

            for RECOVERY_DATE in $RECOVERY_DATES; do
                if [ "$(date -d "$RECOVERY_DATE" +%s 2>/dev/null || echo 0)" -ge "$(date -d "$TODAY" +%s)" ]; then
                    FAILURE_REASON="dirty daily-game candidate $RECOVERY_DATE is not earlier than today; it was left untouched"
                    break
                fi
            done

            if [ -z "$FAILURE_REASON" ]; then
                PROMPT="$PROMPT

=== 上次失败任务恢复 ===
工作区中检测到尚未发布的历史每日游戏日期：$RECOVERY_DATES。
在开发 $TODAY 之前，先逐个依据其已有文件恢复并完成这些历史游戏的 index.html、style.css、game.js，为每个历史游戏创建 assets/daily-DATE-* 命名的专属封面，集成根 index.html，并提交推送。只能处理这些明确列出的历史日期，不得删除已有文件或执行 git clean/reset。历史版本推送完成后，再继续今天的完整任务。"
            fi
        fi
    fi
fi

AGY_EXIT_CODE=1
if [ -z "$FAILURE_REASON" ]; then
    echo "Running initial prompt with agy..."
    # Run agy non-interactively with auto-approving permissions
    "$AGY_BIN" --prompt "$PROMPT" --model gemini-3.6-flash-high --effort high --dangerously-skip-permissions
    AGY_EXIT_CODE=$?
fi

if [ $AGY_EXIT_CODE -ne 0 ] && [ -z "$FAILURE_REASON" ]; then
    FAILURE_REASON="agy initial generation exited with status $AGY_EXIT_CODE"
    echo "Error: $FAILURE_REASON"
fi

while [ $AGY_EXIT_CODE -eq 0 ] && [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    echo "Verifying deployment status..."
    FAILURE_REASON=""
    LOCAL_HASH=$(git rev-parse --verify HEAD 2>/dev/null || echo "")
    REMOTE_HASH=""
    DIRTY_FILES=$(git status --porcelain)

    if ! git fetch origin main; then
        FAILURE_REASON="git fetch failed during verification"
    elif ! REMOTE_HASH=$(git rev-parse --verify origin/main); then
        FAILURE_REASON="unable to resolve origin/main during verification"
    elif [ -z "$LOCAL_HASH" ] || [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
        FAILURE_REASON="local HEAD does not match origin/main"
    elif [ "$REMOTE_HASH" = "$START_REMOTE_HASH" ]; then
        FAILURE_REASON="agy did not publish a new commit"
    elif [ -n "$DIRTY_FILES" ]; then
        FAILURE_REASON="workspace is dirty after generation"
    elif ! git cat-file -e "origin/main:$THEME_DIR/index.html" 2>/dev/null \
        || ! git cat-file -e "origin/main:$THEME_DIR/style.css" 2>/dev/null \
        || ! git cat-file -e "origin/main:$THEME_DIR/game.js" 2>/dev/null; then
        FAILURE_REASON="origin/main is missing one or more required files for $THEME_DIR"
    elif ! git show origin/main:index.html | grep -Fq "$THEME_DIR/"; then
        FAILURE_REASON="origin/main homepage does not link to $THEME_DIR"
    else
        CHANGED_PATHS=$(git diff --name-only "$START_REMOTE_HASH" "$REMOTE_HASH")
        ALLOWED_DATES="$TODAY"
        if [ -n "$RECOVERY_DATES" ]; then
            ALLOWED_DATES="$ALLOWED_DATES|$(printf '%s' "$RECOVERY_DATES" | tr '\n' '|' | sed 's/|$//')"
        fi
        DISALLOWED_PATHS=$(printf '%s\n' "$CHANGED_PATHS" | grep -Ev "^(index\\.html|assets/daily-($ALLOWED_DATES)-[^/]+|games/daily-($ALLOWED_DATES)/(index\\.html|style\\.css|game\\.js))$" || true)
        if [ -n "$DISALLOWED_PATHS" ]; then
            FAILURE_REASON="daily generation changed files outside the allowed game, asset, and homepage paths"
        elif ! printf '%s\n' "$CHANGED_PATHS" | grep -Fq "$THEME_DIR/"; then
            FAILURE_REASON="new commit does not contain today's game files"
        else
            for RECOVERY_DATE in $RECOVERY_DATES; do
                RECOVERY_DIR="games/daily-$RECOVERY_DATE"
                if ! git cat-file -e "origin/main:$RECOVERY_DIR/index.html" 2>/dev/null \
                    || ! git cat-file -e "origin/main:$RECOVERY_DIR/style.css" 2>/dev/null \
                    || ! git cat-file -e "origin/main:$RECOVERY_DIR/game.js" 2>/dev/null \
                    || ! git show origin/main:index.html | grep -Fq "$RECOVERY_DIR/"; then
                    FAILURE_REASON="recovered daily game $RECOVERY_DATE is incomplete on origin/main"
                    break
                fi
            done
        fi
    fi

    if [ -z "$FAILURE_REASON" ]; then
        SUCCESS=true
        PUBLISHED_HASH="$REMOTE_HASH"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        break
    fi
    
    echo "Verification failed: $FAILURE_REASON. Retrying ($RETRY_COUNT/$MAX_RETRIES)..."
    
    # Continue the session and tell it to fix the issue and push
    RETRY_PROMPT_FILE="$PROJECT_DIR/prompts/retry_snake.txt"
    if [ ! -f "$RETRY_PROMPT_FILE" ]; then
        echo "Error: Retry prompt file not found at $RETRY_PROMPT_FILE"
        exit 1
    fi
    RETRY_PROMPT=$(cat "$RETRY_PROMPT_FILE")
    if [ -n "$RECOVERY_DATES" ]; then
        RETRY_PROMPT="$RETRY_PROMPT

本轮还必须完成并推送这些已识别的历史失败日期：$RECOVERY_DATES。每个日期都必须具备 games/daily-DATE/{index.html,style.css,game.js}、assets/daily-DATE-* 专属封面和根首页入口；不得删除已有残留文件。"
    fi
    "$AGY_BIN" --continue --prompt "$RETRY_PROMPT" --model gemini-3.6-flash-high --effort high --dangerously-skip-permissions
    AGY_EXIT_CODE=$?
    if [ $AGY_EXIT_CODE -ne 0 ]; then
        FAILURE_REASON="agy retry exited with status $AGY_EXIT_CODE"
        echo "Error: $FAILURE_REASON"
        break
    fi
done

if [ "$SUCCESS" = true ]; then
    ONLINE_VERIFIED=false
    DEPLOY_ATTEMPT=1
    MAX_DEPLOY_ATTEMPTS=12
    while [ $DEPLOY_ATTEMPT -le $MAX_DEPLOY_ATTEMPTS ]; do
        CACHE_BUSTER="verify=$PUBLISHED_HASH-$DEPLOY_ATTEMPT"
        ROOT_HTML=$(curl -fsSL --connect-timeout 10 --max-time 30 "$DEPLOY_URL/?$CACHE_BUSTER" 2>/dev/null || true)
        GAME_HTML=$(curl -fsSL --connect-timeout 10 --max-time 30 "$DEPLOY_URL/$THEME_DIR/?$CACHE_BUSTER" 2>/dev/null || true)

        if printf '%s' "$ROOT_HTML" | grep -Fq "$THEME_DIR/" \
            && printf '%s' "$GAME_HTML" | grep -Fq '<canvas'; then
            ONLINE_VERIFIED=true
            break
        fi

        echo "Cloudflare Pages has not exposed today's game yet ($DEPLOY_ATTEMPT/$MAX_DEPLOY_ATTEMPTS)."
        DEPLOY_ATTEMPT=$((DEPLOY_ATTEMPT + 1))
        if [ $DEPLOY_ATTEMPT -le $MAX_DEPLOY_ATTEMPTS ]; then
            sleep 10
        fi
    done

    if [ "$ONLINE_VERIFIED" != true ]; then
        SUCCESS=false
        FAILURE_REASON="GitHub commit $PUBLISHED_HASH was pushed, but Cloudflare Pages did not expose today's game within the verification window"
    fi
fi

if [ "$SUCCESS" = true ]; then
    echo "==== [$(date)] Daily Snake successfully generated and pushed! ===="
    
    # Get the theme name from git commit or latest game folder if possible
    THEME_INFO="全新的贪吃蛇创意变体已集成发布"
    
    HTTP_PROXY="" HTTPS_PROXY="" http_proxy="" https_proxy="" node "$FEISHU_SCRIPT" \
        --config-file "$FEISHU_CONFIG" \
        --level normal \
        --title "📅 每日贪吃蛇发布成功" \
        --message "今天 ($TODAY) 的贪吃蛇创意变体已成功自动生成、集成并推送到 GitHub 仓库！已验证 Cloudflare Pages 的首页入口和今日游戏页面均已上线。\n\nCommit: $PUBLISHED_HASH\n访问地址: $DEPLOY_URL/$THEME_DIR/" \
        --source "daily-snake-cron"
else
    if [ -z "$FAILURE_REASON" ]; then
        FAILURE_REASON="deployment verification failed after $MAX_RETRIES attempts"
    fi

    echo "==== [$(date)] Daily Snake generation FAILED: $FAILURE_REASON. ===="
    
    HTTP_PROXY="" HTTPS_PROXY="" http_proxy="" https_proxy="" node "$FEISHU_SCRIPT" \
        --config-file "$FEISHU_CONFIG" \
        --level normal \
        --title "⚠️ 每日贪吃蛇发布失败" \
        --message "今天 ($TODAY) 的贪吃蛇定时任务失败：$FAILURE_REASON。请开发人员登录服务器进行排查。\n项目路径: /home/yhc/Projects/daily_snake" \
        --source "daily-snake-cron"
    exit 1
fi
