#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
umask 027

# =============================================================================
# Attendance Management System - Hardened One-Touch Installer
# =============================================================================
# • Supports Ubuntu/Debian, RHEL/CentOS/Fedora, openSUSE, Arch, macOS, Codespaces
# • Installs Node.js, MySQL/MariaDB, project dependencies, startup helpers
# • Generates strong credentials and writes a post-installation summary
# • Safe defaults, minimal prompts (fully automated with --non-interactive)
# =============================================================================

# ----- Styling ----------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'

say_step() { printf "${BLUE}==> %s${NC}\n" "$1"; }
say_info() { printf "${CYAN}ℹ %s${NC}\n" "$1"; }
say_warn() { printf "${YELLOW}⚠ %s${NC}\n" "$1"; }
say_err() { printf "${RED}✖ %s${NC}\n" "$1" >&2; }
say_ok()   { printf "${GREEN}✔ %s${NC}\n" "$1"; }

usage() {
    cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --non-interactive, -y   Run without prompts (requires all credentials)
  --skip-email            Skip SMTP configuration for MFA/reset emails
  --skip-systemd          Do not create systemd units
  --use-current           Provision into the current directory
  --force-reinstall       Remove existing project directory before cloning
  --project-dir <dir>     Target directory name (default: attendance-app)
  --repo-url <url>        Git repository to clone
  --backend-port <port>   Backend service port (default: 3001)
  --frontend-port <port>  Frontend dev server port (default: 3111)
  --db-name <name>        Database schema name
  --app-db-user <user>    Application database user
  --app-db-password <pw>  Application database password
  --db-root-password <pw> Root password to apply (disables socket auth)
  --keep-root-password    Preserve the existing database root password
  --node-version <major>  Desired Node.js major version (default: 20)
  -h, --help              Show this help message
EOF
}

cmd_exists() { command -v "$1" >/dev/null 2>&1; }

ensure_cmd() {
    local cmd="$1"; shift
    cmd_exists "$cmd" && return
    [[ $# -gt 0 ]] && say_err "$1"
    exit 1
}

prompt() {
    local msg="$1"; local def="${2-}"; local reply
    read -r -p "$msg${def:+ [$def]}: " reply || true
    echo "${reply:-$def}"
}

prompt_secret() {
    local msg="$1"; local def="${2-}"; local reply
    read -r -s -p "$msg${def:+ [$def]}: " reply || true
    echo
    echo "${reply:-$def}"
}

rand_password() {
    local length="${1:-32}"
    if cmd_exists openssl; then
        openssl rand -base64 $((length * 2)) | tr -dc 'A-Za-z0-9!@#%+=' | head -c "$length"
    else
        tr -dc 'A-Za-z0-9!@#%+=' < /dev/urandom | head -c "$length"
    fi
}

banner() {
    printf "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}\n"
    printf "${BLUE}║  ${BOLD}${CYAN}Attendance Management System - Hardened Installer${NC}${BLUE}  ║${NC}\n"
    printf "${BLUE}║        ${CYAN}Cross-platform provisioning with secure defaults${NC}${BLUE}       ║${NC}\n"
    printf "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}\n\n"
}

declare -A REPORT
set_report() { REPORT["$1"]="$2"; }
summary_line() { printf '   %-24s %s\n' "$1" "$2"; }

# ----- Defaults ----------------------------------------------------------------
DEFAULT_REPO="https://github.com/attiacloudgalaxy/attendance-app.git"
PROJECT_DIR="attendance-app"
REPO_URL="$DEFAULT_REPO"
BACKEND_PORT="3001"
FRONTEND_PORT="3111"
DB_NAME="attendance_system"
APP_DB_USER="attendance_app"
APP_DB_PASSWORD=""
DB_ROOT_PASSWORD=""
NODE_MAJOR="20"
KEEP_ROOT_PASSWORD=false
NON_INTERACTIVE=false
SKIP_EMAIL=false
SKIP_SYSTEMD=false
USE_CURRENT=false
FORCE_REINSTALL=false

EMAIL_HOST=""
EMAIL_PORT="587"
EMAIL_USER=""
EMAIL_PASS=""
SUMMARY_FILE="install-summary.txt"

OS=unknown
DISTRO=unknown
PKG_MANAGER=unknown
PKG_INSTALL=""
PKG_UPDATE=""
SUDO=""

ROOT_AUTH_SOCKET=true
DB_SERVICE=""
MYSQL_CLIENT="mysql"

# ----- Argument parsing --------------------------------------------------------
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --non-interactive|-y) NON_INTERACTIVE=true ;;
            --skip-email)         SKIP_EMAIL=true ;;
            --skip-systemd)       SKIP_SYSTEMD=true ;;
            --use-current)        USE_CURRENT=true ;;
            --force-reinstall)    FORCE_REINSTALL=true ;;
            --project-dir)        PROJECT_DIR="$2"; shift ;;
            --repo-url)           REPO_URL="$2"; shift ;;
            --backend-port)       BACKEND_PORT="$2"; shift ;;
            --frontend-port)      FRONTEND_PORT="$2"; shift ;;
            --db-name)            DB_NAME="$2"; shift ;;
            --app-db-user)        APP_DB_USER="$2"; shift ;;
            --app-db-password)    APP_DB_PASSWORD="$2"; shift ;;
            --db-root-password)   DB_ROOT_PASSWORD="$2"; KEEP_ROOT_PASSWORD=false; shift ;;
            --keep-root-password) KEEP_ROOT_PASSWORD=true ;;
            --node-version)       NODE_MAJOR="$2"; shift ;;
            -h|--help)            usage; exit 0 ;;
            *) say_err "Unknown option: $1"; usage; exit 1 ;;
        esac
        shift
    done
}

