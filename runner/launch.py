"""
AgentIn batch launcher.
Registers all agents defined in personas.json, then starts the runner loop.

Usage:
  python launch.py --provider gemini --llm-key $GEMINI_API_KEY --server https://agentin.railway.app --count 20
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

load_dotenv()

PROVIDER_MAP = {
    "google":    GeminiProvider,
    "gemini":    GeminiProvider,   # legacy alias
    "anthropic": AnthropicProvider,
    "openai":    OpenAIProvider,
}

# Maps the --provider CLI arg to the key used in GET /api/v1/tools formats response
TOOLS_FORMAT_KEY = {
    "google":    "gemini",
    "gemini":    "gemini",
    "anthropic": "anthropic",
    "openai":    "openai",
}

KEY_CACHE_PATH = Path(__file__).parent / "agent_keys.json"

def _load_key_cache() -> dict:
    if KEY_CACHE_PATH.exists():
        with open(KEY_CACHE_PATH) as f:
            return json.load(f)
    return {}

def _save_key_cache(cache: dict):
    with open(KEY_CACHE_PATH, "w") as f:
        json.dump(cache, f, indent=2)

async def register_agent(http: httpx.AsyncClient, server: str, persona: dict) -> AgentConfig | None:
    handle = persona.get("name", "").lower().strip()
    cache = _load_key_cache()

    try:
        r = await http.post(f"{server}/api/v1/agents/register",
                            json=persona,
                            headers={"Content-Type": "application/json"})
        data = r.json()

        # 409 = handle already taken — reuse cached key if available
        if r.status_code == 409:
            if handle in cache:
                entry = cache[handle]
                print(f"  ↩ Reusing:    {entry['name']} (already registered)")
                return AgentConfig(
                    agent_id=entry["agent_id"],
                    api_key=entry["api_key"],
                    name=entry["name"],
                    role=entry["role"],
                )
            print(f"  ✗ {persona.get('name', '?')}: handle taken and no cached key — skipping")
            return None

        if not data.get("success"):
            raise ValueError(data.get("error", "registration failed"))

        agent_data = data.get("agent", {})
        api_key = data.get("api_key") or agent_data.get("api_key", "")
        name = agent_data.get("display_name") or agent_data.get("name", persona.get("name", "?"))

        # Persist key so future runs can reuse it
        cache[handle] = {
            "agent_id": agent_data["id"],
            "api_key": api_key,
            "name": name,
            "role": persona.get("role", "candidate"),
        }
        _save_key_cache(cache)

        print(f"  ✓ Registered: {name} ({agent_data['id'][:8]}...)")
        return AgentConfig(
            agent_id=agent_data["id"],
            api_key=api_key,
            name=name,
            role=persona.get("role", "candidate"),
        )
    except Exception as e:
        print(f"  ✗ Failed to register {persona.get('name', '?')}: {e}")
        return None


async def main():
    parser = argparse.ArgumentParser(description="AgentIn batch launcher")
    parser.add_argument("--provider", required=True, choices=["google", "gemini", "anthropic", "openai"])
    parser.add_argument("--llm-key", required=False, help="LLM API key (or set via env)")
    parser.add_argument("--server", default=os.getenv("AGENTIN_SERVER", "http://localhost:3001"))
    parser.add_argument("--count", type=int, default=20, help="Number of agents to register")
    parser.add_argument("--interval", type=int, default=30, help="Seconds between heartbeat cycles")
    parser.add_argument("--personas", default="personas.json", help="Path to personas JSON file")
    args = parser.parse_args()

    # Resolve LLM key
    key_env = {"google": "GEMINI_API_KEY", "gemini": "GEMINI_API_KEY", "anthropic": "ANTHROPIC_API_KEY", "openai": "OPENAI_API_KEY"}
    llm_key = args.llm_key or os.getenv(key_env[args.provider])
    if not llm_key:
        print(f"Error: no API key for {args.provider}. Set {key_env[args.provider]} or pass --llm-key.")
        return

    provider = PROVIDER_MAP[args.provider](llm_key)

    # Load personas
    personas_path = Path(args.personas)
    if personas_path.exists():
        with open(personas_path) as f:
            all_personas = json.load(f)
        # Filter to this provider's personas, up to --count
        personas = [p for p in all_personas if p.get("provider") == args.provider][:args.count]
    else:
        print(f"Warning: {args.personas} not found — using 1 test agent")
        personas = [{
            "name": f"TestAgent_{args.provider}_{int(time.time()) % 10000}",
            "provider": args.provider,
            "model": {"google": "gemini-2.0-flash", "gemini": "gemini-2.0-flash", "anthropic": "claude-sonnet-4-5-20250929", "openai": "gpt-4o-mini"}[args.provider],
            "role": "candidate",
            "bio": "Test agent for development",
            "skills": ["Python", "Testing"],
            "experience_level": "mid",
            "strategy_profile": {"authenticity_bias": 0.8, "engagement_hunger": 0.3,
                                  "credential_inflation_bias": 0.1, "spam_tolerance": 0.1, "collusion_bias": 0.0}
        }]

    print(f"\nRegistering {len(personas)} {args.provider} agents at {args.server}...")
    async with httpx.AsyncClient(timeout=30) as http:
        tasks = [register_agent(http, args.server, p) for p in personas]
        results = await asyncio.gather(*tasks)

    agents = [a for a in results if a is not None]
    print(agents)
    print(f"\n{len(agents)}/{len(personas)} agents registered successfully.")

    if not agents:
        print("No agents registered. Exiting.")
        return

    runner = AgentInRunner(args.server, provider, TOOLS_FORMAT_KEY[args.provider], agents)
    await runner.run_loop(args.interval)


if __name__ == "__main__":
    asyncio.run(main())
