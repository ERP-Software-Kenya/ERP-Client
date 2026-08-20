# Unify on Stores (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Store the only place model: enhance Stores API (type, image, real create/update), remape inventory/stock/unpublished from `locationId` → `storeId`, and cut ERP-Client over to Stores while hiding Locations.

**Architecture:** Mirror the existing Locations create/image patterns onto Stores, then rename FKs in the inventory cluster (entity → domain → DTOs → repos → FE types/pages). Leave Locations module mounted but unused by the client.

**Tech Stack:** NestJS + CQRS + TypeORM (core-apis), React + TanStack Query (ERP-Client), existing S3/Backblaze image storage pattern from Locations.

## Global Constraints

- Spec: `ERP-Client/docs/superpowers/specs/2026-07-30-unify-stores-design.md`
- Single place model = **Store**; do not invent a Store↔Location sync bridge
- Keep `binLocation` field name (shelf/bin), only rename place FK to `storeId`
- Do **not** delete Locations module/tables in Phase 1
- Do **not** commit unless the user explicitly asks
- Prefer smallest diffs; follow Locations patterns for auth/org scoping on Stores
- Migration must **fail loudly** if inventory/stock rows still reference locations with no deterministic map (empty tables = OK)

---

## File map

| Path | Responsibility |
|------|----------------|
| `core-apis/.../entities/store.entity.ts` | Add `EStoreType`, `type`, `imageKey` |
| `core-apis/.../migrations/1800000000004-unify-stores.ts` | Columns + inventory FK cutover SQL |
| `core-apis/.../modules/stores/**` | Full create/update, image cmds, guards |
| `core-apis/.../modules/inventory/**` | `locationId` → `storeId` |
| `core-apis/.../modules/stock-movements/**` | `locationId` → `storeId` |
| `core-apis/.../modules/unpublished-stock/**` | `locationId` → `storeId` |
| `core-apis/.../persistence/repositories/*` | Matching repo renames |
| `ERP-Client/renderer/src/types.ts` | Store + inventory types |
| `ERP-Client/renderer/src/api.ts` | Store image hooks; drop Locations usage from inventory |
| `ERP-Client/renderer/src/pages/Stores.tsx` | Type + image UX |
| Inventory-cluster pages + `modules.ts` + `App.tsx` | Pickers + hide Locations |

---

### Task 1: Store entity — type + imageKey

**Files:**
- Modify: `core-apis/src/infrastructure/persistence/entities/store.entity.ts`
- Modify: `core-apis/src/infrastructure/persistence/entities/index.ts` (export enum if needed)

**Interfaces:**
- Produces: `EStoreType { Store = 'store', Warehouse = 'warehouse' }`; `StoreEntity.type`; `StoreEntity.imageKey?: string`

- [ ] **Step 1: Add enum + columns to StoreEntity**

Add next to existing imports/fields (mirror LocationEntity):

```ts
export enum EStoreType {
  Store     = 'store',
  Warehouse = 'warehouse',
}

// on StoreEntity:
@AutoMap(() => String)
@Column({ type: 'enum', enum: EStoreType, default: EStoreType.Store })
public type: EStoreType;

@AutoMap()
@Column({ name: 'image_key', type: 'varchar', length: 500, nullable: true })
public imageKey?: string;
```

- [ ] **Step 2: Confirm entity still exports from entities index**

- [ ] **Step 3: Typecheck entity compiles**

Run: `cd /home/hitarth/ERP/core-apis && npx tsc -p tsconfig.build.json --noEmit` (or project’s usual check). Fix only errors from this change.

---

### Task 2: Migration — store columns + inventory FK cutover

**Files:**
- Create: `core-apis/src/infrastructure/persistence/migrations/1800000000004-unify-stores.ts`
- Modify: `core-apis/src/infrastructure/persistence/migrations/index.ts` (register migration)

**Interfaces:**
- Consumes: Task 1 column names
- Produces: DB with `stores.type`, `stores.image_key`; inventory/stock/unpublished use `store_id`

