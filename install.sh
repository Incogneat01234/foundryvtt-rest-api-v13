#!/bin/bash
# Foundry VTT REST API - Unix/Linux/macOS Installation Script
# This script builds the module and installs it to your Foundry VTT modules directory

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Default paths
DEFAULT_FOUNDRY_PATH=""
SYMLINK=false
FORCE=false

# Detect OS and set default path
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    DEFAULT_FOUNDRY_PATH="$HOME/Library/Application Support/FoundryVTT/Data/modules"
else
    # Linux
    DEFAULT_FOUNDRY_PATH="$HOME/.local/share/FoundryVTT/Data/modules"
fi

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--path)
            FOUNDRY_PATH="$2"
            shift 2
            ;;
        -s|--symlink)
            SYMLINK=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  -p, --path PATH     Foundry modules directory (default: auto-detected)"
            echo "  -s, --symlink       Create symbolic link instead of copying files"
            echo "  -f, --force         Force overwrite existing installation"
            echo "  -h, --help          Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h for help"
            exit 1
            ;;
    esac
done

# Use default path if not specified
FOUNDRY_PATH=${FOUNDRY_PATH:-$DEFAULT_FOUNDRY_PATH}

echo -e "${CYAN}=== Foundry VTT REST API Installation Script ===${NC}"
echo

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MODULE_NAME="foundry-rest-api"
TARGET_PATH="$FOUNDRY_PATH/$MODULE_NAME"

echo -e "${GRAY}Source Directory: $SCRIPT_DIR${NC}"
echo -e "${GRAY}Target Directory: $TARGET_PATH${NC}"
echo

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm not found. Please install Node.js first.${NC}"
    echo -e "${YELLOW}  Download from: https://nodejs.org/${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ npm found (version $NPM_VERSION)${NC}"

# Check if Foundry path exists
if [ ! -d "$FOUNDRY_PATH" ]; then
    echo -e "${YELLOW}WARNING: Foundry modules directory not found at: $FOUNDRY_PATH${NC}"
    echo -e "${YELLOW}Creating directory...${NC}"
    mkdir -p "$FOUNDRY_PATH"
fi

# Check if target already exists
if [ -e "$TARGET_PATH" ]; then
    if [ "$FORCE" = true ]; then
        echo -e "${YELLOW}Removing existing installation...${NC}"
        rm -rf "$TARGET_PATH"
    else
        echo -e "${YELLOW}WARNING: Module already installed at $TARGET_PATH${NC}"
        echo -e "${YELLOW}Use -f flag to overwrite or remove the existing installation first.${NC}"
        exit 1
    fi
fi

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
cd "$SCRIPT_DIR"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Build the module
echo
echo -e "${BLUE}Building module...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to build module${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Module built successfully${NC}"

# Install to Foundry
echo
if [ "$SYMLINK" = true ]; then
    echo -e "${BLUE}Creating symbolic link...${NC}"
    ln -s "$SCRIPT_DIR" "$TARGET_PATH"
    echo -e "${GREEN}✓ Symbolic link created${NC}"
    echo -e "${GRAY}  Changes to source files will be reflected immediately${NC}"
else
    echo -e "${BLUE}Copying files to Foundry...${NC}"
    
    # Create target directory
    mkdir -p "$TARGET_PATH"
    
    # Copy required files
    cp -r "$SCRIPT_DIR/dist/"* "$TARGET_PATH/"
    cp "$SCRIPT_DIR/src/module.json" "$TARGET_PATH/"
    cp -r "$SCRIPT_DIR/src/languages" "$TARGET_PATH/"
    
    # Copy styles if they exist
    if [ -d "$SCRIPT_DIR/src/styles" ]; then
        cp -r "$SCRIPT_DIR/src/styles" "$TARGET_PATH/"
    fi
    
    echo -e "${GREEN}✓ Files copied to Foundry modules directory${NC}"
fi

# Verify installation
echo
echo -e "${BLUE}Verifying installation...${NC}"
if [ -f "$TARGET_PATH/module.json" ]; then
    # Extract module info using grep and sed (works on systems without jq)
    TITLE=$(grep -o '"title"[[:space:]]*:[[:space:]]*"[^"]*"' "$TARGET_PATH/module.json" | sed 's/.*: *"\(.*\)"/\1/')
    VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' "$TARGET_PATH/module.json" | sed 's/.*: *"\(.*\)"/\1/')
    MIN_VER=$(grep -o '"minimum"[[:space:]]*:[[:space:]]*"[^"]*"' "$TARGET_PATH/module.json" | sed 's/.*: *"\(.*\)"/\1/')
    VER_VER=$(grep -o '"verified"[[:space:]]*:[[:space:]]*"[^"]*"' "$TARGET_PATH/module.json" | sed 's/.*: *"\(.*\)"/\1/')
    
    echo -e "${GREEN}✓ Module installed successfully!${NC}"
    echo -e "${GRAY}  Name: $TITLE${NC}"
    echo -e "${GRAY}  Version: $VERSION${NC}"
    echo -e "${GRAY}  Compatibility: Foundry v$MIN_VER - v$VER_VER${NC}"
else
    echo -e "${RED}✗ Installation verification failed${NC}"
    exit 1
fi

# Copy test scripts
echo
echo -e "${BLUE}Copying test scripts...${NC}"
for testFile in test-api.js test-api-advanced.js test-api-monitor.js; do
    if [ -f "$SCRIPT_DIR/$testFile" ]; then
        cp "$SCRIPT_DIR/$testFile" "$TARGET_PATH/"
        echo -e "${GRAY}  ✓ $testFile${NC}"
    fi
done

# Final instructions
echo
echo -e "${GREEN}=== Installation Complete! ===${NC}"
echo
echo -e "${CYAN}Next steps:${NC}"
echo "1. Launch Foundry VTT v13"
echo "2. Navigate to your world"
echo "3. Go to Settings → Manage Modules"
echo "4. Enable 'Foundry REST API'"
echo "5. Configure the module in Settings → Module Settings"
echo
echo -e "${YELLOW}Test scripts available in browser console:${NC}"
echo "  - test-api.js (basic tests)"
echo "  - test-api-advanced.js (router tests)"
echo "  - test-api-monitor.js (performance monitoring)"
echo

# Development mode reminder
if [ "$SYMLINK" = true ]; then
    echo -e "${CYAN}Development Mode Active:${NC}"
    echo "  - Source files are symlinked"
    echo "  - Run 'npm run dev' for watch mode"
    echo "  - Changes will reflect after browser refresh"
    echo
fi