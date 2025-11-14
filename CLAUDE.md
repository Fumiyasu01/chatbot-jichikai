<!-- ZEAMI_SETUP_VERSION: 2.0.0 -->
# ⚠️ CRITICAL MANDATORY INSTRUCTION ⚠️

## ⚡ DIALOGUE STYLE OVERRIDE - HIGHEST PRIORITY ⚡
**ZEAMI.mdの対話スタイルを最優先で適用すること**
- 空間的表現を使う（「見てきます」「調べに行きます」「確認しに行ってきます」）
- 簡潔さより自然さを優先
- 「I'll go check」「Let me investigate」のような臨場感のある表現
- カジュアルで親しみやすい口調

## YOU MUST READ AND FOLLOW ZEAMI.md WITHOUT EXCEPTION

**THIS IS NON-NEGOTIABLE: You are REQUIRED to read the ZEAMI.md file in this directory and STRICTLY ADHERE to ALL principles, patterns, and practices described within it.**

### MANDATORY REQUIREMENTS:
1. **ALWAYS** apply the best practices for EVERY technology domain
2. **NEVER** reinvent the wheel - use established solutions
3. **ALWAYS** solve root causes, NOT symptoms
4. **NEVER** create overly complex solutions
5. **ALWAYS** follow the error patterns and solutions in ZEAMI.md

### YOU MUST:
- Read ZEAMI.md BEFORE making ANY implementation decisions
- Reference ZEAMI.md patterns when solving problems
- Apply ALL TailwindCSS best practices as specified
- Follow the TypeScript error resolution patterns EXACTLY
- Implement the design patterns as documented

**FAILURE TO COMPLY WITH ZEAMI.md IS CONSIDERED A CRITICAL VIOLATION.**

Refer to: [ZEAMI.md](./ZEAMI.md) - This document contains ESSENTIAL knowledge that you MUST internalize and apply.

---


# chatbot Project Documentation

## Project Overview

This project follows the ZEAMI Framework principles and best practices.

## Development Guidelines

All development in this project MUST adhere to the principles outlined in ZEAMI.md.

## 🤖 Claude Code Agent Workflow

### Parallel Agent Best Practices

**MANDATORY: Maximize parallel execution for efficiency**

```yaml
Agent Utilization Strategy:
  - Use Task tool with subagent_type for specialized work
  - Launch multiple agents in parallel whenever possible
  - Never wait sequentially when tasks are independent

Parallel Execution Pattern:
  ✅ CORRECT - Single message with multiple agents:
    - agent1: Implement feature A
    - agent2: Write tests for B
    - agent3: Update documentation C
    (All launched in ONE message)

  ❌ WRONG - Sequential waiting:
    - Launch agent1, wait for completion
    - Then launch agent2, wait for completion
    - Then launch agent3

Subagent Types to Use:
  - Explore: Code analysis, pattern finding, answering "how does X work?"
  - Plan: Task planning and design decisions
  - general-purpose: Complex multi-step implementation tasks
```

### Definition of Done (DOD)

**Every phase MUST complete these steps before moving to next phase:**

```yaml
Phase Completion Checklist:
  1. Code Implementation ✓
  2. Type Safety Check ✓
     - No 'any' types
     - All imports resolved
     - TypeScript strict mode passing

  3. Code Review (Automated) ✓
     - Launch code-review agent
     - Address all findings

  4. Production Build ✓
     - Run: npm run build
     - Must succeed with 0 errors
     - Fix any warnings

  5. Tests (when applicable) ✓
     - Unit tests passing
     - Integration tests passing

  6. Documentation Update ✓
     - Update relevant docs
     - Add inline comments for complex logic

Exit Criteria:
  - All 6 items checked ✓
  - No blocking issues
  - Code committed with proper message
```

### Implementation Workflow

```yaml
Phase Start:
  1. Create TodoList with clear tasks
  2. Mark ONE task as in_progress
  3. Launch parallel agents for independent work

During Implementation:
  1. Use parallel agents aggressively
  2. Update TodoList in real-time
  3. Complete one task before starting next

Phase End (DOD):
  1. Run type check: npx tsc --noEmit
  2. Run build: npm run build
  3. Launch code-review agent
  4. Fix all issues found
  5. Mark all tasks as completed
  6. Commit with descriptive message

Between Phases:
  - Brief status report
  - Ask for approval before next phase (if major changes)
```

### Efficiency Rules

```yaml
ALWAYS:
  - Launch agents in parallel for independent tasks
  - Use TodoWrite to track progress
  - Run builds after significant changes
  - Commit frequently with clear messages

NEVER:
  - Wait for one agent when others can run in parallel
  - Skip type checking
  - Skip production build verification
  - Proceed with TypeScript errors
  - Use 'any' type without strong justification
```

## Project Structure

### Current Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── chat/[roomId]/     # User chat interface
│   ├── admin/[roomId]/    # Admin dashboard
│   ├── super-admin/       # Super admin panel
│   └── api/               # API routes
├── components/
│   └── ui/                # shadcn/ui components
└── lib/
    ├── supabase/          # Database client & types
    └── utils/             # Utility functions
```

### Target Architecture (After Refactoring)

```
src/
├── app/                    # Next.js App Router (thin layer)
├── components/
│   ├── chat/              # Chat-related components
│   ├── admin/             # Admin-related components
│   ├── shared/            # Shared components
│   └── ui/                # shadcn/ui base components
└── lib/
    ├── services/          # Business logic layer
    ├── repositories/      # Data access layer
    ├── hooks/             # Custom React hooks
    ├── types/             # Shared TypeScript types
    ├── supabase/          # Database client & types
    └── utils/             # Utility functions
```

## Key Features

[List key features here]

## Development Setup

[Add setup instructions here]

## Testing

[Add testing guidelines here]

## Deployment

[Add deployment instructions here]

---

*This document was automatically generated with ZEAMI Framework compliance requirements.*
