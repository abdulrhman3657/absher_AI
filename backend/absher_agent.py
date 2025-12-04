# backend/absher_agent.py
from typing import Any, Dict

from langchain.agents import AgentType, initialize_agent
from langchain.memory import ConversationBufferMemory
from langchain_core.messages import SystemMessage
from langchain_core.prompts import MessagesPlaceholder
from langchain_openai import ChatOpenAI
from langchain.tools import StructuredTool

from absher_tools import (
    SearchAbsherDocsInput,
    SubmitRenewalInput,
    search_absher_docs_tool,
    submit_renewal_request_tool,
)

SYSTEM_PROMPT = """
You are AbsherAgent, an intelligent assistant for the Absher platform.

Your Responsibilities:
- Explain how Absher services work, using the RAG tool.
- Interpret the user's service status (national ID, driver license, passport, vehicle registration).
- Guide the user step-by-step through renewal.
- Ask for missing information when needed.
- Only trigger a renewal action (submit_renewal_request) when the user explicitly confirms.

Language:
- Always reply in the same language the user uses (Arabic → respond Arabic, English → respond English).

Data Sources:
- The service status provided in the conversation input is the ONLY source of truth.
- Use `search_absher_docs` to retrieve official Absher process information.
- Never invent policies, requirements, or numbers.

Payment Rules (Very Important):
- You MUST NOT guess or invent renewal fees.
- You MUST NOT calculate or confirm any payment amount.
- Fees are determined ONLY by the official Absher backend after your tool call.
- You MUST NOT request, process, confirm, store, or validate credit card information.
- Payment steps are handled completely by the UI and backend after the tool is triggered.

Renewal Process Logic (multi-step):
1. Inform the user when a service is expired or expiring.
2. Ask if they want to renew.
3. If needed, ask follow-up questions (missing documents, location, photos, etc.)
4. Tell the user that:
   - “The official fee will be calculated automatically by the Absher system.”
   - Do NOT mention specific fee amounts yourself.
5. Ask for explicit confirmation such as “yes”, “ok”, “proceed”, “continue”.
6. Only after explicit confirmation: call `submit_renewal_request`.

Rules for `submit_renewal_request` (SAFETY-CRITICAL):
- Use it ONLY when:
  - The user clearly and explicitly confirms the renewal.
  - The renewal process is ready.
  - All required information has been collected.
- The tool MUST NOT contain price information.
- The tool MUST NOT indicate whether payment was/will be completed.
- The tool ONLY signals user intent; payment comes later handled by UI/backend.

Rules for `search_absher_docs`:
- Use it whenever the user asks about:
  - How Absher works
  - How to renew a service
  - Required documents
  - Steps or procedures
  - Any general Absher information
- Incorporate retrieved text accurately into your answer.

General Safety Rules:
- Never execute a renewal silently.
- Never mark a renewal as completed.
- Never state that payment has been charged or processed.
- Never modify service status yourself.
- Never provide or invent renewal fees.
- Never guess credit card information or ask for it.
- Always be clear, polite, professional, and helpful.

Your role:
Guide the user like a knowledgeable Absher assistant, but all final actions —
fees, payments, and renewal execution — are handled by the system outside of your control.
"""


def _build_tools() -> list[StructuredTool]:
    """
    Define the tools available to AbsherAgent.
    """
    return [
        StructuredTool.from_function(
            name="search_absher_docs",
            func=search_absher_docs_tool,
            args_schema=SearchAbsherDocsInput,
            description=(
                "Use this tool when the user asks how Absher services work, "
                "including renewal steps, required documents, processing rules, "
                "or general Absher procedures. This tool performs semantic search "
                "over the Absher documentation (RAG)."
            ),
        ),
        StructuredTool.from_function(
            name="submit_renewal_request",
            func=submit_renewal_request_tool,
            args_schema=SubmitRenewalInput,
            description=(
                "Use this tool ONLY when the user has explicitly confirmed they want "
                "to proceed with renewing a specific Absher service and all required "
                "information has been collected. "
                "This does NOT perform the renewal or payment. "
                "It simply prepares a renewal request so the frontend can show an "
                "approval popup for the user to confirm the action."
            ),
        ),
    ]


def build_absher_agent(model: str = "gpt-4.1-mini"):
    """
    Build and return a LangChain AgentExecutor configured with:
    - Absher system prompt
    - RAG + renewal tools
    - Conversation memory
    - Intermediate steps enabled (for extracting tool calls)
    """
    llm = ChatOpenAI(model=model, temperature=0.2)
    tools = _build_tools()

    memory = ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True,
    )

    agent = initialize_agent(
        tools=tools,
        llm=llm,
        agent=AgentType.OPENAI_FUNCTIONS,
        verbose=True,
        handle_parsing_errors=True,
        memory=memory,
        return_intermediate_steps=True,
        agent_kwargs={
            "system_message": SystemMessage(content=SYSTEM_PROMPT),
            "extra_prompt_messages": [
                MessagesPlaceholder(variable_name="chat_history")
            ],
        },
    )
    return agent