# ----- Platform detection ------------------------------------------------------
prepare_privileges() {
    if cmd_exists sudo && [[ $EUID -ne 0 ]]; then
        SUDO="sudo"
    else
        SUDO=""
    fi
}

detect_platform() {
    case "$OSTYPE" in
        linux-gnu*)
            OS="linux"
            if [[ -f /etc/os-release ]]; then
                . /etc/os-release
                DISTRO="${ID_LIKE:-${ID:-linux}}"
            fi
            ;;
        darwin*)
            OS="macos"; DISTRO="macos" ;;
        msys*|cygwin*|win32*)
            say_err "Native Windows shells are unsupported. Please use WSL2 or a POSIX environment."; exit 1 ;;
        *)
            say_warn "Unrecognised platform ($OSTYPE). Attempting best-effort install."; OS="linux"; DISTRO="linux" ;;
    esac
    say_info "Platform detected: ${OS^} (${DISTRO})"
}

select_pkg_manager() {
    if [[ "$OS" == "macos" ]]; then
        if ! cmd_exists brew; then
            say_step "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv)"
        fi
        PKG_MANAGER="brew"
        PKG_INSTALL="brew install"
        PKG_UPDATE="brew update"
        return
    fi

    if   cmd_exists apt-get; then PKG_MANAGER="apt";   PKG_INSTALL="$SUDO apt-get install -y"; PKG_UPDATE="$SUDO apt-get update";
    elif cmd_exists dnf; then     PKG_MANAGER="dnf";   PKG_INSTALL="$SUDO dnf install -y";     PKG_UPDATE="$SUDO dnf -y makecache";
    elif cmd_exists yum; then     PKG_MANAGER="yum";   PKG_INSTALL="$SUDO yum install -y";     PKG_UPDATE="$SUDO yum makecache -y";
    elif cmd_exists zypper; then  PKG_MANAGER="zypper";PKG_INSTALL="$SUDO zypper install -y"; PKG_UPDATE="$SUDO zypper refresh";
    elif cmd_exists pacman; then  PKG_MANAGER="pacman";PKG_INSTALL="$SUDO pacman -S --noconfirm --needed"; PKG_UPDATE="$SUDO pacman -Sy --noconfirm";
    else
        say_err "Unsupported distribution. Install dependencies manually then rerun with --use-current."; exit 1
    fi
    say_info "Package manager: $PKG_MANAGER"
}

update_packages() { [[ -n "$PKG_UPDATE" ]] && say_step "Refreshing package index" && eval "$PKG_UPDATE"; }

install_prereqs() {
    say_step "Installing foundational packages"
    case "$PKG_MANAGER" in
        apt)
            eval "$PKG_INSTALL curl wget git build-essential ca-certificates gnupg lsb-release unzip jq" ;;
        dnf|yum)
            eval "$PKG_INSTALL curl wget git gcc gcc-c++ make openssl openssl-devel unzip jq" ;;
        zypper)
            eval "$PKG_INSTALL curl wget git gcc gcc-c++ make libopenssl-devel unzip jq" ;;
        pacman)
            eval "$PKG_INSTALL base-devel curl wget git openssl unzip jq" ;;
        brew)
            brew install curl wget git coreutils gnu-sed jq >/dev/null 2>&1 || true ;;
    esac
    ensure_cmd curl "Install curl and rerun."
    ensure_cmd git  "Install git and rerun."
}

