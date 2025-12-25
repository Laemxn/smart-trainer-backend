import logging
import os
import requests

DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_TIMEOUT = 60  # seconds
logger = logging.getLogger(__name__)


class DeepSeekService:
    @staticmethod
    def _call_deepseek(
        prompt: str,
        *,
        temperature: float = 0.7,
        max_tokens: int = 800,
    ) -> str:
        api_key = os.environ.get("DEEPSEEK_API_KEY")
        if not api_key:
            raise RuntimeError("DEEPSEEK_API_KEY missing")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json; charset=utf-8",
        }

        payload = {
            "model": "deepseek-chat",
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Eres un entrenador y nutriologo profesional. "
                        "Responde de forma clara, estructurada y practica."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        # Retry up to 3 times to tolerate transient failures
        for attempt in range(3):
            try:
                response = requests.post(
                    DEEPSEEK_API_URL,
                    headers=headers,
                    json=payload,
                    timeout=DEEPSEEK_TIMEOUT,
                )
                response.raise_for_status()
                data = response.json()

                content = data["choices"][0]["message"]["content"]
                if not content or not str(content).strip():
                    raise RuntimeError("DeepSeek empty content")
                return str(content).strip()

            except requests.exceptions.Timeout as exc:
                logger.warning("DeepSeek timeout (attempt %s/3)", attempt + 1)
                if attempt == 2:
                    raise RuntimeError("DeepSeek timeout") from exc

            except requests.exceptions.HTTPError as exc:
                status = exc.response.status_code if exc.response else "unknown"
                body = exc.response.text[:500] if exc.response else ""
                logger.warning("DeepSeek HTTP error status=%s body=%s", status, body)
                if attempt == 2:
                    raise RuntimeError(f"DeepSeek HTTP error status={status}") from exc

            except requests.exceptions.RequestException as exc:
                logger.warning("DeepSeek request error: %s", exc)
                if attempt == 2:
                    raise RuntimeError("DeepSeek request error") from exc

            except Exception as exc:
                logger.warning("DeepSeek response error: %s", exc)
                if attempt == 2:
                    raise RuntimeError("DeepSeek response error") from exc

    @staticmethod
    def generate_workout(context: dict, exercises: list) -> str:
        exercise_lines = [
            f"- {ex.title} | Grupo: {ex.muscle_group or 'General'} | Nivel: {ex.level}"
            for ex in exercises[:120]
        ]
        focus_hint = context.get("focus_muscle")
        days_hint = context.get("days_per_week")
        notes_hint = context.get("ai_notes")
        prompt = (
            "Genera una rutina semanal clara y estructurada usando SOLO los ejercicios listados."
            "\nNo inventes nombres ni variantes, usa exactamente los nombres provistos."
            "\nNo devuelvas explicaciones ni notas fuera del JSON."
            "\n\nPerfil del alumno:"
            f"\n- Edad: {context.get('age')} anos"
            f"\n- Peso: {context.get('weight')} kg"
            f"\n- Estatura: {context.get('height')} cm"
            f"\n- Nivel: {context.get('level')}"
            f"\n- Objetivo: {context.get('objective')}"
            + (f"\n- Enfoque: {focus_hint}" if focus_hint else "")
            + (f"\n- Dias por semana: {days_hint}" if days_hint else "")
            + (f"\n- Notas del coach: {notes_hint}" if notes_hint else "")
            + "\n\nFormato de respuesta (JSON puro):"
            '\n{"week": ['
            '\n  {"day": "Lunes",'
            '\n   "exercises": ['
            '\n     {"name": "<nombre exacto>", "sets": 4, "reps": "10-12", "notes": "opcional"}'
            "\n   ]}"
            "\n ]}"
            "\n\nEjercicios disponibles (usa el nombre exacto):"
            "\n" + "\n".join(exercise_lines)
        )
        return DeepSeekService._call_deepseek(
            prompt,
            temperature=0.25,
            max_tokens=900,
        )

    @staticmethod
    def generate_diet(context: dict) -> str:
        restrictions = context.get("diet_notes")
        calories = context.get("diet_calories")
        prompt = (
            "Genera una dieta semanal clara y practica en texto plano.\n"
            "Devuelve SIEMPRE 7 dias (Lunes a Domingo) con 3-4 tiempos cada dia.\n"
            f"Edad: {context['age']} anos\n"
            f"Peso: {context['weight']} kg\n"
            f"Estatura: {context['height']} cm\n"
            f"Objetivo: {context['objective']}\n"
            + (f"Restricciones / preferencias: {restrictions}\n" if restrictions else "")
            + (f"Calorias objetivo por dia: {calories}\n" if calories else "")
            + "\nFormato exacto (usa estos encabezados):\n"
            "Lunes:\n- Desayuno: ...\n- Comida: ...\n- Cena: ...\n- Snack: ...\n\n"
            "Martes:\n- Desayuno: ...\n- Comida: ...\n- Cena: ...\n- Snack: ...\n\n"
            "Miercoles:\n- Desayuno: ...\n- Comida: ...\n- Cena: ...\n- Snack: ...\n\n"
            "Jueves:\n- Desayuno: ...\n- Comida: ...\n- Cena: ...\n- Snack: ...\n\n"
            "Viernes:\n- Desayuno: ...\n- Comida: ...\n- Cena: ...\n- Snack: ...\n\n"
            "Sabado:\n- Desayuno: ...\n- Comida: ...\n- Cena: ...\n- Snack: ...\n\n"
            "Domingo:\n- Desayuno: ...\n- Comida: ...\n- Cena: ...\n- Snack: ...\n"
        )
        return DeepSeekService._call_deepseek(prompt)
