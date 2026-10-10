[README.md](https://github.com/user-attachments/files/33280821/README.md)
# SentinelMesh

### Zero-Trust Security Gateway for AI Agents

**Let AI act. But never let AI act without a security boundary.**

[Live Demo](https://sentinelmesh-silk.vercel.app) · [GitHub Repository](https://github.com/s333s/SentinelMesh)

## Overview

AI agents can read emails, interpret documents, and propose actions for connected devices. That creates a security risk: malicious or misleading content could persuade an agent to unlock a door, disable an alarm, or perform another dangerous action.

**SentinelMesh adds a zero-trust security gateway between an AI agent and the actions it can take.** Every proposed tool call is evaluated before execution. A risk analyzer identifies potential phishing, impersonation, social engineering, and prompt-injection signals, while a deterministic policy engine decides whether the action is allowed, denied, blocked, or sent for human approval.

The current project demonstrates this workflow with a **simulated smart-home environment**. It does not control real physical devices.

## How It Works

```text
Untrusted Message
       ↓
   AI Agent (Atlas)
       ↓
 SentinelMesh Gateway
       ↓
Risk Analysis + Policy Checks
       ↓
Allow / Deny / Block / Human Approval
       ↓
Simulated Smart-Home Device
```

The AI agent is not the final authority on whether an action is safe. Risk analysis can identify suspicious content, but the policy engine enforces the security rules. The language-model analysis can add risk signals; it cannot lower the deterministic baseline risk.

## Key Features

- **Tool-call interception:** check proposed actions before they reach simulated devices.
- **Risk analysis:** assess potential phishing, impersonation, social engineering, urgency manipulation, and prompt injection.
- **Policy-based enforcement:** apply security rules to sensitive actions such as unlocking doors or disabling alarms.
- **Human approval:** route sensitive actions for review when policy requires it.
- **Attack Lab:** explore scenarios involving phishing, fake administrators, hidden document instructions, fake emergency overrides, and unsafe commands.
- **Safe-action simulation:** compare suspicious requests with legitimate device actions.
- **Security dashboard and event log:** inspect decisions, risk scores, policy outcomes, and device state.

## Example Attack Scenarios

| Scenario | Risk being demonstrated |
| --- | --- |
| Phishing message | A spoofed delivery or security message tries to trigger a device action. |
| Fake administrator | An impersonated IT request asks to disable a security camera. |
| Hidden prompt injection | A document contains instructions intended to manipulate the agent. |
| Fake emergency override | A message claims urgent authority to bypass safeguards. |
| Unsafe device command | A request attempts to change a device beyond configured limits. |

## Technology Stack

- **Next.js 16** and **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **AI SDK** with the `openai/gpt-5.4-mini` model through the AI Gateway
- **Zod** for structured output validation
- **Recharts** for dashboard visualizations
- **Lucide React** and **shadcn/ui** components
- **pnpm** for package management
- **Vercel** for the live demo

## Run Locally

### Prerequisites

- Node.js 20.9 or newer
- pnpm
- An AI Gateway API key if you want to run the language-model-powered analysis locally

### Install and start

```bash
git clone https://github.com/s333s/SentinelMesh.git
cd SentinelMesh
pnpm install
```

Create a `.env.local` file in the project root and add your AI Gateway key if required by your local setup:

```env
AI_GATEWAY_API_KEY=your_api_key_here
```

Keep API keys private. Do not commit `.env.local` or publish secrets. Then start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Other available scripts:

```bash
pnpm build
pnpm start
```

`pnpm start` runs the production server after you have built the application with `pnpm build`.

## Demo Safety Note

SentinelMesh is a prototype and demonstration of an AI security gateway. The smart-home devices shown in the interface are simulated. Do not use this prototype as the sole security control for a real building, alarm, lock, or other safety-critical system. A production deployment would require additional testing, hardened identity and authorization, secure integrations, monitoring, and independent security review.

## Project Links

- **Live demo:** https://sentinelmesh-silk.vercel.app
- **Source code:** https://github.com/s333s/SentinelMesh
- **GitHub profile:** https://github.com/s333s
- **Youtube vedio:** https://youtu.be/Mzpf7zLGMAk?si=kTX-dhW33czuTfmp

## Core Principle

> The AI is not trusted just because it is the AI.

SentinelMesh checks actions before execution—because autonomous systems need boundaries, not blind trust.
