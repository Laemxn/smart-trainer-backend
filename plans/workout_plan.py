import json
import re
import unicodedata
from typing import Any, Dict, Iterable, List, Sequence, Tuple

from django.db import transaction

from catalog.models import VisualResource
from plans.models import Workout, WorkoutDay, WorkoutExercise, Week


def _normalize_name(name: str) -> str:
    """Normalize exercise names to compare ignoring accents, spaces, and casing."""
    if not name:
        return ""
    normalized = unicodedata.normalize("NFKD", str(name))
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    collapsed = re.sub(r"[^a-z0-9]+", "", ascii_only.lower())
    return collapsed


def _safe_int(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, int):
        return value
    match = re.search(r"\d+", str(value))
    if match:
        try:
            return int(match.group(0))
        except ValueError:
            return None
    return None


def _extract_json_payload(raw_text: str) -> str:
    if not raw_text:
        return ""

    fenced = re.search(r"```json(.*?)```", raw_text, re.DOTALL | re.IGNORECASE)
    if fenced:
        return fenced.group(1)

    braces = re.search(r"\{[\s\S]*\}", raw_text)
    if braces:
        return braces.group(0)

    brackets = re.search(r"\[[\s\S]*\]", raw_text)
    if brackets:
        return brackets.group(0)

    return raw_text.strip()


def parse_ai_workout(raw_text: str) -> List[Dict[str, Any]]:
    """
    Parse the structured workout sent by the AI.
    Expected shapes:
    - {"week": [{"day": "...", "exercises": [{"name": "...", "sets": 4, "reps": "8-10"}]}]}
    - [{"day": "...", "exercises": [...]}]
    """
    payload = _extract_json_payload(raw_text)
    if not payload:
        return []

    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        return []

    days_source: Sequence[Dict[str, Any]] = []
    if isinstance(data, dict):
        days_source = data.get("week") or data.get("days") or []
    elif isinstance(data, list):
        days_source = data

    parsed_days: List[Dict[str, Any]] = []
    for idx, raw_day in enumerate(days_source):
        if not isinstance(raw_day, dict):
            continue

        day_name = str(
            raw_day.get("day") or raw_day.get("name") or f"Dia {idx + 1}"
        ).strip()
        exercises_source = raw_day.get("exercises") or raw_day.get("items") or []
        parsed_exercises = []

        for exercise in exercises_source:
            if not isinstance(exercise, dict):
                continue

            name = str(
                exercise.get("name")
                or exercise.get("exercise")
                or exercise.get("title")
                or ""
            ).strip()
            if not name:
                continue

            parsed_exercises.append(
                {
                    "name": name,
                    "sets": _safe_int(exercise.get("sets")),
                    "reps": str(exercise.get("reps") or exercise.get("rep_range") or "").strip(),
                    "notes": str(exercise.get("notes") or exercise.get("tempo") or "").strip(),
                }
            )

        if parsed_exercises:
            parsed_days.append(
                {
                    "day": day_name,
                    "exercises": parsed_exercises,
                }
            )

    return parsed_days


def parse_text_workout(content: str) -> List[Dict[str, Any]]:
    """
    Fallback parser for legacy plain-text routines.
    Expects blocks separated by blank lines and lines like:
    Lunes:
    - Sentadilla | 4x10-12
    """
    if not content:
        return []

    blocks = re.split(r"\n\s*\n", content.strip())
    parsed_days: List[Dict[str, Any]] = []

    for idx, block in enumerate(blocks):
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if not lines:
            continue

        day_name = lines[0].rstrip(":").strip() or f"Dia {idx + 1}"
        parsed_exercises = []

        for line in lines[1:]:
            clean = line.lstrip("- ").strip()
            name_part, reps_part = (clean.split("|", 1) + [""])[:2]
            parsed_exercises.append(
                {
                    "name": name_part.strip(),
                    "reps": reps_part.strip(),
                    "notes": "",
                    "sets": None,
                }
            )

        if parsed_exercises:
            parsed_days.append(
                {
                    "day": day_name,
                    "exercises": parsed_exercises,
                }
            )

    return parsed_days


