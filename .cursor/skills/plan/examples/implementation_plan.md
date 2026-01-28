# PLN-042 - Add Input Validation to API Endpoints

## Goal

Implement consistent input validation across all REST API endpoints using Pydantic models, ensuring invalid requests fail fast with clear error messages.

## Checklist

Work through these items sequentially:

- [ ] **[code]** Create base validation module
  - Files: `src/api/validation.py`
  - Add `@validate` decorator
  - Add Pydantic base model with common fields

- [ ] **[test]** Add tests for validation decorator
  - Files: `tests/api/test_validation.py`
  - Test valid input passes through
  - Test invalid input raises ValidationError
  - Test error message format

- [ ] **[code]** Create Pydantic models for user endpoints
  - Files: `src/api/models/user.py`
  - CreateUserRequest, UpdateUserRequest models
  - Email, password field validators

- [ ] **[test]** Add validation tests for user endpoints
  - Files: `tests/api/endpoints/test_users.py`
  - Test missing required fields
  - Test invalid email format
  - Test password requirements

- [ ] **[code]** Apply validation to user endpoints
  - Files: `src/api/endpoints/users.py`
  - Add @validate decorator to create/update handlers
  - Remove manual validation code

- [ ] **[code]** Create Pydantic models for product endpoints
  - Files: `src/api/models/product.py`
  - CreateProductRequest, UpdateProductRequest models

- [ ] **[test]** Add validation tests for product endpoints
  - Files: `tests/api/endpoints/test_products.py`

- [ ] **[code]** Apply validation to product endpoints
  - Files: `src/api/endpoints/products.py`

- [ ] **[code]** Update error handler for Pydantic errors
  - Files: `src/api/error_handlers.py`
  - Format ValidationError as JSON response
  - Include field names and error messages

## Acceptance Criteria

- [ ] All user inputs validated before processing
- [ ] Invalid inputs return 400 with JSON error body:
  ```json
  {"errors": [{"field": "email", "message": "Invalid email format"}]}
  ```
- [ ] Test coverage ≥ 90% for validation module
- [ ] No breaking changes to valid requests
- [ ] All existing tests still pass

## Verification

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ -v --cov=src/api --cov-report=term-missing

# Test specific validation
pytest tests/api/test_validation.py -v

# Lint
ruff check src/api/
```


<!-- To prevent automatic updates, add '<!-- dev-ops-customized -->' to this file -->
