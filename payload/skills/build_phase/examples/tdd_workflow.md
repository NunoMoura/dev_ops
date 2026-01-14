# TDD Workflow Example

This example demonstrates the TDD workflow for adding a validation decorator.

## 1. Test First

Write the test before any implementation:

```python
# tests/api/test_validation.py

import pytest
from pydantic import BaseModel
from src.api.validation import validate

class SampleInput(BaseModel):
    name: str
    age: int

@validate(SampleInput)
def sample_handler(data: SampleInput):
    return {"name": data.name, "age": data.age}

class TestValidateDecorator:
    """Test the @validate decorator."""

    def test_valid_input_passes_through(self):
        """Valid input should be parsed and passed to handler."""
        result = sample_handler({"name": "Alice", "age": 30})
        assert result == {"name": "Alice", "age": 30}

    def test_missing_required_field_raises(self):
        """Missing required field should raise ValidationError."""
        with pytest.raises(ValidationError) as exc:
            sample_handler({"name": "Alice"})  # missing age
        assert "age" in str(exc.value)

    def test_wrong_type_raises(self):
        """Wrong type should raise ValidationError."""
        with pytest.raises(ValidationError):
            sample_handler({"name": "Alice", "age": "not a number"})

    def test_extra_fields_ignored(self):
        """Extra fields should be ignored by default."""
        result = sample_handler({"name": "Bob", "age": 25, "extra": "ignored"})
        assert result == {"name": "Bob", "age": 25}
```

Run the test - it should fail:

```bash
$ pytest tests/api/test_validation.py -v
FAILED - ModuleNotFoundError: No module named 'src.api.validation'
```

## 2. Code

Implement just enough to make tests pass:

```python
# src/api/validation.py

from functools import wraps
from typing import Type
from pydantic import BaseModel, ValidationError as PydanticValidationError

class ValidationError(Exception):
    """Raised when input validation fails."""
    def __init__(self, errors: list[dict]):
        self.errors = errors
        super().__init__(str(errors))

def validate(model: Type[BaseModel]):
    """Decorator to validate input against a Pydantic model."""
    def decorator(func):
        @wraps(func)
        def wrapper(data: dict, *args, **kwargs):
            try:
                validated = model(**data)
                return func(validated, *args, **kwargs)
            except PydanticValidationError as e:
                errors = [
                    {"field": err["loc"][0], "message": err["msg"]}
                    for err in e.errors()
                ]
                raise ValidationError(errors)
        return wrapper
    return decorator
```

Run the test - it should pass:

```bash
$ pytest tests/api/test_validation.py -v
PASSED test_valid_input_passes_through
PASSED test_missing_required_field_raises
PASSED test_wrong_type_raises
PASSED test_extra_fields_ignored
```

## 3. Refactor

Now that tests pass, improve the code:

```python
# src/api/validation.py (refactored)

from functools import wraps
from typing import Type, TypeVar, Callable
from pydantic import BaseModel, ValidationError as PydanticValidationError

T = TypeVar("T", bound=BaseModel)

class ValidationError(Exception):
    """Raised when input validation fails."""
    def __init__(self, errors: list[dict]):
        self.errors = errors
        super().__init__(self._format_message())

    def _format_message(self) -> str:
        """Format errors into readable message."""
        return "; ".join(
            f"{e['field']}: {e['message']}" for e in self.errors
        )

def validate(model: Type[T]) -> Callable:
    """
    Decorator to validate input against a Pydantic model.

    Usage:
        @validate(CreateUserRequest)
        def create_user(data: CreateUserRequest):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(data: dict, *args, **kwargs):
            validated = _validate_input(data, model)
            return func(validated, *args, **kwargs)
        return wrapper
    return decorator

def _validate_input(data: dict, model: Type[T]) -> T:
    """Validate data against model, raising ValidationError on failure."""
    try:
        return model(**data)
    except PydanticValidationError as e:
        raise ValidationError(_parse_pydantic_errors(e))

def _parse_pydantic_errors(error: PydanticValidationError) -> list[dict]:
    """Convert Pydantic errors to our error format."""
    return [
        {"field": str(err["loc"][0]), "message": err["msg"]}
        for err in error.errors()
    ]
```

Run tests again - still passing:

```bash
$ pytest tests/api/test_validation.py -v
4 passed in 0.15s
```

## 4. Commit

```bash
git add src/api/validation.py tests/api/test_validation.py
git commit -m "feat(api): add input validation decorator

- Add @validate decorator for Pydantic model validation
- Add ValidationError with structured error format
- Add comprehensive tests for decorator

Task: TASK-042"
```

## Key Principles

1. **Red**: Write a failing test first
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve while tests pass
4. **Commit**: Small, atomic commits
