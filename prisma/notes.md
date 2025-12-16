# Considerations after `prisma db pull`

In some cases Prisma can't automatically reflect complex SQL relations to the `schema.prisma`.

After running `npx prisma db pull`, make sure to revert any unwanted changes by following the below manual adjustments to the schema, preserving idempotency.

Usually, a revert of the changes after pulling (while preserving any required changes being worked on) will be enough, unless any of the mentioned issues are being worked. In that
case, considerations listed here should be updated.

## 1. token_address relations (v1.2.3)

**Problem:** Prisma cannot automatically infer two foreign keys that point to the same `contract` field but to different tables (`address` and `contract`).

**Location:** `model token_address`

**Required change:**

1. **In `model token_address`:** Manually add the relation with `contract`:
```prisma
// Relation with address (already exists, keep):
contract_token_address_contractTocontract address @relation("token_address_contractTocontract", fields: [contract], references: [address], onDelete: Cascade, onUpdate: NoAction, map: "fk_token_address_contract")

// Relation with contract (add manually/revert any change made):
contract_details contract? @relation("token_address_contractDetailsTocontract", fields: [contract], references: [address], onDelete: Cascade, onUpdate: NoAction, map: "fk_token_address_contract_details")
```

2. **In `model contract`:** Add the inverse relation/revert any change made:
```prisma
token_address_contract_details token_address[] @relation("token_address_contractDetailsTocontract")
```

**Reason:** The SQL has two valid foreign keys:
- `fk_token_address_contract` → `address(address)`
- `fk_token_address_contract_details` → `contract(address)`

Both point to the same `contract` field, but Prisma can only infer one automatically.

**Important note:** Renaming the foreign keys in the SQL would not solve the problem. The issue is not the FK names, but that both use the same `contract` field as foreign key. Prisma infers relations based on the field used, not just the FK name. For Prisma to automatically infer both, they would need different fields (which is not recommended as it would duplicate data).

## Notes

- These changes are necessary because Prisma has limitations when inferring complex relations from SQL.
- These adjustments must be applied after each `db pull` to maintain schema idempotency.