- [ ] **Step 1: Write migration `up` with safety gate**

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnifyStores1800000000004 implements MigrationInterface {
  name = 'UnifyStores1800000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Store columns
    await queryRunner.query(`
      CREATE TYPE "core"."stores_type_enum" AS ENUM('store', 'warehouse')
    `);
    await queryRunner.query(`
      ALTER TABLE "core"."stores"
        ADD COLUMN IF NOT EXISTS "type" "core"."stores_type_enum" NOT NULL DEFAULT 'store',
        ADD COLUMN IF NOT EXISTS "image_key" character varying(500)
    `);

    // 2) Fail if any location-linked inventory/stock data exists (no silent remap)
    const counts = await queryRunner.query(`
      SELECT
        (SELECT COUNT(*)::int FROM "core"."inventory") AS inv,
        (SELECT COUNT(*)::int FROM "core"."stock_movements") AS sm,
        (SELECT COUNT(*)::int FROM "core"."unpublished_stock") AS us
    `);
    const { inv, sm, us } = counts[0];
    if (Number(inv) > 0 || Number(sm) > 0 || Number(us) > 0) {
      throw new Error(
        `UnifyStores migration refused: inventory=${inv} stock_movements=${sm} unpublished_stock=${us}. ` +
        `Empty these tables or provide an explicit location→store map before re-running.`,
      );
    }

    // 3) Inventory: drop location FK/unique, add store_id
    // (Adjust constraint names to match DB — inspect with \\d core.inventory before editing)
    await queryRunner.query(`ALTER TABLE "core"."inventory" DROP CONSTRAINT IF EXISTS "FK__inventory__locations"`);
    await queryRunner.query(`ALTER TABLE "core"."inventory" DROP CONSTRAINT IF EXISTS "UQ__inventory__org_location_product"`);
    await queryRunner.query(`ALTER TABLE "core"."inventory" DROP COLUMN IF EXISTS "location_id"`);
    await queryRunner.query(`ALTER TABLE "core"."inventory" ADD COLUMN "store_id" uuid NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "core"."inventory"
        ADD CONSTRAINT "UQ__inventory__org_store_product" UNIQUE ("organization_id", "store_id", "product_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "core"."inventory"
        ADD CONSTRAINT "FK__inventory__stores"
        FOREIGN KEY ("store_id") REFERENCES "core"."stores"("id")
    `);

    // 4) stock_movements + unpublished_stock (+ movements): same pattern
    // DROP location_id FKs/columns, ADD store_id + FK to stores
    // (Write exact SQL after \\d each table — do not invent constraint names)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Irreversible: UnifyStores1800000000004');
  }
}
```

**Important:** Before finalizing SQL, run `\d core.inventory`, `\d core.stock_movements`, `\d core.unpublished_stock`, `\d core.unpublished_stock_movements` (or TypeORM entity JoinColumn names) and paste real constraint names into the migration. Empty-table path must succeed; non-empty must throw.

- [ ] **Step 2: Register migration in `migrations/index.ts`**

- [ ] **Step 3: Apply on empty/dev DB and confirm**

Run the project’s usual migration command. Expected: success when inventory cluster tables are empty.

---

### Task 3: Stores application layer — real create/update + type

**Files:**
- Modify: `core-apis/src/application/modules/stores/domain/store.model.ts`
- Modify: `core-apis/src/application/modules/stores/models/requests/create-store.request.ts`
- Modify: `core-apis/src/application/modules/stores/models/requests/update-store.request.ts`
- Modify: `core-apis/src/application/modules/stores/models/responses/store.response.ts`
- Modify: `core-apis/src/application/modules/stores/commands/create-store/create-store.command.ts`
- Modify: `core-apis/src/application/modules/stores/commands/create-store/create-store.command-handler.ts`
- Modify: `core-apis/src/application/modules/stores/commands/update-store/update-store.command.ts`
- Modify: `core-apis/src/application/modules/stores/commands/update-store/update-store.command-handler.ts`
- Modify: `core-apis/src/application/modules/stores/mapper/store.profile.ts`
- Modify: `core-apis/src/application/modules/stores/stores.controller.ts`

**Interfaces:**
- Produces create body: `{ name, type, address?, city?, country?, phone?, email?, code? }` + `organizationId` from JWT
- Produces response fields matching entity (camelCase): `id`, `organizationId`, `name`, `type`, `imageKey?`, address fields, `isActive`, timestamps

- [ ] **Step 1: Expand Store domain model** to include at least:

```ts
@AutoMap() public id: string;
@AutoMap() public organizationId: string;
@AutoMap() public name: string;
@AutoMap(() => String) public type: EStoreType;
@AutoMap() public imageKey?: string;
@AutoMap() public code?: string;
@AutoMap() public address?: string;
@AutoMap() public city?: string;
@AutoMap() public country?: string;
@AutoMap() public phone?: string;
@AutoMap() public email?: string;
@AutoMap() public isActive: boolean;
@AutoMap(() => Date) public createdAt: Date;
@AutoMap(() => Date) public updatedAt?: Date;
```

- [ ] **Step 2: Expand CreateStoreRequest** like CreateLocationRequest + email/code:

```ts
@ApiProperty() @IsNotEmpty() @IsString() @AutoMap() public name: string;
@ApiProperty({ enum: EStoreType }) @IsEnum(EStoreType) @AutoMap(() => String) public type: EStoreType;
// optional: code, address, city, country, phone, email
```

- [ ] **Step 3: Create handler persists full object**

```ts
return this.repo.createAsync({
  organizationId: command.organizationId,
  name: command.name,
  type: command.type,
  code: command.code,
  address: command.address,
  city: command.city,
  country: command.country,
  phone: command.phone,
  email: command.email,
  isActive: true,
} as Store);
```

- [ ] **Step 4: Controller create uses CurrentUser + ClerkAuthGuard + RolesGuard**

Mirror LocationsController:
- Class-level `@UseGuards(ClerkAuthGuard, RolesGuard)`
- `command.organizationId = user.organizationId` (do **not** trust body `organizationId` / `organization_id`)
- Role decorators matching Locations (managers create/update; staff read)

- [ ] **Step 5: Update Automapper profiles** so Request → Command → Domain → Entity → Response all map new fields

- [ ] **Step 6: Manual smoke** — `POST /api/v1/stores` with `{ "name": "WH1", "type": "warehouse" }` returns `storeId` and `type`.

---

### Task 4: Store image upload/remove

**Files:**
- Create: `core-apis/src/application/modules/stores/storage/store-image.storage.ts` (copy Locations storage; change key prefix to `stores/`)
- Create: `.../commands/upload-store-image/*`
- Create: `.../commands/remove-store-image/*`
- Modify: `stores.controller.ts` — add `POST :id/image`, `DELETE :id/image`
- Modify: `stores.module.ts` — register handlers + storage provider (copy LocationsModule wiring)

**Interfaces:**
- `POST /api/v1/stores/:id/image` multipart `file` → `StoreResponse`
- `DELETE /api/v1/stores/:id/image` → `StoreResponse` or boolean (match Locations)

- [ ] **Step 1: Copy LocationImageStorage → StoreImageStorage** with object key `stores/${storeId}/image/${Date.now()}`

- [ ] **Step 2: Upload/Remove command handlers** — same flow as Locations (replace key, update repo)

- [ ] **Step 3: Controller endpoints** with `FileInterceptor('file')`, roles like Locations

- [ ] **Step 4: Smoke upload** against a store id

---

### Task 5: Inventory cluster BE — rename to storeId

**Files (rename `locationId` → `storeId` everywhere in these trees):**
- `core-apis/src/infrastructure/persistence/entities/inventory.entity.ts`
- `.../stock-movement.entity.ts`
- `.../unpublished-stock.entity.ts`
- `.../unpublished-stock-movement.entity.ts`
- `core-apis/src/application/modules/inventory/**`
- `core-apis/src/application/modules/stock-movements/**`
- `core-apis/src/application/modules/unpublished-stock/**`
- Matching files under `core-apis/src/infrastructure/persistence/repositories/`
- `core-apis/src/application/modules/inventory/i-inventory.repo.ts` — rename method:

```ts
findByOrgStoreProductAsync(
  organizationId: string,
  storeId: string,
  productId: string,
  manager: EntityManager,
): Promise<Inventory | null>;
```

**Interfaces:**
- All public DTOs/responses use `storeId: string`
- Relations: `@ManyToOne(() => StoreEntity)` on inventory/stock/unpublished

- [ ] **Step 1: Update entities** — column `store_id`, unique `UQ__inventory__org_store_product`, FK to stores; remove Location relations from these entities

- [ ] **Step 2: Bulk rename in application modules** — domain, commands, queries, filters, requests, responses, mappers, handlers

- [ ] **Step 3: Update repo implementations** — SQL/filters use `storeId`; rename `findByOrgLocationProductAsync` call sites (grep)

- [ ] **Step 4: Grep gate**

```bash
rg "locationId" core-apis/src/application/modules/inventory \
  core-apis/src/application/modules/stock-movements \
  core-apis/src/application/modules/unpublished-stock \
  core-apis/src/infrastructure/persistence/entities/inventory.entity.ts \
  core-apis/src/infrastructure/persistence/entities/stock-movement.entity.ts \
  core-apis/src/infrastructure/persistence/entities/unpublished-stock.entity.ts \
  core-apis/src/infrastructure/persistence/entities/unpublished-stock-movement.entity.ts
```

Expected: no matches (except comments if any — prefer zero).

- [ ] **Step 5: Compile core-apis**

---

### Task 6: Stock transfer handler review

**Files:**
- Read/fix: `core-apis/src/application/modules/stock-transfers/commands/complete-stock-transfer/complete-stock-transfer.command-handler.ts`
- Any helpers that load inventory by location

- [ ] **Step 1: Search transfer module for `locationId` / `Location`**

```bash
rg "locationId|Location" core-apis/src/application/modules/stock-transfers
```

- [ ] **Step 2: If complete uses inventory IDs only** — no code change; document in PR notes  
- [ ] **Step 3: If any location lookup remains** — switch to store/inventory ids from Task 5 APIs

---

### Task 7: ERP-Client types + API hooks

**Files:**
- Modify: `ERP-Client/renderer/src/types.ts`
- Modify: `ERP-Client/renderer/src/api.ts`

**Interfaces:**
- `Store` includes `organizationId`, `type: 'store' | 'warehouse'`, `imageKey?`, camelCase address fields (align with StoreResponse)
- `InventoryItem.storeId` (replace `locationId`); same for StockMovement, UnpublishedStock, etc.
- `useUploadStoreImage` / `useRemoveStoreImage` hitting `/api/v1/stores/:id/image`

- [ ] **Step 1: Update Store interface** — prefer camelCase matching BE response; migrate Stores page off `organization_id` snake_case

- [ ] **Step 2: Replace `locationId` with `storeId`** on inventory-related interfaces in `types.ts`

- [ ] **Step 3: Add store image hooks** (copy location hooks, change paths). Keep location hooks until Task 9 removes last Locations page usage (or delete when unused).

---

### Task 8: Stores page UI

**Files:**
- Modify: `ERP-Client/renderer/src/pages/Stores.tsx`

- [ ] **Step 1: Add `type` select** (`store` | `warehouse`), required on create
- [ ] **Step 2: Port image upload/remove UX** from `Locations.tsx` using store image hooks
- [ ] **Step 3: Create payload** uses JWT-scoped org on server — **do not** send fake `organization_id`; send fields CreateStoreRequest accepts
- [ ] **Step 4: Table column for type**
- [ ] **Step 5: Manual UI create warehouse store**

---

### Task 9: Inventory cluster FE cutover + hide Locations

**Files:**
- Modify: `Inventory.tsx`, `InventoryDetail.tsx`, `StockMovements.tsx`, `UnpublishedStock.tsx`, `ProductLogs.tsx`, `ItemReturns.tsx` (restock), `dashboards/InventoryDashboard.tsx`
- Modify: `ERP-Client/renderer/src/config/modules.ts` — remove Locations nav item
- Modify: `ERP-Client/renderer/src/App.tsx` — remove `/locations` route; add redirect `/locations` → `/stores`
- Optional: leave `Locations.tsx` file unreferenced (delete only if user wants cleanup)

- [ ] **Step 1: Replace `Locations.useList/useGet` with `Stores.*`**
- [ ] **Step 2: Form state + POST bodies use `storeId`**
- [ ] **Step 3: Labels** show store name / type
- [ ] **Step 4: Remove Locations from sidebar + routes; redirect**
- [ ] **Step 5: Grep FE**

```bash
rg "Locations\.|locationId|/api/v1/locations" ERP-Client/renderer/src --glob '!**/Locations.tsx'
```

Expected: no inventory-path hits (Locations.tsx may remain orphaned).

---

### Task 10: End-to-end verification

- [ ] **Step 1: Create store** `type=warehouse` (+ image optional)
- [ ] **Step 2: Create inventory** for product @ that store
- [ ] **Step 3: Stock add** via movements UI
- [ ] **Step 4: Unpublished add + publish**
- [ ] **Step 5: Stock transfer** create + complete between two stores
- [ ] **Step 6: Confirm sidebar has Stores, no Locations**
- [ ] **Step 7: Update design companion notes** in `2026-07-30-full-endpoint-audit.md` only if inventory paths documented with `locationId` (optional doc fix)

**Success = all six criteria in the design spec.**

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Store.type store\|warehouse | 1, 3, 8 |
| Store image upload | 4, 8 |
| Inventory/stock/unpublished → storeId | 2, 5 |
| Migration fail if data without map | 2 |
| Locations module kept | (no delete task) |
| Stock transfers verified | 6, 10 |
| Hide Locations nav; FE pickers Stores | 9 |
| Success criteria 1–6 | 10 |

## Plan self-review

- No TBD placeholders left in task steps
- CreateStore today only persisted `name` — Task 3 explicitly fixes parity (required for “same working”)
- Migration SQL constraint names must be verified against live DB in Task 2 (called out, not guessed)
- FE snake_case `organization_id` on Store form is corrected in Tasks 7–8
