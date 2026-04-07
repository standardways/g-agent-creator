# Security Policy

`G-Agent Creator` is meant to generate agents that are useful in real environments, so security is part of the product, not decoration.

## Supported Security Scope

Security-sensitive areas in this repo include:

- prompt assembly and prompt-injection handling
- tool execution and runtime profiles
- OpenShell and hardened execution paths
- auth, session ownership, and hosted deployment defaults
- outbound fetch and webhook policy
- knowledge ingest and wiki persistence
- plugin and skill import paths

## Reporting A Vulnerability

If you find a security issue, please report it privately before opening a public issue.

Include:

- affected file or subsystem
- impact
- reproduction steps
- any proof-of-concept input if relevant
- suggested mitigation if you have one

If the issue involves credential exposure, prompt injection, auth bypass, command execution, SSRF, or unsafe remote execution, call that out clearly.

## Project Security Expectations

We try to keep the generated product:

- strict-auth by default for hosted mode
- deny-by-default for risky execution paths
- explicit about trust boundaries
- careful about untrusted tool and knowledge content
- operator-visible about dangerous configuration

## Prompt Injection

This repo explicitly treats prompt injection as a real security concern.

The generated template includes defenses for:

- tool output reentry
- fetched web content
- imported knowledge
- wiki persistence
- operator-visible prompt-injection findings

If you contribute in those areas, do not weaken instruction/data separation for convenience.
