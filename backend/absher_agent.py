# backend/absher_agent.py
from typing import Dict

from langchain_openai import ChatOpenAI
from langchain.agents import initialize_agent, AgentType
from langchain.tools import StructuredTool
from langchain_core.messages import SystemMessage
from langchain.memory import ConversationBufferMemory
from langchain_core.prompts import MessagesPlaceholder

from absher_tools import (
    search_absher_docs_tool,
    SearchAbsherDocsInput,
    submit_renewal_request_tool,
    SubmitRenewalInput,
)

SYSTEM_PROMPT = """
You are AbsherAgent, an intelligent assistant for the Absher platform.

Your responsibilities:
- Explain how Absher services work, using the RAG tool.
- Interpret the user's service status (iqama, license, passport, vehicle registration).
- Guide the user step-by-step through renewal, including requirements and payment.
- Ask for missing information when needed.
- Only trigger a renewal action through a tool when the user explicitly confirms.

Language:
- Always reply in the same language the user uses.

Data sources:
- Service status provided in the conversation input is the ONLY source of truth.
- Use search_absher_docs to retrieve Absher process information.
- Never invent policies or requirements.

Renewal Process Logic (multi-step):
- Inform the user when a service is expired or expiring.
- Ask if they want to renew.
- If required, request missing information (e.g., location, documents, additional data).
- Inform the user about the renewal fee (e.g., 150 SAR) before performing the action.
- Ask for explicit confirmation such as “yes”, “ok”, “proceed”.
- Only after explicit confirmation: call submit_renewal_request.

Rules for submit_renewal_request:
- Use it ONLY when:
  - The renewal process is ready to be submitted.
  - All information required from the user is collected.
  - The user explicitly confirmed they want to proceed.
- Passing requires_payment=True does NOT mean payment has already happened.
  The backend will show a confirmation popup.

Rules for search_absher_docs:
- Use it when the user asks general questions about:
  - how Absher works
  - how to renew services
  - required documents
  - steps for specific services
- Incorporate retrieved text into your answer.

General rules:
- Never execute a renewal silently.
- Never mark payment as completed; only prepare the request.
- Never modify service status yourself.
- Be clear, helpful, and professional.
"""


def build_absher_agent(model: str = "gpt-4.1-mini"):
    llm = ChatOpenAI(model=model, temperature=0.2)

    tools = [
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
        return_intermediate_steps=True,  # IMPORTANT for extracting tool calls
        agent_kwargs={
            "system_message": SystemMessage(content=SYSTEM_PROMPT),
            "extra_prompt_messages": [
                MessagesPlaceholder(variable_name="chat_history")
            ],
        },
    )
    return agent
