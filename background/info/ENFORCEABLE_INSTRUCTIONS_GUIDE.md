# Enforceable AI Instructions Guide

## Overview
This document provides research-based best practices for creating AI agent instructions that will be **consistently followed**, not just acknowledged. Based on analysis of successful vs failed instruction patterns in AI systems.

## Current Problem in CLAUDE.md
**Analysis of Existing Subagent Policy Failures:**

### What Exists (But Gets Ignored):
```markdown
## CRITICAL: **Subagent Usage Policy**:
- Use subagents for self-contained sub-tasks where only the final result is relevant
- Use general-purpose subagents even when no specialized agent matches the task
- Execute multiple independent subagents in parallel when possible
```

### Why This Fails:
1. **Placement Issue**: Buried in startup actions, not at decision points
2. **Vague Triggers**: No specific "when" conditions that force evaluation
3. **Optional Language**: "Use subagents" sounds like a suggestion, not a requirement
4. **No Consequences**: No indication of what happens if ignored
5. **No Examples**: Abstract guidance without concrete scenarios

## Research-Based Principles for Enforceable Instructions

### 1. **Placement at Decision Points** 
**CRITICAL FINDING**: Instructions work when placed exactly where decisions are made, not in general policy sections.

**Effective Pattern:**
```markdown
BEFORE starting any multi-step analysis task, you MUST:
☐ Check: Does this require researching unfamiliar information?
☐ If YES → Launch subagent with Task tool
☐ If NO → Proceed with main context
```

**Ineffective Pattern:**
```markdown
Use subagents for research tasks. (Buried in general policies)
```

### 2. **Mandatory Decision Checkpoints**
**CRITICAL FINDING**: Questions force evaluation; statements are ignored.

**Effective Pattern:**
```markdown
⚠️  MANDATORY CHECKPOINT: Am I about to start a research task?
□ YES: I must use Task tool with general-purpose subagent
□ NO: I can proceed in main context
```

**Ineffective Pattern:**
```markdown
Consider using subagents for research.
```

### 3. **Immediate Triggers with Specific Keywords**
**CRITICAL FINDING**: Instructions work when tied to specific words/phrases that appear in user requests.

**Effective Pattern:**
```markdown
TRIGGER WORDS: "research", "analyze", "investigate", "find out", "look up"
→ If user request contains ANY trigger word, immediately use Task tool
```

**Ineffective Pattern:**
```markdown
Use subagents for self-contained sub-tasks.
```

### 4. **Unavoidable Visual Formatting**
**CRITICAL FINDING**: Agents notice visual elements that break text flow.

**Effective Formatting:**
- ⚠️ Warning symbols
- ☐ Checkboxes that demand action
- 🚨 ALERT formatting
- **Bold + ALL CAPS** for critical actions
- Boxed text that interrupts reading flow

**Ineffective Formatting:**
- Plain text
- Buried in paragraphs
- Similar formatting to other content

### 5. **Context-Aware Placement**
**CRITICAL FINDING**: Instructions work when they appear in context where they're needed.

**Effective Strategy:**
- Put subagent instructions in tool usage sections
- Place context engineering rules at task start points
- Include reminders in error/failure scenarios

**Ineffective Strategy:**
- Grouping all policies in one section
- Separating rules from their usage context

### 6. **Negative Consequences and Positive Enforcement**
**CRITICAL FINDING**: Instructions work better when there are clear stakes.

**Effective Pattern:**
```markdown
FAILURE TO USE SUBAGENTS WILL:
❌ Pollute your context with research details
❌ Prevent parallel processing
❌ Force context compaction
❌ Reduce your effectiveness on the main task
```

**Ineffective Pattern:**
```markdown
Subagents help with context preservation.
```

### 7. **Concrete Examples and Anti-Patterns**
**CRITICAL FINDING**: Abstract rules are ignored; specific examples are followed.

**Effective Pattern:**
```markdown
✅ CORRECT: User asks "research X" → Launch Task tool immediately
❌ WRONG: Start researching X in main context
```

## Specific Techniques for Subagent Policy Enforcement

### A. **Interrupt-Based Instruction Placement**
Place subagent reminders exactly where agents start tasks:

```markdown
⚠️ BEFORE PROCEEDING: Does this task require...
☐ Research or investigation?
☐ Analysis of unfamiliar concepts?
☐ Multi-step information gathering?
If ANY checkbox = YES → USE TASK TOOL NOW
```

### B. **Tool-Based Enforcement**
Embed subagent decisions in tool usage:

```markdown
When about to use WebSearch, Grep, or Read for research:
🚨 STOP: Should this be a subagent task instead?
```

### C. **Question-Based Decision Trees**
Force evaluation with unavoidable questions:

```markdown
Am I starting a self-contained subtask? YES/NO
↳ If YES: What specific result does the user need?
  ↳ If result can be summarized in 1-2 sentences: USE SUBAGENT
```

### D. **Failure Point Reminders**
Insert reminders at common failure points:

```markdown
If you notice your response getting long (>500 words):
⚠️ Should parts of this have been subagent tasks?
```

## Implementation Checklist for Enforceable Instructions

### ✅ Before Writing Any Instruction:
- [ ] Is it placed where the decision is made?
- [ ] Does it interrupt the agent's reading flow?
- [ ] Does it use mandatory language (MUST, WILL)?
- [ ] Does it include visual elements (symbols, checkboxes)?
- [ ] Does it specify exact triggers/conditions?
- [ ] Does it include consequences for ignoring?
- [ ] Does it provide concrete examples?

### ✅ For Subagent Policies Specifically:
- [ ] Placed before tool usage sections?
- [ ] Includes trigger words from user requests?
- [ ] Has unavoidable checkboxes or decision points?
- [ ] Specifies when NOT to use subagents?
- [ ] Shows concrete examples of good/bad usage?

## Common Anti-Patterns to Avoid

### ❌ **Policy Dumping**
Don't group all instructions in one policy section that agents read once and forget.

### ❌ **Suggestion Language** 
Avoid: "Consider", "You should", "It's recommended"
Use: "You MUST", "REQUIRED", "MANDATORY"

### ❌ **Abstract Descriptions**
Avoid: "Use subagents for appropriate tasks"
Use: "If user request contains 'research', 'analyze', or 'investigate' → Task tool"

### ❌ **Hidden in Text Walls**
Don't bury critical instructions in long paragraphs.

## Validation Test for Any Instruction

**Ask yourself**: If an agent skimmed this document quickly (as they often do), would they still follow this instruction?

- If NO: The instruction needs better placement, formatting, or specificity
- If YES: The instruction is likely to be consistently followed

## Success Metrics for Enforceable Instructions

1. **Placement Test**: Instruction appears exactly where decision is made
2. **Trigger Test**: Specific conditions that force evaluation are defined
3. **Visual Test**: Instruction interrupts normal reading flow
4. **Specificity Test**: Concrete examples show exactly what to do
5. **Consequence Test**: Clear stakes for following/ignoring are stated
6. **Context Test**: Instruction makes sense in isolation from other policies

## Next Steps

Apply these principles to transform CLAUDE.md subagent policies from suggestions into unavoidable, consistently-followed requirements.