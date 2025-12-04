from typing import Optional


def prompt_user(question: str, default: Optional[str] = None) -> str:
    """Prompts the user for input."""
    if default:
        prompt = f"{question} [{default}]: "
    else:
        prompt = f"{question}: "

    response = input(prompt).strip()
    return response if response else (default or "")
