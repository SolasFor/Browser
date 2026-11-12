#!/usr/bin/env bash
# ============================================================================
# Автоматическая установка Firefox Customization (Linux / macOS)
# Использование:
#   ./install.sh [--profile /path/to/profile] [--link] [--with-user-js] [--yes]
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_CHROME="$SCRIPT_DIR/chrome"
SOURCE_USER_JS="$SCRIPT_DIR/user.js"

PROFILE_PATH=""
MODE="copy"
WITH_USER_JS=0
ASSUME_YES=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --profile)
            PROFILE_PATH="${2:-}"
            shift 2
            ;;
        --link)
            MODE="link"
            shift
            ;;
        --with-user-js)
            WITH_USER_JS=1
            shift
            ;;
        -y|--yes)
            ASSUME_YES=1
            shift
            ;;
        -h|--help)
            echo "Использование: $0 [--profile ПУТЬ] [--link] [--with-user-js] [--yes]"
            exit 0
            ;;
        *)
            echo "Неизвестный параметр: $1" >&2
            exit 1
            ;;
    esac
done

if [[ ! -d "$SOURCE_CHROME" ]]; then
    echo "Ошибка: не найдена папка темы $SOURCE_CHROME" >&2
    exit 1
fi

find_default_profile() {
    local candidates=(
        "$HOME/.mozilla/firefox"
        "$HOME/.var/app/org.mozilla.firefox/.mozilla/firefox"
        "$HOME/snap/firefox/common/.mozilla/firefox"
        "$HOME/Library/Application Support/Firefox"
    )

    for root in "${candidates[@]}"; do
        local ini="$root/profiles.ini"
        [[ -f "$ini" ]] || continue

        local install_default
        install_default="$(awk -F= '/^\[Install/{in_inst=1; next} /^\[/{in_inst=0} in_inst && $1=="Default"{print $2; exit}' "$ini" | tr -d '\r')"
        if [[ -n "$install_default" ]]; then
            if [[ -d "$root/$install_default" ]]; then
                echo "$root/$install_default"
                return 0
            elif [[ -d "$install_default" ]]; then
                echo "$install_default"
                return 0
            fi
        fi

        local prof_path
        prof_path="$(awk -F= '
            /^\[Profile/{p=""; def=0; rel=1; next}
            /^\[/{if(def && p!=""){print rel":"p; exit}}
            $1=="Path"{p=$2}
            $1=="IsRelative"{rel=$2}
            $1=="Default" && $2=="1"{def=1}
            END{if(def && p!=""){print rel":"p}}
        ' "$ini" | tr -d '\r')"
        if [[ -n "$prof_path" ]]; then
            local is_rel="${prof_path%%:*}"
            local rel_val="${prof_path#*:}"
            local resolved="$rel_val"
            [[ "$is_rel" != "0" ]] && resolved="$root/$rel_val"
            if [[ -d "$resolved" ]]; then
                echo "$resolved"
                return 0
            fi
        fi
    done
    return 1
}

if [[ -z "$PROFILE_PATH" ]]; then
    if ! PROFILE_PATH="$(find_default_profile)"; then
        echo "Не удалось автоматически определить профиль Firefox. Укажите его через --profile ПУТЬ." >&2
        exit 1
    fi
fi

if [[ ! -d "$PROFILE_PATH" ]]; then
    echo "Ошибка: папка профиля не существует: $PROFILE_PATH" >&2
    exit 1
fi

PROFILE_PATH="$(cd "$PROFILE_PATH" && pwd)"
echo "Целевой профиль Firefox: $PROFILE_PATH"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DEST_CHROME="$PROFILE_PATH/chrome"

if [[ -e "$DEST_CHROME" || -L "$DEST_CHROME" ]]; then
    if [[ -L "$DEST_CHROME" && "$(readlink "$DEST_CHROME")" == "$SOURCE_CHROME" && "$MODE" == "link" ]]; then
        echo "Симлинк chrome уже указывает на репозиторий: $DEST_CHROME"
    else
        BACKUP_CHROME="$PROFILE_PATH/chrome.backup-$TIMESTAMP"
        mv "$DEST_CHROME" "$BACKUP_CHROME"
        echo "Создана резервная копия прежней папки chrome: $BACKUP_CHROME"
    fi
fi

if [[ ! -e "$DEST_CHROME" && ! -L "$DEST_CHROME" ]]; then
    if [[ "$MODE" == "link" ]]; then
        ln -s "$SOURCE_CHROME" "$DEST_CHROME"
        echo "Создан симлинк chrome -> $SOURCE_CHROME"
    else
        cp -R "$SOURCE_CHROME" "$DEST_CHROME"
        echo "Файлы chrome скопированы в $DEST_CHROME"
    fi
fi

if [[ "$WITH_USER_JS" -eq 0 && "$ASSUME_YES" -eq 0 && -f "$SOURCE_USER_JS" ]]; then
    read -r -p "Установить базовый user.js (включает поддержку CSS и SVG-иконок)? [Y/n] " ans
    if [[ -z "$ans" || "$ans" =~ ^([yY]|[yY][eE][sS]|д|Д|да|Да)$ ]]; then
        WITH_USER_JS=1
    fi
fi

if [[ "$WITH_USER_JS" -eq 1 && -f "$SOURCE_USER_JS" ]]; then
    DEST_USER_JS="$PROFILE_PATH/user.js"
    if [[ -f "$DEST_USER_JS" ]]; then
        BACKUP_USER_JS="$PROFILE_PATH/user.js.backup-$TIMESTAMP"
        cp "$DEST_USER_JS" "$BACKUP_USER_JS"
        echo "Сохранена резервная копия user.js: $BACKUP_USER_JS"
    fi
    cp "$SOURCE_USER_JS" "$DEST_USER_JS"
    echo "Установлен файл настроек: $DEST_USER_JS"
fi

echo "Готово! Перезапустите Firefox, чтобы применить оформление."
