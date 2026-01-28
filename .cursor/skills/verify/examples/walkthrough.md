# VAL-042 - Walkthrough: Add Input Validation to API Endpoints

## Summary

Implemented consistent input validation across REST API endpoints using Pydantic models and a `@validate` decorator.

## Changes Made

### New Files

| File | Purpose |
|------|---------|
| `src/api/validation.py` | Validation decorator and error handling |
| `src/api/models/user.py` | Pydantic models for user endpoints |
| `src/api/models/product.py` | Pydantic models for product endpoints |
| `tests/api/test_validation.py` | Tests for validation decorator |

### Modified Files

| File | Changes |
|------|---------|
| `src/api/endpoints/users.py` | Added @validate decorator, removed manual validation |
| `src/api/endpoints/products.py` | Added @validate decorator |
| `src/api/error_handlers.py` | Added ValidationError handler |

## Test Results

```
$ pytest tests/ -v --cov=src/api --cov-report=term-missing

tests/api/test_validation.py::TestValidateDecorator::test_valid_input_passes_through PASSED
tests/api/test_validation.py::TestValidateDecorator::test_missing_required_field_raises PASSED
tests/api/test_validation.py::TestValidateDecorator::test_wrong_type_raises PASSED
tests/api/test_validation.py::TestValidateDecorator::test_extra_fields_ignored PASSED
tests/api/endpoints/test_users.py::test_create_user_valid PASSED
tests/api/endpoints/test_users.py::test_create_user_missing_email PASSED
tests/api/endpoints/test_users.py::test_create_user_invalid_email PASSED
tests/api/endpoints/test_products.py::test_create_product_valid PASSED
tests/api/endpoints/test_products.py::test_create_product_negative_price PASSED

---------- coverage: ----------
Name                            Stmts   Miss  Cover
---------------------------------------------------
src/api/validation.py              25      0   100%
src/api/models/user.py             18      0   100%
src/api/models/product.py          15      0   100%
src/api/endpoints/users.py         45      2    96%
src/api/endpoints/products.py      38      1    97%
src/api/error_handlers.py          22      0   100%
---------------------------------------------------
TOTAL                             163      3    98%

9 passed in 0.42s
```

## Validation Example

**Request with invalid input:**
```bash
curl -X POST http://localhost:8000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "not-an-email"}'
```

**Response (400 Bad Request):**
```json
{
  "errors": [
    {
      "field": "email",
      "message": "value is not a valid email address"
    }
  ]
}
```

## Acceptance Criteria Status

- [x] All user inputs validated before processing
- [x] Invalid inputs return 400 with JSON error body
- [x] Test coverage ≥ 90% (achieved 98%)
- [x] No breaking changes to valid requests
- [x] All existing tests still pass

## Notes

- Used Pydantic v2 syntax throughout
- Error messages follow the format agreed in RES-042
- Decorator pattern allows easy addition of validation to new endpoints


<!-- To prevent automatic updates, add '<!-- dev-ops-customized -->' to this file -->
