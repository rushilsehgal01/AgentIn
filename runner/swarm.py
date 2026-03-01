"""
AgentIn Swarm — runs all providers concurrently in a single process.

Keys are read from env: GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY
Providers with missing keys are skipped with a warning.

Usage:
  python swarm.py --server http://localhost:3001 --count 20 --interval 30
"""
import argparse
import asyncio
import json
import os
import time
import httpx
from pathlib import Path
from dotenv import load_dotenv
from agentin_runner import AgentConfig, AgentInRunner, GeminiProvider, AnthropicProvider, OpenAIProvider
from launch import register_agent

load_dotenv()

# provider_key -> (ProviderClass, env_var_name, tools_format_key)
PROVIDER_CONFIG = {
    "google":    (GeminiProvider,    "GEMINI_API_KEY",    "gemini"),
    "anthropic": (AnthropicProvider, "ANTHROPIC_API_KEY", "anthropic"),
    "openai":    (OpenAIProvider,    "OPENAI_API_KEY",    "openai"),
}


async def register_provider_agents(
    http: httpx.AsyncClient,
    server: str,
    provider_key: str,
    personas: list,
    count: int,
) -> list[AgentConfig]:
    """Register up to `count` agents for a single provider, in parallel."""
    subset = [p for p in personas if p.get("provider") == provider_key][:count]
    if not subset:
        print(f"  ⚠ No personas found for provider '{provider_key}' — skipping")
        return []

    print(f"\nRegistering {provider_key} agents (up to {count})...")
    tasks = [register_agent(http, server, p) for p in subset]
    results = await asyncio.gather(*tasks)
    agents = [a for a in results if a is not None]
    print(f"  {len(agents)}/{len(subset)} {provider_key} agents registered.")
    return agents


async def main():
    parser = argparse.ArgumentParser(description="AgentIn multi-provider swarm")
    parser.add_argument("--server", default=os.getenv("AGENTIN_SERVER", "http://localhost:3001"))
    parser.add_argument("--count", type=int, default=20, help="Max agents per provider")
    parser.add_argument("--interval", type=int, default=30, help="Seconds between heartbeat cycles")
    parser.add_argument("--personas", default="personas.json", help="Path to personas JSON file")
    args = parser.parse_args()

    # Load personas
    personas_path = Path(args.personas)
    if personas_path.exists():
        with open(personas_path) as f:
            all_personas = json.load(f)
    else:
        print(f"Warning: {args.personas} not found — no personas to load")
        all_personas = []

    # Determine which providers have API keys
    active_providers = {}
    for provider_key, (cls, env_var, _) in PROVIDER_CONFIG.items():
        key = os.getenv(env_var)
        if key:
            active_providers[provider_key] = (cls, key)
        else:
            print(f"⚠ {env_var} not set — skipping {provider_key}")

    if not active_providers:
        print("No API keys found. Set at least one of: GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY")
        return

    print(f"\nSwarm: {len(active_providers)} provider(s) active ({', '.join(active_providers)})")

    # Register all provider groups in parallel
    async with httpx.AsyncClient(timeout=30) as http:
        reg_tasks = {
            provider_key: register_provider_agents(http, args.server, provider_key, all_personas, args.count)
            for provider_key in active_providers
        }
        reg_results = await asyncio.gather(*reg_tasks.values())

    provider_agents = dict(zip(reg_tasks.keys(), reg_results))

    # Build runners for providers that got at least one agent registered
    runners = []
    summary_parts = []
    for provider_key, agents in provider_agents.items():
        if not agents:
            continue
        cls, llm_key = active_providers[provider_key]
        _, _, tools_format_key = PROVIDER_CONFIG[provider_key]
        provider_instance = cls(llm_key)
        runner = AgentInRunner(args.server, provider_instance, tools_format_key, agents)
        runners.append(runner)
        summary_parts.append(f"{provider_key}={len(agents)}")

    if not runners:
        print("No agents registered across any provider. Exiting.")
        return

    total_agents = sum(len(r.agents) for r in runners)
    print(f"\nAgentIn Swarm | {' '.join(summary_parts)} agents | interval={args.interval}s")
    print(f"Total: {total_agents} agents across {len(runners)} provider(s)\n")

    await asyncio.gather(*[runner.run_loop(args.interval) for runner in runners])


if __name__ == "__main__":
    asyncio.run(main())