# ----- Node.js -----------------------------------------------------------------
install_node() {
    say_step "Ensuring Node.js v${NODE_MAJOR}.x"
    if cmd_exists node; then
        local CURRENT="$(node -v || echo "")"
        [[ "$CURRENT" == v${NODE_MAJOR}.* ]] && { say_info "Node.js $CURRENT already installed"; return; }
    fi

    if [[ "$PKG_MANAGER" == "brew" ]]; then
        brew install "node@${NODE_MAJOR}" >/dev/null 2>&1 || true
        brew link --overwrite --force "node@${NODE_MAJOR}" >/dev/null 2>&1 || true
    else
        case "$PKG_MANAGER" in
            apt)   curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | $SUDO -E bash - && eval "$PKG_INSTALL nodejs" ;;
            dnf|yum|zypper)
                   curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR}.x" | $SUDO bash - && eval "$PKG_INSTALL nodejs" ;;
            pacman) eval "$PKG_INSTALL nodejs npm" ;;
        esac
    fi

    if ! cmd_exists node; then
        say_warn "Falling back to nvm for Node.js"
        export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
        [[ -s "$NVM_DIR/nvm.sh" ]] || curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        # shellcheck disable=SC1090
        . "$NVM_DIR/nvm.sh"
        nvm install "$NODE_MAJOR"
        nvm alias default "$NODE_MAJOR" >/dev/null
        nvm use "$NODE_MAJOR" >/dev/null
    fi

    say_ok "Node.js $(node -v) • npm $(npm -v)"
}

# ----- MySQL / MariaDB ---------------------------------------------------------
install_mysql() {
    if cmd_exists mysql && cmd_exists mysqld; then
        say_info "MySQL/MariaDB already present"
        return
    fi

    say_step "Installing MySQL / MariaDB server"
    case "$PKG_MANAGER" in
        apt)
            eval "$PKG_INSTALL mysql-server mysql-client" ;;
        dnf|yum)
            eval "$PKG_INSTALL mariadb-server mariadb" ;;
        zypper)
            eval "$PKG_INSTALL mariadb mariadb-client" ;;
        pacman)
            eval "$PKG_INSTALL mariadb mariadb-clients" ;;
        brew)
            brew install mysql >/dev/null 2>&1 || true ;;
    esac
}

start_mysql_service() {
    say_step "Starting database service"
    if [[ "$OS" == "macos" ]]; then
        brew services start mysql >/dev/null 2>&1 || true
        DB_SERVICE="mysql"
        return
    fi

    if cmd_exists systemctl; then
        for svc in mysql.service mysqld.service mariadb.service; do
            if $SUDO systemctl enable --now "$svc" >/dev/null 2>&1 || $SUDO systemctl start "$svc" >/dev/null 2>&1; then
                DB_SERVICE="${svc%.service}"
                return
            fi
        done
    fi

    if cmd_exists service; then
        for svc in mysql mysqld mariadb; do
            if $SUDO service "$svc" status >/dev/null 2>&1 || $SUDO service "$svc" start >/dev/null 2>&1; then
                DB_SERVICE="$svc"
                return
            fi
        done
    fi

    say_warn "Could not auto-start the database service. Ensure MySQL/MariaDB is running."
}

mysql_root_socket_ok() {
    $SUDO mysql --protocol=socket -u root --batch --skip-column-names -e "SELECT 1;" >/dev/null 2>&1
}

mysql_root_exec() {
    local sql="$1"
    if [[ "$ROOT_AUTH_SOCKET" == true ]]; then
        $SUDO mysql --protocol=socket -u root --batch --skip-column-names -e "$sql"
    else
        MYSQL_PWD="$DB_ROOT_PASSWORD" $SUDO mysql -u root --batch --skip-column-names -e "$sql"
    fi
}

mysql_root_script() {
    if [[ "$ROOT_AUTH_SOCKET" == true ]]; then
        $SUDO mysql --protocol=socket -u root --batch --skip-column-names "$@"
    else
        MYSQL_PWD="$DB_ROOT_PASSWORD" $SUDO mysql -u root --batch --skip-column-names "$@"
    fi
}

