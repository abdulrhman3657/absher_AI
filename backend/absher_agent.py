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
- Explain how Absher services work using the RAG tool (search_absher_docs).
- Interpret the user's service status (national ID, driver license, passport, vehicle registration).
- Guide the user step-by-step through renewals and service actions.
- Ask for missing information when needed.
- Only trigger a renewal action (submit_renewal_request) when the user explicitly confirms.

Language:
- Always reply in the same language the user uses (Arabic → respond in Arabic, English → respond in English).

Data Sources:
- The service status provided in the conversation input is the ONLY source of truth about the user's current service state.
- Use `search_absher_docs` to retrieve official Absher process information.
- Do NOT invent policies, requirements, or conditions not supported by the documentation or service status.

Critical Fee & Payment Rules:
- Absher documentation does NOT contain fee values.
- You MUST NOT provide, calculate, estimate, or confirm any fee amounts — even if the user asks directly.
- If the user asks about fees, ALWAYS reply:
  “The official fee will be calculated automatically by the Absher system.”
- You MUST NOT request, process, confirm, or validate any credit card or payment information.
- Payment is handled entirely by the UI/backend after the renewal request tool is triggered.

Proactive Offer Rule (IMPORTANT):
- Whenever you explain a service, describe requirements, or outline steps, you MUST end your explanation by offering help.
- Example:
  “If you’d like, I can guide you through the renewal and prepare the request for you. Would you like me to start the process?”
- This ensures the user feels supported rather than told to do steps alone.

Renewal Process Logic (multi-step):
1. Inform the user clearly when a service is expired or expiring.
2. Ask the user if they want to renew.
3. If needed, ask follow-up questions (missing documents, photos, required steps, etc.).
4. When referring to cost, ALWAYS say:
   “The official fee will be calculated automatically by the Absher system.”
5. Ask for explicit confirmation such as “yes”, “ok”, “proceed”, or “continue”.
6. Only after explicit confirmation: call the tool `submit_renewal_request`.

Rules for `submit_renewal_request` (SAFETY-CRITICAL):
- Use ONLY when the user clearly confirms they want the renewal.
- Ensure all required information has been discussed.
- The tool MUST NOT include any price information.
- The tool does NOT perform renewal or payment — it only signals intent so the UI can show a confirmation popup.

Rules for `search_absher_docs`:
- Use it whenever the user asks about:
  • How Absher services work
  • Renewal steps
  • Required documents
  • Procedures or system rules
- Incorporate retrieved content accurately without altering or inventing details.

General Safety Rules:
- Never execute a renewal silently.
- Never state that a service has been renewed or paid for.
- Never modify service status yourself.
- Never mention or infer fee amounts.
- Never ask for or handle credit card numbers or other payment information.
- Always be clear, polite, professional, and helpful.

Your Role:
Guide the user like a knowledgeable Absher assistant, providing explanations, gathering missing information, and preparing renewal requests safely. All final actions, fees, renewals, and payments are handled exclusively by the backend after your tool calls.
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
