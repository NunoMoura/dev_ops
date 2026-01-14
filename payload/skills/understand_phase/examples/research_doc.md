# RES-042 - Research: Add Input Validation to API Endpoints

## Scope

### In Scope

- Validate all user inputs in REST API endpoints
- Add validation for path parameters, query parameters, and request bodies
- Return appropriate 400 errors with descriptive messages

### Out of Scope

- Authentication/authorization changes
- Database schema changes
- Frontend validation (handled separately)

### Affected Components

- `src/api/endpoints/` - All endpoint handlers
- `src/api/validation.py` - New validation module
- `tests/api/` - Test coverage

## Alignment

### Technical Alignment

- [x] Reviewed relevant architecture docs
- [x] Checked codebase for drift from specs
- Issues found:
  - `docs/architecture/api.md` mentions validation but no implementation exists
  - Existing patterns inconsistent - some use manual checks, some use no validation

### Project Alignment

- [x] Reviewed `constitution.md`
- Violations: None. Constitution requires "fail fast with clear errors."

## Internal Research

### Existing Patterns

Found 3 different validation approaches in codebase:

1. **Manual if/raise** in `src/api/endpoints/users.py:45`:
   ```python
   if not request.json.get('email'):
       raise ValueError("Email required")
   ```

2. **No validation** in `src/api/endpoints/products.py` - crashes on invalid input

3. **Decorator pattern** in `src/api/endpoints/orders.py:12`:
   ```python
   @validate_json_schema(OrderSchema)
   def create_order(request):
       ...
   ```

**Recommendation**: Standardize on decorator pattern (approach #3).

### Dependencies

- `pydantic` already in requirements (v2.5.0)
- Can leverage existing `ValidationError` exception handler in `src/api/error_handlers.py`

## External Research

| Source | Summary |
|--------|---------|
| [Pydantic v2 docs](https://docs.pydantic.dev/) | Use `BaseModel` with `Field()` validators |
| [FastAPI validation](https://fastapi.tiangolo.com/tutorial/body/) | Native Pydantic integration pattern |
| [OWASP Input Validation](https://owasp.org/www-project-web-security-testing-guide/) | Always validate on server, never trust client |

## Recommendation

1. Create Pydantic models for each endpoint's input
2. Add `@validate` decorator that uses the models
3. Update error handler to format Pydantic errors as JSON
4. Add tests for valid and invalid inputs

Estimated effort: Medium (2-3 hours)