configure_mysql() {
    start_mysql_service

    ROOT_AUTH_SOCKET=false
    if mysql_root_socket_ok; then
        ROOT_AUTH_SOCKET=true
        say_info "Root socket authentication available"
    fi

    if [[ "$KEEP_ROOT_PASSWORD" == true ]]; then
        [[ "$ROOT_AUTH_SOCKET" == true || -n "$DB_ROOT_PASSWORD" ]] || {
            say_err "--keep-root-password requires existing password or socket auth"; exit 1; }
        say_warn "Retaining existing root password"
    else
        if [[ -z "$DB_ROOT_PASSWORD" ]]; then
            DB_ROOT_PASSWORD="$(rand_password 24)"
            set_report MYSQL_ROOT_PASSWORD_GENERATED "Yes"
        else
            set_report MYSQL_ROOT_PASSWORD_GENERATED "Provided"
        fi
        mysql_root_script --execute "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$DB_ROOT_PASSWORD';"
        ROOT_AUTH_SOCKET=false
    fi

    if [[ -z "$APP_DB_PASSWORD" ]]; then
        APP_DB_PASSWORD="$(rand_password 28)"
        set_report APP_DB_PASSWORD_GENERATED "Yes"
    else
        set_report APP_DB_PASSWORD_GENERATED "Provided"
    fi

    mysql_root_script <<SQL
CREATE DATABASE IF NOT EXISTS \
`$DB_NAME` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$APP_DB_USER'@'localhost' IDENTIFIED BY '$APP_DB_PASSWORD';
GRANT ALL PRIVILEGES ON \
`$DB_NAME`.* TO '$APP_DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL

    MYSQL_PWD="$APP_DB_PASSWORD" mysql -u "$APP_DB_USER" "$DB_NAME" <<'SQL'
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('employee','admin') DEFAULT 'employee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    clock_in_time DATETIME,
    clock_out_time DATETIME,
    break_start_time DATETIME,
    break_end_time DATETIME,
    total_hours DECIMAL(6,2) DEFAULT 0,
    status ENUM('present','absent','partial') DEFAULT 'absent',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_date (user_id, date),
    INDEX idx_user_date (user_id, date),
    CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(16) NOT NULL,
    type ENUM('2fa','reset') DEFAULT '2fa',
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token (token),
    CONSTRAINT fk_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
SQL

    say_ok "Database '$DB_NAME' prepared"
}

seed_default_accounts() {
    MYSQL_PWD="$APP_DB_PASSWORD" mysql -u "$APP_DB_USER" "$DB_NAME" <<'SQL'
INSERT INTO users (name, email, password, role)
VALUES
  ('Admin User',   'admin@company.com',  '$2b$10$8K1p/a0dRzZuyFJGWWdone.2YoxPOFjg4PAKKgGgEuU4ncTqxs0w.', 'admin'),
  ('Basim Ahmed',  'basim@company.com', '$2b$10$8K1p/a0dRzZuyFJGWWdone.2YoxPOFjg4PAKKgGgEuU4ncTqxs0w.', 'employee'),
  ('Sara Mohammed','sara@company.com',  '$2b$10$8K1p/a0dRzZuyFJGWWdone.2YoxPOFjg4PAKKgGgEuU4ncTqxs0w.', 'employee'),
  ('Ahmed Ali',    'ahmed@company.com', '$2b$10$8K1p/a0dRzZuyFJGWWdone.2YoxPOFjg4PAKKgGgEuU4ncTqxs0w.', 'employee')
ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role);
SQL
    say_ok "Default admin and employees available"
}

# ----- Repository --------------------------------------------------------------
prepare_directory() {
    if [[ "$USE_CURRENT" == true ]]; then
        PROJECT_PATH="$PWD"
        say_info "Using current directory: $PROJECT_PATH"
        return
    fi

    PROJECT_PATH="$PWD/$PROJECT_DIR"
    if [[ -d "$PROJECT_PATH" ]]; then
        if [[ "$FORCE_REINSTALL" == true ]]; then
            say_warn "Removing existing directory $PROJECT_PATH"
            rm -rf "$PROJECT_PATH"
        else
            say_warn "Directory $PROJECT_PATH exists; pulling latest"
            (cd "$PROJECT_PATH" && git pull --ff-only) || true
            return
        fi
    fi

    say_step "Cloning repository"
    git clone "$REPO_URL" "$PROJECT_PATH"
}