def resolve_named_plan(
    plan_days: Sequence[Dict[str, Any]],
    exercises: Iterable[VisualResource],
    ignore_missing: bool = True,
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Resolve a plan that references exercises by name.
    Returns a tuple of (resolved_plan, missing_names).
    """
    catalog = { _normalize_name(ex.title): ex for ex in exercises }
    resolved: List[Dict[str, Any]] = []
    missing: List[str] = []

    for day_idx, day in enumerate(plan_days):
        day_name = str(day.get("day") or f"Dia {day_idx + 1}").strip()
        resolved_exercises = []

        for order, item in enumerate(day.get("exercises") or []):
            exercise_name = str(item.get("name") or "").strip()
            exercise_obj = catalog.get(_normalize_name(exercise_name))
            if not exercise_obj:
                missing.append(exercise_name)
                if ignore_missing:
                    continue
                else:
                    continue

            resolved_exercises.append(
                {
                    "exercise": exercise_obj,
                    "sets": item.get("sets"),
                    "reps": str(item.get("reps") or "").strip(),
                    "notes": str(item.get("notes") or "").strip(),
                    "order": order,
                }
            )

        if resolved_exercises:
            resolved.append(
                {
                    "day": day_name,
                    "order": day_idx,
                    "exercises": resolved_exercises,
                }
            )

    return resolved, list(dict.fromkeys(missing))


def resolve_manual_plan(
    plan_days: Sequence[Dict[str, Any]],
    ignore_missing: bool = False,
) -> Tuple[List[Dict[str, Any]], List[int]]:
    """
    Resolve a plan that references exercises by ID.
    Returns (resolved_plan, missing_ids).
    """
    if not plan_days:
        return [], []

    ids = set()
    for day in plan_days:
        for item in (day.get("exercises") or []):
            try:
                ids.add(int(item.get("exercise_id")))
            except (TypeError, ValueError):
                continue

    exercises = {ex.id: ex for ex in VisualResource.objects.filter(id__in=ids)}
    missing_ids: List[int] = []
    resolved: List[Dict[str, Any]] = []

    for day_idx, day in enumerate(plan_days):
        day_name = str(day.get("day") or f"Dia {day_idx + 1}").strip()
        resolved_exercises = []

        for order, item in enumerate(day.get("exercises") or []):
            try:
                exercise_id = int(item.get("exercise_id"))
            except (TypeError, ValueError):
                exercise_id = None

            if not exercise_id:
                continue

            exercise_obj = exercises.get(exercise_id)
            if not exercise_obj:
                missing_ids.append(exercise_id)
                if ignore_missing:
                    continue
                else:
                    continue

            resolved_exercises.append(
                {
                    "exercise": exercise_obj,
                    "sets": _safe_int(item.get("sets")),
                    "reps": str(item.get("reps") or "").strip(),
                    "notes": str(item.get("notes") or "").strip(),
                    "order": order,
                }
            )

        if resolved_exercises:
            resolved.append(
                {
                    "day": day_name,
                    "order": day_idx,
                    "exercises": resolved_exercises,
                }
            )

    return resolved, list(dict.fromkeys(missing_ids))


def build_fallback_plan(
    exercises: Sequence[VisualResource],
    level: str | None = None,
    *,
    days_count: int | None = None,
    focus_muscle: str | None = None,
) -> List[Dict[str, Any]]:
    """
    Deterministic fallback using catalog exercises, rotating them across the week.
    """
    if not exercises:
        return []

    target_sets = 3
    normalized_level = (level or "").lower()
    if "inter" in normalized_level or "advance" in normalized_level:
        target_sets = 4

    day_names = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"]
    if days_count:
        try:
            days_count = max(3, min(int(days_count), len(day_names)))
        except (TypeError, ValueError):
            days_count = None
    if days_count:
        day_names = day_names[:days_count]

    focus = (focus_muscle or "").strip().lower()
    if focus:
        focused = [ex for ex in exercises if (ex.muscle_group or "").strip().lower() == focus]
        remainder = [ex for ex in exercises if (ex.muscle_group or "").strip().lower() != focus]
        ordered_exercises = focused + remainder if focused else list(exercises)
    else:
        ordered_exercises = list(exercises)
    resolved: List[Dict[str, Any]] = []
    cursor = 0

    for day_idx, day_name in enumerate(day_names):
        exercises_for_day = []
        for order in range(min(4, len(ordered_exercises))):
            exercise = ordered_exercises[cursor % len(ordered_exercises)]
            exercises_for_day.append(
                {
                    "exercise": exercise,
                    "sets": target_sets,
                    "reps": "10-12",
                    "notes": exercise.muscle_group or "",
                    "order": order,
                }
            )
            cursor += 1

        resolved.append(
            {
                "day": day_name,
                "order": day_idx,
                "exercises": exercises_for_day,
            }
        )

    return resolved


def _format_prescription(sets: int | None, reps: str) -> str:
    reps_clean = str(reps or "").strip()
    if sets and reps_clean:
        return f"{sets}x{reps_clean}"
    if reps_clean:
        return reps_clean
    if sets:
        return f"{sets}x"
    return ""


def build_workout_content(resolved_plan: Sequence[Dict[str, Any]]) -> str:
    blocks: List[str] = []

    for day in resolved_plan:
        day_name = str(day.get("day") or "").strip() or "Dia"
        lines = [f"{day_name}:"]

        for item in day.get("exercises", []):
            exercise = item.get("exercise")
            if not exercise:
                continue

            prescription = _format_prescription(item.get("sets"), item.get("reps"))
            notes = str(item.get("notes") or "").strip()

            line = f"- {exercise.title}"
            if prescription:
                line += f" | {prescription}"
            if notes:
                line += f" - {notes}"

            lines.append(line)

        blocks.append("\n".join(lines))

    return "\n\n".join(blocks).strip()


def save_workout_from_plan(
    week: Week,
    resolved_plan: Sequence[Dict[str, Any]],
) -> Workout:
    """
    Persist the structured workout plan and return the Workout instance created.
    """
    if not resolved_plan:
        raise ValueError("No hay ejercicios validos para guardar.")

    with transaction.atomic():
        Workout.objects.filter(week=week).delete()
        content = build_workout_content(resolved_plan)
        workout = Workout.objects.create(week=week, content=content)

        for day_data in resolved_plan:
            day = WorkoutDay.objects.create(
                workout=workout,
                name=day_data.get("day") or "",
                order=day_data.get("order") or 0,
            )

            for item in day_data.get("exercises", []):
                exercise_obj = item.get("exercise")
                if not exercise_obj:
                    continue

                WorkoutExercise.objects.create(
                    day=day,
                    exercise=exercise_obj,
                    sets=_safe_int(item.get("sets")),
                    reps=str(item.get("reps") or "").strip(),
                    notes=str(item.get("notes") or "").strip(),
                    order=item.get("order") or 0,
                )

    return workout
