#!/bin/bash
# install-dev.sh - Install n8n community node for development

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check for --build flag
BUILD_MODE=false
if [ "$1" = "--build" ]; then
  BUILD_MODE=true
  echo -e "${BLUE}🚀 n8n ElevenLabs Node - Build & Publish Mode${NC}"
else
  echo -e "${GREEN}🚀 n8n ElevenLabs Node Development Installer${NC}"
fi
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
  if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to install dependencies${NC}"
    exit 1
  fi
fi

# Build the project
echo -e "${YELLOW}Building project...${NC}"
npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Build failed${NC}"
  exit 1
fi

# If --build flag is used, publish to npm and exit
if [ "$BUILD_MODE" = true ]; then
  echo ""
  echo -e "${BLUE}📦 Publishing to npm...${NC}"

  # Check if user is logged in to npm
  npm whoami &> /dev/null
  if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Not logged in to npm. Please run 'npm login' first.${NC}"
    exit 1
  fi

  # Get current version
  CURRENT_VERSION=$(node -p "require('./package.json').version")
  echo -e "${YELLOW}Current version: ${CURRENT_VERSION}${NC}"
  echo ""

  # Ask for version bump type
  echo -e "${YELLOW}Select version bump type:${NC}"
  echo "1) patch (bug fixes)"
  echo "2) minor (new features)"
  echo "3) major (breaking changes)"
  echo "4) skip (use current version)"
  echo -n "Enter choice (1-4): "
  read VERSION_CHOICE

  case $VERSION_CHOICE in
    1)
      npm version patch
      ;;
    2)
      npm version minor
      ;;
    3)
      npm version major
      ;;
    4)
      echo -e "${YELLOW}Using current version${NC}"
      ;;
    *)
      echo -e "${RED}Invalid choice. Exiting.${NC}"
      exit 1
      ;;
  esac

  # Get new version
  NEW_VERSION=$(node -p "require('./package.json').version")
  echo -e "${GREEN}Publishing version: ${NEW_VERSION}${NC}"

  # Publish to npm
  npm publish
  if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Successfully published n8n-nodes-piapi@${NEW_VERSION} to npm!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "- Commit the version bump: git add package.json package-lock.json && git commit -m 'chore: bump version to ${NEW_VERSION}'"
    echo "- Push to git: git push origin main"
    echo "- Create a git tag: git tag v${NEW_VERSION} && git push origin v${NEW_VERSION}"
  else
    echo -e "${RED}Error: Failed to publish to npm${NC}"
    exit 1
  fi

  exit 0
fi

# Method 1: npm link (recommended for development)
echo -e "${YELLOW}Creating npm link...${NC}"
npm link
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ npm link created successfully${NC}"

  # Find n8n installation and link the package
  echo -e "${YELLOW}Linking to n8n...${NC}"

  # Try to find where n8n is installed
  N8N_PATH=$(npm root -g)/n8n
  if [ -d "$N8N_PATH" ]; then
    cd "$N8N_PATH" && npm link n8n-nodes-piapi
    cd - > /dev/null
    echo -e "${GREEN}✅ Linked to global n8n installation${NC}"
  else
    echo -e "${YELLOW}Global n8n not found, trying local linking...${NC}"
  fi
fi

# Method 2: Direct copy to .n8n directory
echo -e "${YELLOW}Setting up .n8n directory...${NC}"
N8N_DIR=~/.n8n
CUSTOM_DIR=$N8N_DIR/custom
NODES_DIR=$N8N_DIR/nodes

# Create directories
mkdir -p "$CUSTOM_DIR"
mkdir -p "$NODES_DIR"

# Copy files to custom directory
echo -e "${YELLOW}Copying files to .n8n/custom...${NC}"
cp -r dist "$CUSTOM_DIR/"
cp package.json "$CUSTOM_DIR/"

# Create symlink in nodes directory
PACKAGE_NAME=$(node -p "require('./package.json').name")
ln -sf "$(pwd)" "$NODES_DIR/$PACKAGE_NAME"
echo -e "${GREEN}✅ Created symlink in .n8n/nodes${NC}"

echo ""
echo -e "${GREEN}🎉 Installation complete!${NC}"
echo ""
echo -e "${YELLOW}To use the ElevenLabs node:${NC}"
echo "1. Stop n8n if it's running (Ctrl+C)"
echo "2. Set environment variable (optional but recommended):"
echo -e "   ${GREEN}export N8N_CUSTOM_EXTENSIONS=\"$CUSTOM_DIR\"${NC}"
echo "3. Start n8n:"
echo -e "   ${GREEN}npx n8n start${NC}"
echo ""
echo -e "${YELLOW}For development:${NC}"
echo "- Run 'npm run dev' to watch for changes"
echo "- Run './install-dev.sh' after making changes"
echo "- Restart n8n to see the changes"
echo ""
echo -e "${YELLOW}Troubleshooting:${NC}"
echo "- If the node doesn't appear, try clearing n8n cache:"
echo "  rm -rf ~/.n8n/.cache"
echo "- Check n8n logs for any error messages"
echo "- Make sure you have the latest version of n8n"