# ----- Email configuration -----------------------------------------------------
collect_email_settings() {
    if [[ "$SKIP_EMAIL" == true ]]; then
        say_info "Skipping email configuration per flag"
        return
    fi

    if [[ "$NON_INTERACTIVE" == true ]]; then
        if [[ -z "$EMAIL_HOST" || -z "$EMAIL_USER" || -z "$EMAIL_PASS" ]]; then
            say_warn "Email credentials not supplied; skipping. Set later in backend/.env"
            SKIP_EMAIL=true
        fi
        return
    fi

    echo
    read -r -p "Configure SMTP for MFA emails? [y/N]: " choice || true
    if [[ "${choice,,}" != y* ]]; then
        SKIP_EMAIL=true
        say_info "Email disabled; you can edit backend/.env later"
        return
    fi

    EMAIL_HOST="$(prompt "SMTP host" "smtp.gmail.com")"
    EMAIL_PORT="$(prompt "SMTP port" "$EMAIL_PORT")"
    EMAIL_USER="$(prompt "SMTP username" "$EMAIL_USER")"
    EMAIL_PASS="$(prompt_secret "SMTP password/app password")"
}

# ----- Backend -----------------------------------------------------------------
setup_backend() {
    say_step "Configuring backend"
    pushd "$PROJECT_PATH/backend" >/dev/null

    npm install --no-audit --no-fund

    local JWT_SECRET
    JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n' | cut -c1-64)"

    cat > .env <<EOF
# Auto-generated on $(date)
DB_HOST=localhost
DB_USER=$APP_DB_USER
DB_PASSWORD=$APP_DB_PASSWORD
DB_NAME=$DB_NAME
DB_PORT=3306

JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

PORT=$BACKEND_PORT
NODE_ENV=production
ENABLE_HTTPS=false
FRONTEND_URL=http://localhost:$FRONTEND_PORT

EMAIL_HOST=${EMAIL_HOST}
EMAIL_PORT=${EMAIL_PORT}
EMAIL_USER=${EMAIL_USER}
EMAIL_PASS=${EMAIL_PASS}
EMAIL_FROM=${EMAIL_USER:-noreply@company.com}

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200
EOF

    if [[ -f package.json && $(jq -r '.scripts | has("migrate")' package.json) == true ]]; then
        npm run migrate || say_warn "Database migration script failed; verify manually"
    fi

    popd >/dev/null
    say_ok "Backend ready"
}

# ----- Frontend ----------------------------------------------------------------
setup_frontend() {
    say_step "Configuring frontend"
    pushd "$PROJECT_PATH/frontend" >/dev/null

    npm install --no-audit --no-fund

    cat > .env <<EOF
REACT_APP_API_URL=http://localhost:$BACKEND_PORT
PORT=$FRONTEND_PORT
GENERATE_SOURCEMAP=false
EOF

    popd >/dev/null
    say_ok "Frontend ready"
}

# ----- Startup scripts ---------------------------------------------------------
create_helpers() {
        say_step "Writing helper scripts"
        cat > "$PROJECT_PATH/start-backend.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/backend"
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
    export NVM_DIR="$HOME/.nvm"
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh"
fi
npm install --no-audit --no-fund
npm start
EOF

        cat > "$PROJECT_PATH/start-frontend.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/frontend"
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
    export NVM_DIR="$HOME/.nvm"
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh"
fi
npm install --no-audit --no-fund
npm start
EOF

        cat > "$PROJECT_PATH/start-all.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
trap '[[ -n "${BACK_PID:-}" ]] && kill "$BACK_PID" 2>/dev/null || true;
            [[ -n "${FRONT_PID:-}" ]] && kill "$FRONT_PID" 2>/dev/null || true' EXIT
"$SCRIPT_DIR/start-backend.sh" & BACK_PID=$!
sleep 5
"$SCRIPT_DIR/start-frontend.sh" & FRONT_PID=$!
wait
EOF

        chmod +x "$PROJECT_PATH"/start-*.sh
        say_ok "Helper scripts created"
}

