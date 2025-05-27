# n8n Community Node Compliance Checklist & Guidelines

This document outlines the steps to make an n8n community node package compliant with n8n Cloud verification requirements.

## 🔍 Technical Compliance Checklist

### 1. Dependencies Check
```bash
# Check package.json
# CRITICAL: No runtime dependencies allowed!
# ❌ BAD:
"dependencies": {
  "axios": "^1.8.3",
  "some-lib": "^2.0.0"
}

# ✅ GOOD:
"dependencies": {}
```

### 2. Remove External Dependencies
- Replace `axios` with n8n's built-in HTTP functionality
- Use `this.helpers.request()` instead of external HTTP libraries
- Move any build-time dependencies to `devDependencies`

### 3. Fix Restricted Globals
Replace restricted globals with n8n alternatives:
```typescript
// ❌ BAD:
await new Promise(resolve => setTimeout(resolve, 3000));

// ✅ GOOD:
import { sleep } from 'n8n-workflow';
await sleep(3000);
```

### 4. No File System or Environment Variables
- ❌ No `fs` module usage
- ❌ No `process.env` access
- ❌ No `__dirname` or `__filename`
- ✅ Pass all data through node parameters

### 5. Package Requirements
```json
{
  "name": "n8n-nodes-<your-name>",  // Must start with n8n-nodes-
  "keywords": [
    "n8n-community-node-package",   // REQUIRED keyword
    // ... other keywords
  ],
  "license": "MIT",                  // Must be MIT
  "n8n": {
    "credentials": [...],
    "nodes": [...]                   // All nodes must be listed
  }
}
```

## 📝 Documentation Requirements

### 1. README.md Structure
```markdown
# n8n-nodes-[name]

Brief description of what this package does.

> **Note**: This is an unofficial community project (if applicable)

## About [Service Name]
Description of the service being integrated

## Features
- List all included nodes and their capabilities
- Group by category if many nodes

## Installation
Link to n8n community nodes installation guide

## Credentials
How to obtain and configure API credentials

## Usage
Basic usage examples

## Compatibility
- n8n version requirements
- Node.js requirements

## Support
- Links to issues, documentation, community

## License
MIT (with link)

## Disclaimer (if unofficial)
State that this is not affiliated with the service provider
```

### 2. Package.json Best Practices
```json
{
  "version": "1.0.0",  // Use semantic versioning
  "description": "Clear, concise description under 120 chars",
  "keywords": [
    "n8n-community-node-package",  // Required
    "n8n",
    // Add relevant keywords for discoverability
    // Include service names, features, use cases
  ],
  "homepage": "link-to-service-or-docs",
  "repository": {
    "type": "git",
    "url": "your-repo-url"
  },
  "bugs": {
    "url": "your-repo-issues-url"
  }
}
```

## 🛠️ Build & Test Process

### 1. Clean Build
```bash
# Remove all dependencies
rm -rf node_modules package-lock.json

# Install fresh
npm install

# Build
npm run build

# Test locally
npm run runn8n
```

### 2. Run Linter Check
```bash
# This must pass for n8n Cloud approval
npx @n8n/scan-community-package .

# If checking published version
npx @n8n/scan-community-package n8n-nodes-[name]
```

### 3. Common Linter Fixes
- **setTimeout**: Use `sleep` from n8n-workflow
- **setInterval**: Refactor to use polling with sleep
- **External dependencies**: Remove and use n8n built-ins
- **Console.log**: Remove or use proper n8n logging

## ✅ Pre-Publish Checklist

1. [ ] No runtime dependencies in package.json
2. [ ] All HTTP requests use `this.helpers.request()`
3. [ ] No restricted globals (setTimeout, setInterval, etc.)
4. [ ] No file system or environment variable access
5. [ ] Package name starts with `n8n-nodes-`
6. [ ] Contains `n8n-community-node-package` keyword
7. [ ] MIT license
8. [ ] Comprehensive README.md
9. [ ] Version follows semantic versioning
10. [ ] Linter passes: `npx @n8n/scan-community-package .`
11. [ ] All nodes listed in package.json n8n.nodes array
12. [ ] Credentials properly defined
13. [ ] Repository and bugs URLs in package.json

## 🚀 Publishing Steps

1. Ensure all checks pass
2. Build the project: `npm run build`
3. Test locally with n8n
4. Publish to npm: `npm publish`
5. Submit for n8n verification (if desired)

## 📋 Example HTTP Request Implementation

```typescript
import {
  IExecuteFunctions,
  IDataObject,
  NodeApiError,
  JsonObject,
} from 'n8n-workflow';

export async function apiRequest(
  this: IExecuteFunctions,
  method: string,
  endpoint: string,
  body: IDataObject = {},
  qs: IDataObject = {},
) {
  const credentials = await this.getCredentials('myApi');
  
  const options: IDataObject = {
    method,
    body,
    qs,
    url: `https://api.example.com${endpoint}`,
    headers: {
      'Authorization': `Bearer ${credentials.apiKey}`,
      'Content-Type': 'application/json',
    },
    json: true,
  };

  try {
    return await this.helpers.request(options);
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as JsonObject);
  }
}
```

## 🎯 UX Guidelines Summary

### Naming Conventions
- **Title Case**: Node names, parameter labels, dropdown titles
- **Sentence case**: Descriptions, tooltips, action names
- Use service's terminology (from their UI, not API)
- No technical jargon

### Error Messages
- Explain what happened (without using "error", "problem")
- Include how to fix it
- Reference parameter names in quotes
- Add `[item X]` suffix for specific items

### Operations
- Include CRUD operations where applicable
- Use consistent naming (Get, Create, Update, Delete)
- Add "Simplify" parameter for responses with >10 fields
- Delete operations should return `{"deleted": true}`

### Credentials
- API keys must be password fields
- Include OAuth if available
- Clear instructions on obtaining credentials

---

## Notes
- This checklist is based on n8n community node guidelines as of the creation date
- Always check the latest n8n documentation for updates
- Test thoroughly before publishing
- Consider user feedback for improvements