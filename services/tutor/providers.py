"""
AI Teaching Assistant Providers & Router.
Integrates Google Gemini (Primary) and Groq (Secondary Fallback) with
Pydantic structured output validation and circuit breaker.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from groq import Groq

from apps.api.app.core.config import settings
from apps.api.app.core.logging import logger


class TutorResponseSchema(BaseModel):
    response_text: str = Field(description="Educational and clear response to the student or teacher")
    intent: str = Field(description="Identified intent: explanation, example_sentence, quiz, conversation")
    vocabulary_references: List[str] = Field(default_factory=list, description="List of Word IDs explicitly discussed")
    examples: List[str] = Field(default_factory=list, description="Practical language examples")
    uncertainty_notes: Optional[str] = Field(default=None, description="Note if requested information is unavailable in approved dictionary")
    requires_teacher_review: bool = Field(default=False, description="True if generated content requires teacher review")


class BaseLLMProvider(ABC):
    @abstractmethod
    def generate_grounded_response(
        self,
        system_prompt: str,
        user_message: str,
        context_data: Dict[str, Any]
    ) -> TutorResponseSchema:
        pass


class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: str = settings.GEMINI_API_KEY, model_name: str = settings.GEMINI_MODEL):
        self.api_key = api_key
        self.model_name = "gemini-flash-lite-latest"
        self.client = None
        if api_key:
            try:
                self.client = genai.Client(api_key=api_key)
            except Exception as e:
                logger.warning("Failed to initialize Google GenAI Client", error=str(e))

    def generate_grounded_response(
        self,
        system_prompt: str,
        user_message: str,
        context_data: Dict[str, Any]
    ) -> TutorResponseSchema:
        if not self.client:
            raise ConnectionError("Gemini client not configured")

        prompt_content = (
            f"{system_prompt}\n\n"
            f"=== VERIFIED CANONICAL DATABASE CONTEXT (DO NOT OVERRIDE) ===\n"
            f"{context_data}\n\n"
            f"=== USER QUERY ===\n"
            f"{user_message}"
        )

        for model_candidate in ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-pro-latest"]:
            try:
                response = self.client.models.generate_content(
                    model=model_candidate,
                    contents=prompt_content,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=TutorResponseSchema,
                        temperature=0.2,
                    ),
                )
                return TutorResponseSchema.model_validate_json(response.text)
            except Exception as e:
                logger.warning("Gemini model candidate attempt failed", model=model_candidate, error=str(e))
                last_err = e
        raise last_err


class GroqProvider(BaseLLMProvider):
    def __init__(
        self,
        api_key: str = settings.GROQ_API_KEY,
        fallback_key: str = settings.GROQ_FALLBACK_API_KEY,
        model_name: str = settings.GROQ_MODEL
    ):
        self.api_key = api_key or fallback_key
        self.model_name = "openai/gpt-oss-120b"
        self.client = None
        if self.api_key:
            try:
                self.client = Groq(api_key=self.api_key)
            except Exception as e:
                logger.warning("Failed to initialize Groq Client", error=str(e))

    def generate_grounded_response(
        self,
        system_prompt: str,
        user_message: str,
        context_data: Dict[str, Any]
    ) -> TutorResponseSchema:
        if not self.client:
            raise ConnectionError("Groq client not configured")

        prompt_content = (
            f"{system_prompt}\n\n"
            f"=== VERIFIED CANONICAL DATABASE CONTEXT ===\n"
            f"{context_data}\n\n"
            f"Return JSON adhering strictly to fields: response_text, intent, vocabulary_references, examples, uncertainty_notes, requires_teacher_review."
        )

        for model_cand in ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]:
            try:
                chat_completion = self.client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": prompt_content},
                        {"role": "user", "content": user_message}
                    ],
                    model=model_cand,
                    response_format={"type": "json_object"},
                    temperature=0.2,
                )
                content = chat_completion.choices[0].message.content
                return TutorResponseSchema.model_validate_json(content)
            except Exception as e:
                logger.warning("Groq model candidate attempt failed", model=model_cand, error=str(e))
                last_err = e
        raise last_err


class OllamaProvider(BaseLLMProvider):
    def __init__(self, base_url: str = "http://localhost:11434", model_name: str = "llama3.2:1b"):
        self.base_url = base_url
        self.model_name = model_name

    def generate_grounded_response(
        self,
        system_prompt: str,
        user_message: str,
        context_data: Dict[str, Any]
    ) -> TutorResponseSchema:
        import json
        import urllib.request

        prompt = (
            f"{system_prompt}\n\n"
            f"=== VERIFIED CANONICAL CONTEXT ===\n"
            f"{context_data}\n\n"
            f"Return strict JSON matching fields: response_text, intent, vocabulary_references, examples, uncertainty_notes, requires_teacher_review."
        )
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_message}
            ],
            "format": "json",
            "stream": False,
            "options": {"temperature": 0.2}
        }
        req = urllib.request.Request(
            f"{self.base_url}/api/chat",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            content = data["message"]["content"]
            return TutorResponseSchema.model_validate_json(content)


class LLMRouter:
    def __init__(self):
        self.gemini = GeminiProvider()
        self.groq = GroqProvider()
        self.ollama = OllamaProvider()

    def generate_response(
        self,
        system_prompt: str,
        user_message: str,
        context_data: Dict[str, Any]
    ) -> Tuple[TutorResponseSchema, str]:
        """
        Attempts Gemini primary provider first.
        Falls back to Groq if Gemini fails or is rate-limited.
        Falls back to local Ollama if Groq fails.
        """
        # Try Primary: Gemini
        try:
            res = self.gemini.generate_grounded_response(system_prompt, user_message, context_data)
            return res, "gemini"
        except Exception as e:
            logger.warning("Gemini provider failed, routing to Groq secondary fallback", error=str(e))

        # Try Secondary: Groq
        try:
            res = self.groq.generate_grounded_response(system_prompt, user_message, context_data)
            return res, "groq"
        except Exception as e:
            logger.warning("Groq provider failed, routing to local Ollama fallback", error=str(e))

        # Try Tertiary: Local Ollama
        try:
            res = self.ollama.generate_grounded_response(system_prompt, user_message, context_data)
            return res, "ollama"
        except Exception as e:
            logger.error("All AI providers (Gemini, Groq, Ollama) failed", error=str(e))
            # Safe grounded fallback without hallucinating
            return TutorResponseSchema(
                response_text="The AI tutor is temporarily operating in offline mode. Please review the canonical dictionary meanings directly below.",
                intent="offline_fallback",
                vocabulary_references=[],
                uncertainty_notes="AI providers temporarily unreachable."
            ), "offline_fallback"

