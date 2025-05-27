# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an n8n community node package that integrates PiAPI services into n8n workflows. The package provides nodes for various AI-powered media generation and manipulation tasks including text-to-image, image-to-video, face swapping, lip sync, and more.

## Development Commands

```bash
# Install dependencies
pnpm install

# Build the project
npm run build

# Development mode (watch for changes)
npm run dev

# Format code
npm run format

# Run n8n locally with the nodes
npm run runn8n
```

## Architecture

### Node Structure
All nodes implement the `INodeType` interface and follow this pattern:
- Each AI service/model has its own directory under `nodes/PiAPI/`
- Nodes define their UI and parameters in the `description` property
- The `execute()` method handles the API calls and data processing
- Most operations are asynchronous and use task polling

### Shared Components
- **GenericFunctions.ts**: Contains `piApiRequest()` for API calls and `waitForTaskCompletion()` for async task polling
- **Constants.ts**: Centralized definitions for aspect ratios, styles, models, and other reusable options
- **Interfaces.ts**: TypeScript interfaces for API parameters and responses

### API Integration Pattern
1. Submit task: `POST https://api.piapi.ai/api/v1/task`
2. Poll status: `GET https://api.piapi.ai/api/v1/task/{taskId}`
3. Return results when status is "finished"

### Key Conventions
- Use PiAPI credentials type for authentication (X-API-Key header)
- Handle both URL inputs and binary data for media files
- Implement `continueOnFail()` for graceful error handling
- Use `displayOptions` for conditional parameter visibility
- Follow existing naming patterns for new nodes (e.g., `{Service}{Function}.node.ts`)

## Adding New Nodes

1. Create a new directory under `nodes/PiAPI/` for your service
2. Copy an existing similar node as a template
3. Update the node metadata in `description`
4. Implement the API integration in `execute()`
5. Add the node to `package.json` in the `n8n.nodes` array
6. Add any new shared constants or interfaces to the shared files

## Testing

Currently, the project uses manual testing through n8n:
1. Build the project: `npm run build`
2. Run n8n locally: `npm run runn8n`
3. Test the node in the n8n UI

Note: Linting is temporarily disabled in the project.

## n8n Cloud Approval Guidelines

To ensure nodes are approved for n8n Cloud verification, follow these critical requirements:

### Technical Requirements
- **No external dependencies**: The package must not include any runtime dependencies
- **No environment variables or file system access**: All data must pass through node parameters
- **Linter must pass**: Run `npx @n8n/scan-community-package n8n-nodes-piapi` to verify
- **MIT License**: Package must use MIT license
- **Proper package naming**: Must start with `n8n-nodes-` or `@<scope>/n8n-nodes-`
- **Required keywords**: Include `n8n-community-node-package` in package.json keywords

### UX Requirements

#### Credentials
- API keys and sensitive credentials must always be password fields
- Include OAuth credential option if available

#### Node Structure
- Include CRUD operations for each resource: Create, Create/Update, Delete, Get, Get Many, Update
- Use Resource Locator component when selecting single items (default to "From list")
- Add "Simplify" parameter when endpoints return >10 fields
- Delete operations must return `{"deleted": true}`

#### Copy and Terminology
- **Title Case**: Node names, parameter display names, dropdown titles
- **Sentence case**: Action names, descriptions, tooltips, hints
- Use third-party service terminology (match their UI, not API)
- No technical jargon (use "field" not "key")
- Placeholders should start with "e.g." and use camelCase

#### Operation Naming
- **Name**: Title Case, don't repeat resource if shown above
- **Action**: Sentence case, include resource, omit articles (a, an, the)
- **Description**: Sentence case, provide alternative wording, be specific

#### Error Handling
- Error messages must explain what happened without using "error", "problem", "failure"
- Include parameter displayName that triggered the error
- Add [item X] suffix for specific item errors
- Error descriptions must guide users on how to fix the issue

### Documentation Requirements
- Include comprehensive README with usage examples
- Document authentication requirements
- Provide example workflows
- Link to relevant API documentation