# Terraform

## Intended layout

- `modules/`
- `environments/dev/`
- `environments/staging/`
- `environments/prod/`

## Rules

- Keep modules small and reusable
- Separate environment state
- Use remote state with locking
- Review plans before apply

