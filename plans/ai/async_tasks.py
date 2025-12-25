import threading
from django.db import close_old_connections
from catalog.models import VisualResource
from plans.ai.deepseek import DeepSeekService
from plans.models import Workout, Diet, Week
from plans.workout_plan import (
    build_fallback_plan,
    parse_ai_workout,
    resolve_named_plan,
    save_workout_from_plan,
)


def _fallback_diet(context):
    """Generate a simple deterministic diet when the AI call fails."""
    weight = float(context.get("weight") or 70)
    protein = int(weight * 1.6)
    objective = (context.get("objective") or "").lower()
    notes = context.get("diet_notes") or ""
    calories = context.get("diet_calories")

    focus = "balance"  # default
    if "volumen" in objective or "ganar" in objective:
        focus = "calorico moderado"
    elif "def" in objective or "baja" in objective or "perder" in objective:
        focus = "deficit ligero"

    days = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"]
    header = [
        f"Plan semanal ({focus}). Peso: {weight} kg, Proteina diaria: {protein} g aprox.",
        f"Calorias objetivo: {calories} kcal/dia" if calories else "",
        f"Notas del coach/alergias: {notes}" if notes else "",
        "Hidratacion: 2-3 L agua dia. Ajusta por actividad.",
    ]

    blocks = []
    for day in days:
        blocks.append(
            "\n".join(
                [
                    f"{day}:",
                    "- Desayuno: Avena + fruta + proteina en polvo + nueces.",
                    "- Comida: Pollo/pavo o pescado + arroz/quinoa + verduras.",
                    "- Cena: Huevos/claras + vegetales salteados + tortilla integral.",
                    "- Snack: Yogur griego + fruta o frutos secos.",
                ]
            )
        )

    return "\n\n".join([line for line in header if line] + blocks)


def generate_diet_async(week_id, context):
    def task():
        try:
            close_old_connections()
            if Diet.objects.filter(week_id=week_id).exists():
                Week.objects.filter(id=week_id).update(
                    diet_status=Week.STATUS_READY
                )
                return

            try:
                content = DeepSeekService.generate_diet(context)
            except Exception as ai_error:
                print(">>> DIET AI ERROR, using fallback:", repr(ai_error))
                content = _fallback_diet(context)
            if not content or not content.strip():
                raise RuntimeError("Diet generation returned empty content")
            if not Diet.objects.filter(week_id=week_id).exists():
                Diet.objects.create(week_id=week_id, content=content)

            Week.objects.filter(id=week_id).update(
                diet_status=Week.STATUS_READY
            )
            print(">>> DIET SAVED OK")
        except Exception as e:
            Week.objects.filter(id=week_id).update(
                diet_status=Week.STATUS_ERROR
            )
            print(">>> DIET THREAD ERROR:", repr(e))
        finally:
            try:
                close_old_connections()
            except Exception as e:
                print(">>> DIET THREAD CLOSE ERROR:", repr(e))

    threading.Thread(target=task, daemon=True).start()

def generate_workout_async(week_id, context):
    def task():
        try:
            close_old_connections()
            week = Week.objects.filter(id=week_id).first()
            if not week:
                print(">>> WORKOUT THREAD ERROR: Week not found")
                Week.objects.filter(id=week_id).update(
                    workout_status=Week.STATUS_ERROR
                )
                return

            if Workout.objects.filter(week_id=week_id).exists():
                Week.objects.filter(id=week_id).update(
                    workout_status=Week.STATUS_READY
                )
                return

            exercises = list(VisualResource.objects.all())
            if not exercises:
                raise RuntimeError("No hay ejercicios en el catalogo")

            try:
                raw_plan = DeepSeekService.generate_workout(context, exercises)
                parsed_plan = parse_ai_workout(raw_plan)
                resolved_plan, missing = resolve_named_plan(
                    parsed_plan,
                    exercises,
                    ignore_missing=True,
                )
                if missing:
                    print(">>> WORKOUT AI skipped exercises not in catalog:", missing)
                if not resolved_plan:
                    raise RuntimeError("DeepSeek sin ejercicios validos")
            except Exception as ai_error:
                print(">>> WORKOUT AI ERROR, using fallback:", repr(ai_error))
                resolved_plan = build_fallback_plan(
                    exercises,
                    level=context.get("level") if isinstance(context, dict) else None,
                    days_count=(context or {}).get("days_per_week") if isinstance(context, dict) else None,
                    focus_muscle=(context or {}).get("focus_muscle") if isinstance(context, dict) else None,
                )

            if not resolved_plan:
                raise RuntimeError("No hay ejercicios para guardar")

            save_workout_from_plan(week, resolved_plan)

            Week.objects.filter(id=week_id).update(
                workout_status=Week.STATUS_READY
            )
            print(">>> WORKOUT SAVED OK")
        except Exception as e:
            Week.objects.filter(id=week_id).update(
                workout_status=Week.STATUS_ERROR
            )
            print(">>> WORKOUT THREAD ERROR:", repr(e))
        finally:
            try:
                close_old_connections()
            except Exception as e:
                print(">>> WORKOUT THREAD CLOSE ERROR:", repr(e))

    threading.Thread(target=task, daemon=True).start()