# ----- Systemd units -----------------------------------------------------------
create_systemd_units() {
    [[ "$OS" == "linux" && "$SKIP_SYSTEMD" == false && -n "$SUDO" ]] || return
    [[ -d /etc/systemd/system ]] || return

    say_step "Creating systemd units"
    local svc_user
    svc_user="${SUDO_USER:-$(id -un)}"

    cat <<EOF | $SUDO tee /etc/systemd/system/attendance-backend.service >/dev/null
[Unit]
Description=Attendance Backend Service
After=network.target mysql.service

[Service]
Type=simple
User=$svc_user
WorkingDirectory=$PROJECT_PATH/backend
Environment=NODE_ENV=production
ExecStart=$(command -v node) server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    cat <<EOF | $SUDO tee /etc/systemd/system/attendance-frontend.service >/dev/null
[Unit]
Description=Attendance Frontend Service
After=network.target

[Service]
Type=simple
User=$svc_user
WorkingDirectory=$PROJECT_PATH/frontend
ExecStart=$(command -v npx) serve -s build -l $FRONTEND_PORT
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    $SUDO systemctl daemon-reload
    say_ok "Systemd units prepared (enable manually with: sudo systemctl enable attendance-*.service)"
}

# ----- Validation --------------------------------------------------------------
validate_install() {
    MYSQL_PWD="$APP_DB_PASSWORD" mysql -u "$APP_DB_USER" "$DB_NAME" -e "SELECT COUNT(*) FROM users;" >/dev/null 2>&1 \
        || say_warn "DB validation query failed."
    node -v >/dev/null 2>&1 || say_warn "Node.js not reachable in PATH."
}

# ----- Reporting ---------------------------------------------------------------
write_summary() {
    local root_line
    if [[ "$KEEP_ROOT_PASSWORD" == true ]]; then
        root_line="(unchanged)"
    else
        root_line="$DB_ROOT_PASSWORD"
    fi

    cat > "$PROJECT_PATH/$SUMMARY_FILE" <<EOF
Attendance Management System - Installation Summary
Generated: $(date)

Application URLs:
  Frontend: http://localhost:$FRONTEND_PORT
  Backend : http://localhost:$BACKEND_PORT

Default Accounts:
  Admin    : admin@company.com / admin123
  Employee : basim@company.com / basim123
  Employee : sara@company.com / sara123
  Employee : ahmed@company.com / ahmed123

Database Credentials:
  Host     : localhost
  Schema   : $DB_NAME
  App User : $APP_DB_USER
  App Pass : $APP_DB_PASSWORD
    Root Pass: $root_line

Metadata:
  Repository: $REPO_URL
  Project Dir: $PROJECT_PATH
  Node.js   : $(node -v 2>/dev/null || echo "unknown")

Notes:
  - Helper scripts: start-backend.sh, start-frontend.sh, start-all.sh
  - Backend env:   backend/.env
  - Frontend env:  frontend/.env
EOF
}

show_summary() {
    echo
    echo -e "${GREEN}🎉 Installation complete!${NC}"
    echo
    summary_line "Project" "$PROJECT_PATH"
    summary_line "Backend URL" "http://localhost:$BACKEND_PORT"
    summary_line "Frontend URL" "http://localhost:$FRONTEND_PORT"
    summary_line "DB Host" "localhost"
    summary_line "DB Name" "$DB_NAME"
    summary_line "DB User" "$APP_DB_USER"
    summary_line "DB Password" "$APP_DB_PASSWORD"
    [[ "$KEEP_ROOT_PASSWORD" == false ]] && summary_line "Root Password" "$DB_ROOT_PASSWORD"
    summary_line "Summary File" "$PROJECT_PATH/$SUMMARY_FILE"
    echo
    echo "Next steps:"
    echo "  1. cd '$PROJECT_PATH'"
    echo "  2. ./start-all.sh"
    echo "     (or start-backend.sh / start-frontend.sh individually)"
    echo
    if [[ "$SKIP_EMAIL" == true ]]; then
        say_warn "Email/MFA SMTP not configured. Update backend/.env when ready."
    fi
}

# ----- Main --------------------------------------------------------------------
main() {
    parse_args "$@"
    banner
    prepare_privileges
    detect_platform
    select_pkg_manager
    update_packages
    install_prereqs
    install_node
    install_mysql
    configure_mysql
    seed_default_accounts
    prepare_directory
    collect_email_settings
    setup_backend
    setup_frontend
    create_helpers
    create_systemd_units
    validate_install
    write_summary
    show_summary
}

main "$@"