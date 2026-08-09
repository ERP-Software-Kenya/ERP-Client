# Sales v2 — Credit Sales & Black Sales/Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a redesigned Sales screen supporting Normal, Credit, and Black sale types end-to-end, backed by real per-customer credit enforcement and a genuinely separate black stock pool, per `docs/superpowers/specs/2026-08-07-sales-v2-credit-black-design.md`.

**Architecture:** Extend the existing `BillEntity`-based checkout flow (no new `Sale` aggregate). Black inventory repurposes the existing `UnpublishedStock` module. Stock-deduction and credit-balance logic for bill completion is centralized in a new `BillCompletionService` (mirrors the existing `StockOrchestrationService` pattern in `src/application/shared/services/`) so both the normal completion path and the credit-approval path share one implementation.

**Tech Stack:** `core-apis`: NestJS + TypeORM + CQRS (`@nestjs/cqrs`, `CommandHandlerStrict`/`QueryHandlerStrict`, `CqrsMediator`). `ERP-Client`: React + TanStack Query + Radix, `renderer/src/api.ts` resource-hook pattern. No new dependencies in either repo.

## Global Constraints

- Backend: strict CQRS — `@CommandHandlerStrict`/`@QueryHandlerStrict`, DI via `@Inject(TOKEN)`, controllers call `mediator.execute`, handlers never call `mediator.execute` themselves (per `core-apis/.claude/rules/backend-rules.md`, same constraint referenced in the stock-transfer-redesign plan). Shared logic used by more than one handler goes in a shared service (`src/application/shared/services/`), not in mediator chaining.
- Do not modify `StockOrchestrationService` (`core-apis/src/application/shared/services/stock-orchestration.service.ts`) — shared by transfer/write-off/adjustment paths untouched by this plan. All new stock-completion logic lives in the new `BillCompletionService`.
- Repo DI tokens are wired centrally in `core-apis/src/infrastructure/infrastructure.module.ts` (a `@Global()` dynamic module) — new repos must be added there, not to individual feature modules.
- `core-apis` migrations are generated, not hand-written: change entity files first, then run `npm run migration:generate` (requires a running local Postgres matching `type-orm.config.ts`), then review the generated SQL before committing.
- `ERP-Client` has no automated frontend test runner (`package.json` has no `test` script) — frontend tasks in this plan end in a manual verification step, not a Jest run, matching every other plan in `docs/superpowers/plans/`.
- Money fields follow the existing convention: `decimal(18,4)` columns, plain `number` in TS domain/DTOs (no `Decimal.js`/BigNumber in this codebase — don't introduce one).

---

### Task 1: Add `OrgManager` role

**Files:**
- Modify: `core-apis/src/infrastructure/persistence/entities/role.entity.ts`
- Modify: `core-apis/src/infrastructure/persistence/seeds/roles.seed.ts`

**Interfaces:**
- Produces: `ERole.OrgManager = 'org_manager'`, usable everywhere `ERole` is imported (later tasks use it directly).

- [ ] **Step 1: Add the enum value**

Edit `core-apis/src/infrastructure/persistence/entities/role.entity.ts`:

```typescript
export enum ERole {
  SuperAdmin   = 'super_admin',
  OrgAdmin     = 'org_admin',
  OrgManager   = 'org_manager',
  StoreManager = 'store_manager',
  StoreStaff   = 'store_staff',
}
```

- [ ] **Step 2: Seed it**

Edit `core-apis/src/infrastructure/persistence/seeds/roles.seed.ts`, add to `seedingData`:

```typescript
      { name: ERole.SuperAdmin,   description: 'Full platform access across all organizations' },
      { name: ERole.OrgAdmin,     description: 'Full access within an organization' },
      { name: ERole.OrgManager,   description: 'Equal authority to Org Admin for approvals, black sales, and black inventory' },
      { name: ERole.StoreManager, description: 'Manage a specific store and its inventory' },
      { name: ERole.StoreStaff,   description: 'Day-to-day stock operations within a store' },
```

- [ ] **Step 3: Generate and review the migration**

Run: `cd core-apis && npm run migration:generate`
Expected: a new file `src/infrastructure/persistence/migrations/<timestamp>-migration.ts` containing an `ALTER TYPE ... ADD VALUE 'org_manager'` (or equivalent enum-recreate, depending on how TypeORM handles the existing `roles.name` enum column) — open it and confirm it only touches the roles enum, nothing else. If TypeORM produces a drop/recreate of the enum type, verify the `up()` preserves existing rows (Postgres `ALTER TYPE ... ADD VALUE` is the expected safe form; if TypeORM instead generates a table rebuild, that's still safe here because it's schema-only, no data transform, but re-check column defaults survive).

- [ ] **Step 4: Apply and verify**

Run: `cd core-apis && npm run migration:up`
Then: `npm run start:dev`, confirm the app boots and the seed runs without error (check log output for the roles seed, or query `SELECT name FROM core.roles;` and confirm `org_manager` is present).

- [ ] **Step 5: Commit**

```bash
cd core-apis
git add src/infrastructure/persistence/entities/role.entity.ts src/infrastructure/persistence/seeds/roles.seed.ts src/infrastructure/persistence/migrations/
git commit -m "feat: add OrgManager role, equal authority to OrgAdmin"
```

---

### Task 2: Extend `Bill` for sale type, customer type, payment timing, black/commission fields

**Files:**
- Modify: `core-apis/src/infrastructure/persistence/entities/bill.entity.ts`
- Modify: `core-apis/src/application/modules/bills/domain/bill.model.ts`
- Modify: `core-apis/src/application/modules/bills/models/requests/bill.request.ts`
- Modify: `core-apis/src/application/modules/bills/models/responses/bill.response.ts`
- Modify: `core-apis/src/application/modules/bills/commands/create-bill/create-bill.command.ts`
- Modify: `core-apis/src/application/modules/bills/commands/create-bill/create-bill.command-handler.ts`
- Modify: `core-apis/src/application/modules/bills/bills.controller.ts`
- Test: none (pure additive schema/DTO change; behavior is covered by Task 8's TDD spec)

**Interfaces:**
- Produces: `ESaleType` (`normal | credit | black`), `ECustomerType` (`regular | new | shop | big_customer`), `EPaymentTiming` (`before_delivery | after_delivery | half | cod`) exported from `bill.entity.ts`. `Bill.saleType`, `.customerType`, `.paymentTiming`, `.partialAmount`, `.blackAmount`, `.facilitatorUserId`, `.facilitatorName`, `.commissionAmount` on the domain model, response, and create command — used by Task 6/8's `BillCompletionService` and `CreateBillCommandHandler`.

- [ ] **Step 1: Add enums and columns to the entity**

Edit `core-apis/src/infrastructure/persistence/entities/bill.entity.ts` — add after the existing `EPaymentMethod` enum:

```typescript
export enum ESaleType {
  Normal = 'normal',
  Credit = 'credit',
  Black  = 'black',
}

export enum ECustomerType {
  Regular     = 'regular',
  New         = 'new',
  Shop        = 'shop',
  BigCustomer = 'big_customer',
}

export enum EPaymentTiming {
  BeforeDelivery = 'before_delivery',
  AfterDelivery  = 'after_delivery',
  Half           = 'half',
  Cod            = 'cod',
}
```

Add columns inside `BillEntity`, after the existing `paymentMethod` column:

```typescript
  @AutoMap(() => String)
  @Column({ name: 'sale_type', type: 'enum', enum: ESaleType, default: ESaleType.Normal })
  public saleType: ESaleType;

  @AutoMap(() => String)
  @Column({ name: 'customer_type', type: 'enum', enum: ECustomerType, nullable: true })
  public customerType?: ECustomerType;

  @AutoMap(() => String)
  @Column({ name: 'payment_timing', type: 'enum', enum: EPaymentTiming, nullable: true })
  public paymentTiming?: EPaymentTiming;

  @AutoMap()
  @Column({ name: 'partial_amount', type: 'decimal', precision: 18, scale: 4, nullable: true })
  public partialAmount?: number;

  @AutoMap()
  @Column({ name: 'black_amount', type: 'decimal', precision: 18, scale: 4, default: 0 })
  public blackAmount: number;

  @AutoMap()
  @Column({ name: 'facilitator_user_id', type: 'uuid', nullable: true })
  public facilitatorUserId?: string;

  @AutoMap()
  @Column({ name: 'facilitator_name', type: 'varchar', length: 255, nullable: true })
  public facilitatorName?: string;

  @AutoMap()
  @Column({ name: 'commission_amount', type: 'decimal', precision: 18, scale: 4, default: 0 })
  public commissionAmount: number;
```

- [ ] **Step 2: Domain model**

Edit `core-apis/src/application/modules/bills/domain/bill.model.ts` — add the matching fields (check current content first with Read; append alongside the existing `paymentMethod`/`totalAmount` fields, same `@AutoMap()` style, importing `ESaleType, ECustomerType, EPaymentTiming` from the entity file):

```typescript
  @AutoMap(() => String) public saleType: ESaleType;
  @AutoMap(() => String) public customerType?: ECustomerType;
  @AutoMap(() => String) public paymentTiming?: EPaymentTiming;
  @AutoMap() public partialAmount?: number;
  @AutoMap() public blackAmount: number;
  @AutoMap() public facilitatorUserId?: string;
  @AutoMap() public facilitatorName?: string;
  @AutoMap() public commissionAmount: number;
```

- [ ] **Step 3: Response DTO**

Edit `core-apis/src/application/modules/bills/models/responses/bill.response.ts` — add before the `items` field:

```typescript
  @ApiProperty({ enum: ESaleType }) @AutoMap(() => String) public saleType: ESaleType;
  @ApiPropertyOptional({ enum: ECustomerType }) @AutoMap(() => String) public customerType?: ECustomerType;
  @ApiPropertyOptional({ enum: EPaymentTiming }) @AutoMap(() => String) public paymentTiming?: EPaymentTiming;
  @ApiPropertyOptional() @AutoMap() public partialAmount?: number;
  @ApiProperty() @AutoMap() public blackAmount: number;
  @ApiPropertyOptional() @AutoMap() public facilitatorUserId?: string;
  @ApiPropertyOptional() @AutoMap() public facilitatorName?: string;
  @ApiProperty() @AutoMap() public commissionAmount: number;
```

Add the import: `import { ESaleType, ECustomerType, EPaymentTiming } from '../../../../../infrastructure/persistence/entities/bill.entity';`

- [ ] **Step 4: Create request/command**

Edit `core-apis/src/application/modules/bills/models/requests/bill.request.ts` — add to `CreateBillRequest` (before `items`):

```typescript
  @ApiPropertyOptional({ enum: ESaleType, default: ESaleType.Normal }) @IsOptional() @IsEnum(ESaleType) @AutoMap(() => String) public saleType?: ESaleType;
  @ApiPropertyOptional({ enum: ECustomerType }) @IsOptional() @IsEnum(ECustomerType) @AutoMap(() => String) public customerType?: ECustomerType;
  @ApiPropertyOptional({ enum: EPaymentTiming }) @IsOptional() @IsEnum(EPaymentTiming) @AutoMap(() => String) public paymentTiming?: EPaymentTiming;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @AutoMap() public partialAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() @AutoMap() public facilitatorUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @AutoMap() public facilitatorName?: string;
  @ApiPropertyOptional({ description: 'Commission % of the black markup, e.g. 30 = 30%. Only used when saleType=black and a facilitator is set.' }) @IsOptional() @IsNumber() public commissionPct?: number;
```

Add `ESaleType, ECustomerType, EPaymentTiming` to the existing entity import line at the top of the file.

Edit `core-apis/src/application/modules/bills/commands/create-bill/create-bill.command.ts`:

```typescript
import { AutoMap } from '@automapper/classes';
import { CommandBase } from '../../../../../common';
import { CreateBillItemRequest } from '../../models/requests/create-bill-item.request';
import { ESaleType, ECustomerType, EPaymentTiming } from '../../../../../infrastructure/persistence/entities/bill.entity';
import { ERole } from '../../../../../infrastructure/persistence/entities/role.entity';

export class CreateBillCommand extends CommandBase {
  @AutoMap() public organizationId: string;
  @AutoMap() public locationId: string;
  @AutoMap() public customerId?: string;
  @AutoMap() public createdById: string;
  @AutoMap() public walkInName?: string;
  @AutoMap() public walkInPhone?: string;
  @AutoMap() public walkInGstin?: string;
  @AutoMap() public notes?: string;
  @AutoMap(() => String) public saleType?: ESaleType;
  @AutoMap(() => String) public customerType?: ECustomerType;
  @AutoMap(() => String) public paymentTiming?: EPaymentTiming;
  @AutoMap() public partialAmount?: number;
  @AutoMap() public facilitatorUserId?: string;
  @AutoMap() public facilitatorName?: string;
  public commissionPct?: number;
  public performedByRoles: ERole[] = [];
  @AutoMap(() => [CreateBillItemRequest]) public items: CreateBillItemRequest[];
}
```

(`commissionPct` and `performedByRoles` are plain fields, not `@AutoMap()` — the first is handler-only input, not persisted on `Bill`; the second is set by the controller from `AuthenticatedUser`, not mapped from the request body.)

- [ ] **Step 5: Controller passes the caller's roles**

Edit `core-apis/src/application/modules/bills/bills.controller.ts`, `create()` method — after the existing `command.createdById = ...` line, add:

```typescript
    command.performedByRoles = user?.roles ?? [];
```

- [ ] **Step 6: Default `saleType` in the handler**

Edit `core-apis/src/application/modules/bills/commands/create-bill/create-bill.command-handler.ts` — in `execute()`, right after `const bill = this.mapper.map(command, CreateBillCommand, Bill);`, add:

```typescript
    bill.saleType = command.saleType ?? ESaleType.Normal;
```

Add `import { EBillStatus, ESaleType } from '../../../../../infrastructure/persistence/entities/bill.entity';` (merge with the existing `EBillStatus` import line).

- [ ] **Step 7: Mapper — no change needed**

`createMap(mapper, CreateBillCommand, Bill, forMember((d) => d.items, ignore()))` in `bill.profile.ts` already maps every `@AutoMap()`-decorated field by name; the new fields need no explicit `forMember` since names match. Confirm this by reading the file — no edit required unless a name mismatch is found.

- [ ] **Step 8: Generate migration, apply, build check**

```bash
cd core-apis
npm run migration:generate
```
Review the generated file for the new `bills` columns and two new enum types (`bills_sale_type_enum`, `bills_customer_type_enum`, `bills_payment_timing_enum` or similar TypeORM-generated names) — confirm no unrelated tables are touched.

```bash
npm run migration:up
npm run build
```
Expected: clean build, migration applies without error.

- [ ] **Step 9: Commit**

```bash
cd core-apis
git add src/infrastructure/persistence/entities/bill.entity.ts src/application/modules/bills/ src/infrastructure/persistence/migrations/
git commit -m "feat: add sale type, customer type, payment timing, black/commission fields to Bill"
```

---

### Task 3: Extend `Customer` for credit limit/balance

**Files:**
- Modify: `core-apis/src/infrastructure/persistence/entities/customer.entity.ts`
- Modify: `core-apis/src/application/modules/customers/domain/customer.model.ts`
- Modify: `core-apis/src/application/modules/customers/models/responses/customer.response.ts`
- Modify: `core-apis/src/application/modules/customers/models/requests/create-customer.request.ts`
- Modify: `core-apis/src/application/modules/customers/models/requests/update-customer.request.ts`
- Modify: `core-apis/src/application/modules/customers/commands/create-customer/create-customer.command.ts`
- Modify: `core-apis/src/application/modules/customers/commands/update-customer/update-customer.command.ts`

**Interfaces:**
- Produces: `Customer.creditLimit?: number`, `Customer.creditBalance: number` — read by Task 6's `BillCompletionService` credit-limit gate.

- [ ] **Step 1: Entity columns**

Edit `core-apis/src/infrastructure/persistence/entities/customer.entity.ts` — add after `gstin`:

```typescript
  @AutoMap()
  @Column({ name: 'credit_limit', type: 'decimal', precision: 18, scale: 4, nullable: true })
  public creditLimit?: number;

  @AutoMap()
  @Column({ name: 'credit_balance', type: 'decimal', precision: 18, scale: 4, default: 0 })
  public creditBalance: number;
```

- [ ] **Step 2: Domain model, response, create/update DTOs**

`core-apis/src/application/modules/customers/domain/customer.model.ts` — add:
```typescript
  @AutoMap() public creditLimit?: number;
  @AutoMap() public creditBalance: number;
```

`core-apis/src/application/modules/customers/models/responses/customer.response.ts` — add (check the file's exact `@ApiProperty` style first, mirror it):
```typescript
  @ApiPropertyOptional() @AutoMap() public creditLimit?: number;
  @ApiProperty() @AutoMap() public creditBalance: number;
```

`core-apis/src/application/modules/customers/models/requests/create-customer.request.ts` — add:
```typescript
  @ApiPropertyOptional() @IsOptional() @IsNumber() @AutoMap() public creditLimit?: number;
```
(`creditBalance` is never client-settable on create — it always starts at 0 via the entity/domain default, so it is deliberately omitted from the create request.)

`core-apis/src/application/modules/customers/models/requests/update-customer.request.ts` — add the same `creditLimit` field (staff can raise/lower a customer's limit; `creditBalance` stays server-only, updated exclusively by `BillCompletionService` in Task 6/7, never directly via this endpoint — do not add it here).

`core-apis/src/application/modules/customers/commands/create-customer/create-customer.command.ts` and `update-customer.command.ts` — add `@AutoMap() public creditLimit?: number;` to each (mirrors the request DTOs; the mapper profile's existing `createMap` calls pick this up automatically by field name, same as Task 2 Step 7 — verify, no edit needed unless a mismatch surfaces).

- [ ] **Step 3: Migration, apply, build**

```bash
cd core-apis
npm run migration:generate
npm run migration:up
npm run build
```
Review the generated migration touches only `customers` (two new columns, no enum this time — plain decimals).

- [ ] **Step 4: Commit**

```bash
cd core-apis
git add src/infrastructure/persistence/entities/customer.entity.ts src/application/modules/customers/ src/infrastructure/persistence/migrations/
git commit -m "feat: add per-customer credit limit and running credit balance"
```

---

### Task 4: `CustomerCreditTransaction` and `CreditApprovalRequest` — entities, repos, module

**Files:**
- Create: `core-apis/src/infrastructure/persistence/entities/customer-credit-transaction.entity.ts`
- Create: `core-apis/src/infrastructure/persistence/entities/credit-approval-request.entity.ts`
- Modify: `core-apis/src/infrastructure/persistence/entities/e-core-table-name.ts`
- Modify: `core-apis/src/infrastructure/persistence/entities/index.ts`
- Create: `core-apis/src/application/modules/credit-approvals/domain/customer-credit-transaction.model.ts`
- Create: `core-apis/src/application/modules/credit-approvals/domain/credit-approval-request.model.ts`
- Create: `core-apis/src/application/modules/credit-approvals/domain/index.ts`
- Create: `core-apis/src/application/modules/credit-approvals/i-customer-credit-transaction.repo.ts`
- Create: `core-apis/src/application/modules/credit-approvals/i-credit-approval-request.repo.ts`
- Create: `core-apis/src/application/modules/credit-approvals/index.ts`
- Create: `core-apis/src/infrastructure/persistence/repositories/customer-credit-transaction.repo.ts`
- Create: `core-apis/src/infrastructure/persistence/repositories/credit-approval-request.repo.ts`
- Modify: `core-apis/src/infrastructure/persistence/repositories/index.ts`
- Modify: `core-apis/src/application/constants.ts`
- Modify: `core-apis/src/infrastructure/infrastructure.module.ts`

**Interfaces:**
- Produces: `ICustomerCreditTransactionRepo`, `ICreditApprovalRequestRepo` (both plain `IBaseRepo` aliases — `createAsync`, `getAsync`, `updateAsync`, `allAsync`), tokens `CUSTOMER_CREDIT_TRANSACTION_REPO`, `CREDIT_APPROVAL_REQUEST_REPO` — consumed by Task 6 (`BillCompletionService`) and Task 7 (approve/reject commands).

- [ ] **Step 1: Table names**

Edit `core-apis/src/infrastructure/persistence/entities/e-core-table-name.ts` — add after `Bills`/`BillItems`:

```typescript
  CustomerCreditTransactions = 'customer_credit_transactions',
  CreditApprovalRequests     = 'credit_approval_requests',
```

- [ ] **Step 2: Entities**

Create `core-apis/src/infrastructure/persistence/entities/customer-credit-transaction.entity.ts`:

```typescript
import { AutoMap } from '@automapper/classes';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CORE_SCHEMA, ECoreTableName } from './e-core-table-name';
import { CustomerEntity } from './customer.entity';
import { BillEntity } from './bill.entity';
import { UserEntity } from './user.entity';

const PK_NAME = 'PK_' + ECoreTableName.CustomerCreditTransactions;

export enum ECreditTransactionType {
  CreditSale = 'credit_sale',
  Payment    = 'payment',
  Adjustment = 'adjustment',
}

@Entity({ schema: CORE_SCHEMA, name: ECoreTableName.CustomerCreditTransactions })
export class CustomerCreditTransactionEntity {
  @AutoMap()
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: PK_NAME })
  public id: string;

  @AutoMap()
  @Column({ name: 'customer_id', type: 'uuid' })
  public customerId: string;

  @AutoMap()
  @Column({ name: 'bill_id', type: 'uuid', nullable: true })
  public billId?: string;

  @AutoMap(() => String)
  @Column({ name: 'type', type: 'enum', enum: ECreditTransactionType })
  public type: ECreditTransactionType;

  @AutoMap()
  @Column({ type: 'decimal', precision: 18, scale: 4 })
  public amount: number;

  @AutoMap()
  @Column({ name: 'balance_before', type: 'decimal', precision: 18, scale: 4 })
  public balanceBefore: number;

  @AutoMap()
  @Column({ name: 'balance_after', type: 'decimal', precision: 18, scale: 4 })
  public balanceAfter: number;

  @AutoMap()
  @Column({ name: 'performed_by_id', type: 'uuid', nullable: true })
  public performedById?: string;

  @AutoMap(() => Date)
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  @AutoMap(() => CustomerEntity)
  @ManyToOne(() => CustomerEntity)
  @JoinColumn({ name: 'customer_id', referencedColumnName: 'id', foreignKeyConstraintName: `FK__${ECoreTableName.CustomerCreditTransactions}__${ECoreTableName.Customers}` })
  public customer: CustomerEntity;

  @AutoMap(() => BillEntity)
  @ManyToOne(() => BillEntity, { nullable: true })
  @JoinColumn({ name: 'bill_id', referencedColumnName: 'id', foreignKeyConstraintName: `FK__${ECoreTableName.CustomerCreditTransactions}__${ECoreTableName.Bills}` })
  public bill?: BillEntity;

  @AutoMap(() => UserEntity)
  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'performed_by_id', referencedColumnName: 'id', foreignKeyConstraintName: `FK__${ECoreTableName.CustomerCreditTransactions}__${ECoreTableName.Users}` })
  public performedBy?: UserEntity;
}
```

Create `core-apis/src/infrastructure/persistence/entities/credit-approval-request.entity.ts`:

```typescript
import { AutoMap } from '@automapper/classes';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CORE_SCHEMA, ECoreTableName } from './e-core-table-name';
import { OrganizationEntity } from './organization.entity';
import { CustomerEntity } from './customer.entity';
import { BillEntity } from './bill.entity';
import { UserEntity } from './user.entity';

const PK_NAME = 'PK_' + ECoreTableName.CreditApprovalRequests;

export enum ECreditApprovalStatus {
  Pending  = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

@Entity({ schema: CORE_SCHEMA, name: ECoreTableName.CreditApprovalRequests })
export class CreditApprovalRequestEntity {
  @AutoMap()
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: PK_NAME })
  public id: string;

  @AutoMap()
  @Column({ name: 'organization_id', type: 'uuid' })
  public organizationId: string;

  @AutoMap()
  @Column({ name: 'customer_id', type: 'uuid' })
  public customerId: string;

  @AutoMap()
  @Column({ name: 'bill_id', type: 'uuid' })
  public billId: string;

  @AutoMap()
  @Column({ name: 'requested_amount', type: 'decimal', precision: 18, scale: 4 })
  public requestedAmount: number;

  @AutoMap()
  @Column({ name: 'requested_by_id', type: 'uuid' })
  public requestedById: string;

  @AutoMap(() => String)
  @Column({ type: 'enum', enum: ECreditApprovalStatus, default: ECreditApprovalStatus.Pending })
  public status: ECreditApprovalStatus;

  @AutoMap()
  @Column({ name: 'decided_by_id', type: 'uuid', nullable: true })
  public decidedById?: string;

  @AutoMap(() => Date)
  @Column({ name: 'decided_at', type: 'timestamp', nullable: true })
  public decidedAt?: Date;

  @AutoMap(() => Date)
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  @AutoMap(() => OrganizationEntity)
  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id', referencedColumnName: 'id', foreignKeyConstraintName: `FK__${ECoreTableName.CreditApprovalRequests}__${ECoreTableName.Organizations}` })
  public organization: OrganizationEntity;

  @AutoMap(() => CustomerEntity)
  @ManyToOne(() => CustomerEntity)
  @JoinColumn({ name: 'customer_id', referencedColumnName: 'id', foreignKeyConstraintName: `FK__${ECoreTableName.CreditApprovalRequests}__${ECoreTableName.Customers}` })
  public customer: CustomerEntity;

  @AutoMap(() => BillEntity)
  @ManyToOne(() => BillEntity)
  @JoinColumn({ name: 'bill_id', referencedColumnName: 'id', foreignKeyConstraintName: `FK__${ECoreTableName.CreditApprovalRequests}__${ECoreTableName.Bills}` })
  public bill: BillEntity;

  @AutoMap(() => UserEntity)
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'requested_by_id', referencedColumnName: 'id', foreignKeyConstraintName: `FK__${ECoreTableName.CreditApprovalRequests}__requested_by__${ECoreTableName.Users}` })
  public requestedBy: UserEntity;

  @AutoMap(() => UserEntity)
  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'decided_by_id', referencedColumnName: 'id', foreignKeyConstraintName: `FK__${ECoreTableName.CreditApprovalRequests}__decided_by__${ECoreTableName.Users}` })
  public decidedBy?: UserEntity;
}
```

Register both in `core-apis/src/infrastructure/persistence/entities/index.ts`: add `import { CustomerCreditTransactionEntity } from './customer-credit-transaction.entity';` and `import { CreditApprovalRequestEntity } from './credit-approval-request.entity';` at the top, `export * from './customer-credit-transaction.entity';` / `export * from './credit-approval-request.entity';` with the other `export *` lines, and add both classes to the default entities array (same array `UnpublishedStockEntity` is in).

- [ ] **Step 2: Domain models**

Create `core-apis/src/application/modules/credit-approvals/domain/customer-credit-transaction.model.ts`:

```typescript
import { AutoMap } from '@automapper/classes';
import { ECreditTransactionType } from '../../../../infrastructure/persistence/entities/customer-credit-transaction.entity';

export class CustomerCreditTransaction {
  @AutoMap() public id: string;
  @AutoMap() public customerId: string;
  @AutoMap() public billId?: string;
  @AutoMap(() => String) public type: ECreditTransactionType;
  @AutoMap() public amount: number;
  @AutoMap() public balanceBefore: number;
  @AutoMap() public balanceAfter: number;
  @AutoMap() public performedById?: string;
  @AutoMap(() => Date) public createdAt: Date;
}
```

Create `core-apis/src/application/modules/credit-approvals/domain/credit-approval-request.model.ts`:

```typescript
import { AutoMap } from '@automapper/classes';
import { ECreditApprovalStatus } from '../../../../infrastructure/persistence/entities/credit-approval-request.entity';

export class CreditApprovalRequest {
  @AutoMap() public id: string;
  @AutoMap() public organizationId: string;
  @AutoMap() public customerId: string;
  @AutoMap() public billId: string;
  @AutoMap() public requestedAmount: number;
  @AutoMap() public requestedById: string;
  @AutoMap(() => String) public status: ECreditApprovalStatus;
  @AutoMap() public decidedById?: string;
  @AutoMap(() => Date) public decidedAt?: Date;
  @AutoMap(() => Date) public createdAt: Date;
}
```

Create `core-apis/src/application/modules/credit-approvals/domain/index.ts`:
```typescript
export * from './customer-credit-transaction.model';
export * from './credit-approval-request.model';
```

- [ ] **Step 3: Repo interfaces**

Create `core-apis/src/application/modules/credit-approvals/i-customer-credit-transaction.repo.ts`:
```typescript
import { IBaseRepo, Filter, PageableFilter } from '../../../common';
import { CustomerCreditTransaction } from './domain';

export const CUSTOMER_CREDIT_TRANSACTION_REPO = 'CUSTOMER_CREDIT_TRANSACTION_REPO';
export type ICustomerCreditTransactionRepo = IBaseRepo<CustomerCreditTransaction, string, PageableFilter<CustomerCreditTransaction>, Filter<CustomerCreditTransaction>>;
```

Create `core-apis/src/application/modules/credit-approvals/i-credit-approval-request.repo.ts`:
```typescript
import { IBaseRepo, Filter, PageableFilter } from '../../../common';
import { CreditApprovalRequest } from './domain';

export const CREDIT_APPROVAL_REQUEST_REPO = 'CREDIT_APPROVAL_REQUEST_REPO';
export type ICreditApprovalRequestRepo = IBaseRepo<CreditApprovalRequest, string, PageableFilter<CreditApprovalRequest>, Filter<CreditApprovalRequest>>;
```

Create `core-apis/src/application/modules/credit-approvals/index.ts`:
```typescript
export * from './domain';
export * from './i-customer-credit-transaction.repo';
export * from './i-credit-approval-request.repo';
```

- [ ] **Step 4: Repo implementations**

Create `core-apis/src/infrastructure/persistence/repositories/customer-credit-transaction.repo.ts` (mirrors `customer.repo.ts` exactly, no soft delete):

```typescript
import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { BaseRepo, Filter, PageableFilter } from '../../../common';
import { CustomerCreditTransactionEntity } from '../entities';
import { CustomerCreditTransaction, ICustomerCreditTransactionRepo } from '../../../application/modules/credit-approvals';

@Injectable()
export class CustomerCreditTransactionRepo extends BaseRepo<CustomerCreditTransactionEntity, CustomerCreditTransaction, string, PageableFilter<CustomerCreditTransaction>, Filter<CustomerCreditTransaction>> implements ICustomerCreditTransactionRepo {
  constructor(
    @InjectRepository(CustomerCreditTransactionEntity) internalRepo: Repository<CustomerCreditTransactionEntity>,
    @InjectMapper() mapper: Mapper,
    @InjectPinoLogger(CustomerCreditTransactionRepo.name) logger: PinoLogger,
  ) {
    super(internalRepo, mapper, logger, CustomerCreditTransactionEntity, CustomerCreditTransaction);
  }

  public override get idColumnName(): keyof CustomerCreditTransactionEntity {
    return 'id';
  }
}
```

Create `core-apis/src/infrastructure/persistence/repositories/credit-approval-request.repo.ts` (same shape, entity `CreditApprovalRequestEntity` / domain `CreditApprovalRequest`).

Add both to `core-apis/src/infrastructure/persistence/repositories/index.ts`'s barrel export list.

- [ ] **Step 5: Wire into `infrastructure.module.ts`**

Edit `core-apis/src/application/constants.ts` — add:
```typescript
export const CUSTOMER_CREDIT_TRANSACTION_REPO = 'CUSTOMER_CREDIT_TRANSACTION_REPO';
export const CREDIT_APPROVAL_REQUEST_REPO     = 'CREDIT_APPROVAL_REQUEST_REPO';
```
(Move/keep in sync with the same-named exports in Step 3's repo interface files — those files re-export the constant too; having it in `constants.ts` as well matches how `UNPUBLISHED_STOCK_REPO` etc. are defined in `constants.ts` and imported into `infrastructure.module.ts`. If `constants.ts` is the single source of truth in this codebase, delete the duplicate `export const ..._REPO` lines from the `i-*.repo.ts` files in Step 3 and import from `constants.ts` there instead — check how `i-unpublished-stock.repo.ts` does it (it self-declares `UNPUBLISHED_STOCK_REPO`) vs `i-customer.repo.ts` (declares no constant, uses `CUSTOMER_REPO` only from `constants.ts`) before deciding; **follow the `i-unpublished-stock.repo.ts` precedent** since that's the module this plan's black-inventory work builds on — keep the self-declared constant in Step 3 and do NOT duplicate it in `constants.ts`.)

Edit `core-apis/src/infrastructure/infrastructure.module.ts`:
- Add `CustomerCreditTransactionRepo, CreditApprovalRequestRepo` to the `from './persistence'` import block.
- Add `CUSTOMER_CREDIT_TRANSACTION_REPO, CREDIT_APPROVAL_REQUEST_REPO` to the `from '../application/constants'` import block (importing from `credit-approvals` module path instead if Step 3's self-declaration approach was kept — match whichever choice was made above).
- Add `{ provide: CUSTOMER_CREDIT_TRANSACTION_REPO, useClass: CustomerCreditTransactionRepo },` and the credit-approval-request equivalent to `providers`.
- Add both tokens to `exports`.

- [ ] **Step 6: Migration, build**

```bash
cd core-apis
npm run migration:generate
npm run migration:up
npm run build
```
Review: two new tables, `customer_credit_transactions` and `credit_approval_requests`, with FKs to `customers`, `bills`, `organizations`, `users`.

- [ ] **Step 7: Commit**

```bash
cd core-apis
git add src/infrastructure/persistence/entities/customer-credit-transaction.entity.ts src/infrastructure/persistence/entities/credit-approval-request.entity.ts src/infrastructure/persistence/entities/e-core-table-name.ts src/infrastructure/persistence/entities/index.ts src/application/modules/credit-approvals/ src/infrastructure/persistence/repositories/ src/application/constants.ts src/infrastructure/infrastructure.module.ts src/infrastructure/persistence/migrations/
git commit -m "feat: add CustomerCreditTransaction and CreditApprovalRequest entities"
```

---

### Task 5: `CommissionPayable` entity + `UnpublishedStock` lookup method + `Sold` movement type

**Files:**
- Create: `core-apis/src/infrastructure/persistence/entities/commission-payable.entity.ts`
- Modify: `core-apis/src/infrastructure/persistence/entities/unpublished-stock-movement.entity.ts`
- Modify: `core-apis/src/infrastructure/persistence/entities/e-core-table-name.ts`
- Modify: `core-apis/src/infrastructure/persistence/entities/index.ts`
- Create: `core-apis/src/application/modules/credit-approvals/domain/commission-payable.model.ts` (reuses the `credit-approvals` module — see note below)
- Modify: `core-apis/src/application/modules/credit-approvals/domain/index.ts`
- Create: `core-apis/src/application/modules/credit-approvals/i-commission-payable.repo.ts`
- Modify: `core-apis/src/application/modules/credit-approvals/index.ts`
- Create: `core-apis/src/infrastructure/persistence/repositories/commission-payable.repo.ts`
- Modify: `core-apis/src/infrastructure/persistence/repositories/index.ts`
- Modify: `core-apis/src/infrastructure/infrastructure.module.ts`
- Modify: `core-apis/src/application/modules/unpublished-stock/i-unpublished-stock.repo.ts`
- Modify: `core-apis/src/infrastructure/persistence/repositories/unpublished-stock.repo.ts`

**Interfaces:**
- Produces: `EUnpublishedMovementType.Sold`, `IUnpublishedStockRepo.findByOrgLocationProductAsync(organizationId, locationId, productId, manager): Promise<UnpublishedStock | null>`, `ICommissionPayableRepo` — all consumed by Task 6's `BillCompletionService`.

Note: `CommissionPayable` isn't conceptually a credit-approval type, but it shares the exact same plain-repo shape and has no other natural home in this codebase's module layout — putting it in `credit-approvals` avoids a single-entity module for one table. If that reads wrong once you're in the code, a `commissions` module is an equally fine alternative; keep it consistent with wherever `BillCompletionService` (Task 6) ends up importing from.

- [ ] **Step 1: Table name + entity**

Add to `e-core-table-name.ts`: `CommissionPayables = 'commission_payables',`

Create `core-apis/src/infrastructure/persistence/entities/commission-payable.entity.ts`:
```typescript
import { AutoMap } from '@automapper/classes';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CORE_SCHEMA, ECoreTableName } from './e-core-table-name';
import { OrganizationEntity } from './organization.entity';
import { BillEntity } from './bill.entity';
import { UserEntity } from './user.entity';

const PK_NAME = 'PK_' + ECoreTableName.CommissionPayables;

export enum ECommissionStatus {
  Owed = 'owed',
  Paid = 'paid',
}

@Entity({ schema: CORE_SCHEMA, name: ECoreTableName.CommissionPayables })
export class CommissionPayableEntity {
  @AutoMap()
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: PK_NAME })
  public id: string;

  @AutoMap()
  @Column({ name: 'organization_id', type: 'uuid' })
  public organizationId: string;

  @AutoMap()
  @Column({ name: 'bill_id', type: 'uuid' })
  public billId: string;

  @AutoMap()
  @Column({ name: 'facilitator_user_id', type: 'uuid', nullable: true })
  public facilitatorUserId?: string;

  @AutoMap()
  @Column({ name: 'facilitator_name', type: 'varchar', length: 255, nullable: true })
  public facilitatorName?: string;

  @AutoMap()
  @Column({ type: 'decimal', precision: 18, scale: 4 })
  public amount: number;

  @AutoMap(() => String)
  @Column({ type: 'enum', enum: ECommissionStatus, default: ECommissionStatus.Owed })
  public status: ECommissionStatus;

  @AutoMap(() => Date)
  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  public paidAt?: Date;

  @AutoMap(() => Date)
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  @AutoMap(() => OrganizationEntity)
  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id', referencedColumnName: 'id', foreignKeyConstraintName: `FK__${ECoreTableName.CommissionPayables}__${ECoreTableName.Organizations}` })
  public organization: OrganizationEntity;

  @AutoMap(() => BillEntity)
  @ManyToOne(() => BillEntity)
  @JoinColumn({ name: 'bill_id', referencedColumnName: 'id', foreignKeyConstraintName: `FK__${ECoreTableName.CommissionPayables}__${ECoreTableName.Bills}` })
  public bill: BillEntity;

  @AutoMap(() => UserEntity)
  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'facilitator_user_id', referencedColumnName: 'id', foreignKeyConstraintName: `FK__${ECoreTableName.CommissionPayables}__${ECoreTableName.Users}` })
  public facilitatorUser?: UserEntity;
}
```

Register in `entities/index.ts` (import, `export *`, add to entities array) — same pattern as Task 4 Step 1.

- [ ] **Step 2: Domain, repo interface, repo impl, DI wiring**

Repeat the exact pattern from Task 4 Steps 2–5 for `CommissionPayable`: domain model in `credit-approvals/domain/commission-payable.model.ts`, add its export to `domain/index.ts`, repo interface `credit-approvals/i-commission-payable.repo.ts` (constant `COMMISSION_PAYABLE_REPO`), export from `credit-approvals/index.ts`, repo impl `commission-payable.repo.ts` (mirrors `customer-credit-transaction.repo.ts`), barrel export, wire into `infrastructure.module.ts` providers/exports.

- [ ] **Step 3: `Sold` movement type**

Edit `core-apis/src/infrastructure/persistence/entities/unpublished-stock-movement.entity.ts`:
```typescript
export enum EUnpublishedMovementType {
  StockIn     = 'stock_in',
  TransferOut = 'transfer_out',
  Sold        = 'sold',
}
```

- [ ] **Step 4: `findByOrgLocationProductAsync` on `UnpublishedStock` repo**

Edit `core-apis/src/application/modules/unpublished-stock/i-unpublished-stock.repo.ts` — add to the interface:
```typescript
  findByOrgLocationProductAsync(organizationId: string, locationId: string, productId: string, manager?: EntityManager): Promise<UnpublishedStock | null>;
```

Edit `core-apis/src/infrastructure/persistence/repositories/unpublished-stock.repo.ts` (read the file first for its current shape — it implements `findOrCreateAsync`/`addStockAsync`/`deductStockAsync`; add alongside them):
```typescript
  public async findByOrgLocationProductAsync(organizationId: string, locationId: string, productId: string, manager?: EntityManager): Promise<UnpublishedStock | null> {
    const repo = manager ? manager.getRepository(UnpublishedStockEntity) : this.internalRepo;
    const found = await repo.findOne({ where: { organizationId, locationId, productId } });
    return found ? this.mapper.map(found, UnpublishedStockEntity, UnpublishedStock) : null;
  }
```
(Check the exact name of the protected repository field on `BaseRepo` — it may not be called `internalRepo` from outside; if it's private/inaccessible, add a `@InjectRepository(UnpublishedStockEntity) private readonly repo: Repository<UnpublishedStockEntity>` constructor param instead, matching how `findOrCreateAsync` already accesses the table — read that method's implementation first and copy its access pattern exactly rather than guessing.)

- [ ] **Step 5: Migration, build**

```bash
cd core-apis
npm run migration:generate
npm run migration:up
npm run build
```

- [ ] **Step 6: Commit**

```bash
cd core-apis
git add src/infrastructure/persistence/entities/commission-payable.entity.ts src/infrastructure/persistence/entities/unpublished-stock-movement.entity.ts src/infrastructure/persistence/entities/e-core-table-name.ts src/infrastructure/persistence/entities/index.ts src/application/modules/credit-approvals/ src/application/modules/unpublished-stock/i-unpublished-stock.repo.ts src/infrastructure/persistence/repositories/ src/infrastructure/infrastructure.module.ts src/infrastructure/persistence/migrations/
git commit -m "feat: add CommissionPayable entity, Sold movement type, black-stock lookup"
```

---

### Task 6: `BillCompletionService` — shared completion logic (TDD)

This is the core business logic task. It centralizes what happens when a bill moves to `COMPLETED`: official-vs-black stock deduction, the credit-limit gate, credit balance updates, and commission computation — so both the normal transition path (Task 7) and the credit-approval path (Task 7) call one implementation instead of two.

**Files:**
- Create: `core-apis/src/application/shared/services/bill-completion.service.ts`
- Create: `core-apis/src/application/shared/services/bill-completion.service.spec.ts`
- Modify: `core-apis/src/application/shared/shared.module.ts`

**Interfaces:**
- Produces:
  - `class CreditLimitExceededError extends Error` — thrown when a credit sale would exceed the customer's limit; carries `approvalRequestId: string`.
  - `BillCompletionService.completeBill(billId: string, performedById: string, creditOverrideApproved = false): Promise<Bill>` — the single entry point Task 7's two call sites use.
- Consumes: `BILL_REPO`, `BILL_ITEM_REPO`, `INVENTORY_REPO`, `CUSTOMER_REPO`, `UNPUBLISHED_STOCK_REPO` (with Task 5's `findByOrgLocationProductAsync`/existing `deductStockAsync`), `UNPUBLISHED_STOCK_MOVEMENT_REPO`, `CUSTOMER_CREDIT_TRANSACTION_REPO`, `CREDIT_APPROVAL_REQUEST_REPO`, `COMMISSION_PAYABLE_REPO` — all already wired to DI tokens by Tasks 4–5.

- [ ] **Step 1: Write the failing spec**

Create `core-apis/src/application/shared/services/bill-completion.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { DataSource } from 'typeorm';
import { BillCompletionService, CreditLimitExceededError } from './bill-completion.service';
import {
  BILL_REPO, BILL_ITEM_REPO, INVENTORY_REPO, CUSTOMER_REPO,
  UNPUBLISHED_STOCK_REPO, UNPUBLISHED_STOCK_MOVEMENT_REPO,
} from '../../constants';
import { CUSTOMER_CREDIT_TRANSACTION_REPO, CREDIT_APPROVAL_REQUEST_REPO, COMMISSION_PAYABLE_REPO } from '../../modules/credit-approvals';
import { ESaleType } from '../../../infrastructure/persistence/entities/bill.entity';

describe('BillCompletionService', () => {
  const billRepo = { getAsync: jest.fn(), updateAsync: jest.fn((b) => b) };
  const itemRepo = { allAsync: jest.fn() };
  const inventoryRepo = { findByOrgLocationProductAsync: jest.fn(), deductStockAsync: jest.fn() };
  const customerRepo = { getAsync: jest.fn(), updateAsync: jest.fn((c) => c) };
  const unpublishedStockRepo = { findByOrgLocationProductAsync: jest.fn(), deductStockAsync: jest.fn() };
  const unpublishedMovementRepo = { createAsync: jest.fn() };
  const creditTxnRepo = { createAsync: jest.fn() };
  const creditApprovalRepo = { createAsync: jest.fn() };
  const commissionRepo = { createAsync: jest.fn() };
  const dataSource = {
    createQueryRunner: () => ({
      connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(), release: jest.fn(), manager: {},
    }),
  };
  let service: BillCompletionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        BillCompletionService,
        { provide: BILL_REPO, useValue: billRepo },
        { provide: BILL_ITEM_REPO, useValue: itemRepo },
        { provide: INVENTORY_REPO, useValue: inventoryRepo },
        { provide: CUSTOMER_REPO, useValue: customerRepo },
        { provide: UNPUBLISHED_STOCK_REPO, useValue: unpublishedStockRepo },
        { provide: UNPUBLISHED_STOCK_MOVEMENT_REPO, useValue: unpublishedMovementRepo },
        { provide: CUSTOMER_CREDIT_TRANSACTION_REPO, useValue: creditTxnRepo },
        { provide: CREDIT_APPROVAL_REQUEST_REPO, useValue: creditApprovalRepo },
        { provide: COMMISSION_PAYABLE_REPO, useValue: commissionRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: getLoggerToken(BillCompletionService.name), useValue: { info: jest.fn(), warn: jest.fn() } },
      ],
    }).compile();
    service = module.get(BillCompletionService);
  });

  it('deducts official inventory for a normal sale', async () => {
    billRepo.getAsync.mockResolvedValue({ id: 'bill-1', organizationId: 'org-1', locationId: 'loc-1', saleType: ESaleType.Normal, totalAmount: 100, customerId: undefined });
    itemRepo.allAsync.mockResolvedValue([{ productId: 'prod-1', quantity: 2 }]);
    inventoryRepo.findByOrgLocationProductAsync.mockResolvedValue({ id: 'inv-1' });

    await service.completeBill('bill-1', 'user-1');

    expect(inventoryRepo.deductStockAsync).toHaveBeenCalledWith('inv-1', 2, expect.anything());
    expect(unpublishedStockRepo.deductStockAsync).not.toHaveBeenCalled();
  });

  it('deducts black stock, never official inventory, for a black sale', async () => {
    billRepo.getAsync.mockResolvedValue({ id: 'bill-2', organizationId: 'org-1', locationId: 'loc-1', saleType: ESaleType.Black, totalAmount: 150, blackAmount: 50, commissionAmount: 0 });
    itemRepo.allAsync.mockResolvedValue([{ productId: 'prod-1', quantity: 1 }]);
    unpublishedStockRepo.findByOrgLocationProductAsync.mockResolvedValue({ id: 'unp-1' });
    unpublishedStockRepo.deductStockAsync.mockResolvedValue({ id: 'unp-1', quantityOnHand: 4 });

    await service.completeBill('bill-2', 'user-1');

    expect(unpublishedStockRepo.deductStockAsync).toHaveBeenCalledWith('unp-1', 1, expect.anything());
    expect(inventoryRepo.deductStockAsync).not.toHaveBeenCalled();
  });

  it('completes a credit sale within limit and raises the running balance', async () => {
    billRepo.getAsync.mockResolvedValue({ id: 'bill-3', organizationId: 'org-1', locationId: 'loc-1', saleType: ESaleType.Credit, totalAmount: 40, customerId: 'cust-1' });
    itemRepo.allAsync.mockResolvedValue([{ productId: 'prod-1', quantity: 1 }]);
    inventoryRepo.findByOrgLocationProductAsync.mockResolvedValue({ id: 'inv-1' });
    customerRepo.getAsync.mockResolvedValue({ id: 'cust-1', creditLimit: 100, creditBalance: 20 });

    await service.completeBill('bill-3', 'user-1');

    expect(customerRepo.updateAsync).toHaveBeenCalledWith(expect.objectContaining({ creditBalance: 60 }));
    expect(creditTxnRepo.createAsync).toHaveBeenCalledWith(expect.objectContaining({ balanceBefore: 20, balanceAfter: 60, amount: 40 }));
  });

  it('blocks a credit sale over limit and creates an approval request instead of completing', async () => {
    billRepo.getAsync.mockResolvedValue({ id: 'bill-4', organizationId: 'org-1', locationId: 'loc-1', saleType: ESaleType.Credit, totalAmount: 90, customerId: 'cust-1' });
    itemRepo.allAsync.mockResolvedValue([{ productId: 'prod-1', quantity: 1 }]);
    customerRepo.getAsync.mockResolvedValue({ id: 'cust-1', creditLimit: 100, creditBalance: 20 });
    creditApprovalRepo.createAsync.mockResolvedValue({ id: 'approval-1' });

    await expect(service.completeBill('bill-4', 'user-1')).rejects.toBeInstanceOf(CreditLimitExceededError);

    expect(inventoryRepo.deductStockAsync).not.toHaveBeenCalled();
    expect(customerRepo.updateAsync).not.toHaveBeenCalled();
    expect(creditApprovalRepo.createAsync).toHaveBeenCalledWith(expect.objectContaining({ customerId: 'cust-1', billId: 'bill-4', requestedAmount: 90 }));
  });

  it('skips the credit-limit gate when creditOverrideApproved is true', async () => {
    billRepo.getAsync.mockResolvedValue({ id: 'bill-5', organizationId: 'org-1', locationId: 'loc-1', saleType: ESaleType.Credit, totalAmount: 90, customerId: 'cust-1' });
    itemRepo.allAsync.mockResolvedValue([{ productId: 'prod-1', quantity: 1 }]);
    inventoryRepo.findByOrgLocationProductAsync.mockResolvedValue({ id: 'inv-1' });
    customerRepo.getAsync.mockResolvedValue({ id: 'cust-1', creditLimit: 100, creditBalance: 20 });

    await service.completeBill('bill-5', 'user-1', true);

    expect(creditApprovalRepo.createAsync).not.toHaveBeenCalled();
    expect(customerRepo.updateAsync).toHaveBeenCalledWith(expect.objectContaining({ creditBalance: 110 }));
  });

  it('creates a CommissionPayable row for a black sale with a facilitator', async () => {
    billRepo.getAsync.mockResolvedValue({ id: 'bill-6', organizationId: 'org-1', locationId: 'loc-1', saleType: ESaleType.Black, totalAmount: 150, blackAmount: 50, commissionAmount: 15, facilitatorUserId: 'fac-1', facilitatorName: undefined });
    itemRepo.allAsync.mockResolvedValue([{ productId: 'prod-1', quantity: 1 }]);
    unpublishedStockRepo.findByOrgLocationProductAsync.mockResolvedValue({ id: 'unp-1' });
    unpublishedStockRepo.deductStockAsync.mockResolvedValue({ id: 'unp-1', quantityOnHand: 4 });

    await service.completeBill('bill-6', 'user-1');

    expect(commissionRepo.createAsync).toHaveBeenCalledWith(expect.objectContaining({ billId: 'bill-6', facilitatorUserId: 'fac-1', amount: 15, status: 'owed' }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd core-apis && npx jest bill-completion.service.spec.ts`
Expected: FAIL — `BillCompletionService` doesn't exist yet.

- [ ] **Step 3: Implement `BillCompletionService`**

Create `core-apis/src/application/shared/services/bill-completion.service.ts`:

```typescript
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { BILL_REPO, BILL_ITEM_REPO, INVENTORY_REPO, CUSTOMER_REPO, UNPUBLISHED_STOCK_REPO, UNPUBLISHED_STOCK_MOVEMENT_REPO } from '../../constants';
import { CUSTOMER_CREDIT_TRANSACTION_REPO, CREDIT_APPROVAL_REQUEST_REPO, COMMISSION_PAYABLE_REPO } from '../../modules/credit-approvals';
import { IBillRepo } from '../../modules/bills/i-bill.repo';
import { Bill, BillItem } from '../../modules/bills/domain';
import { IBaseRepo, Filter, PageableFilter } from '../../../common';
import { IInventoryRepo } from '../../modules/inventory';
import { ICustomerRepo } from '../../modules/customers';
import { IUnpublishedStockRepo } from '../../modules/unpublished-stock/i-unpublished-stock.repo';
import { IUnpublishedStockMovementRepo } from '../../modules/unpublished-stock/i-unpublished-stock-movement.repo';
import { ICustomerCreditTransactionRepo, ICreditApprovalRequestRepo, ICommissionPayableRepo } from '../../modules/credit-approvals';
import { ESaleType } from '../../../infrastructure/persistence/entities/bill.entity';
import { ECreditTransactionType } from '../../../infrastructure/persistence/entities/customer-credit-transaction.entity';
import { ECreditApprovalStatus } from '../../../infrastructure/persistence/entities/credit-approval-request.entity';
import { EUnpublishedMovementType } from '../../../infrastructure/persistence/entities/unpublished-stock-movement.entity';
import { ECommissionStatus } from '../../../infrastructure/persistence/entities/commission-payable.entity';

export class CreditLimitExceededError extends Error {
  constructor(public readonly approvalRequestId: string) {
    super('Sale exceeds customer credit limit — sent for approval');
  }
}

@Injectable()
export class BillCompletionService {
  constructor(
    @Inject(BILL_REPO) private readonly billRepo: IBillRepo,
    @Inject(BILL_ITEM_REPO) private readonly itemRepo: IBaseRepo<BillItem, string, PageableFilter<BillItem>, Filter<BillItem>>,
    @Inject(INVENTORY_REPO) private readonly inventoryRepo: IInventoryRepo,
    @Inject(CUSTOMER_REPO) private readonly customerRepo: ICustomerRepo,
    @Inject(UNPUBLISHED_STOCK_REPO) private readonly unpublishedStockRepo: IUnpublishedStockRepo,
    @Inject(UNPUBLISHED_STOCK_MOVEMENT_REPO) private readonly unpublishedMovementRepo: IUnpublishedStockMovementRepo,
    @Inject(CUSTOMER_CREDIT_TRANSACTION_REPO) private readonly creditTxnRepo: ICustomerCreditTransactionRepo,
    @Inject(CREDIT_APPROVAL_REQUEST_REPO) private readonly creditApprovalRepo: ICreditApprovalRequestRepo,
    @Inject(COMMISSION_PAYABLE_REPO) private readonly commissionRepo: ICommissionPayableRepo,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectPinoLogger(BillCompletionService.name) private readonly logger: PinoLogger,
  ) {}

  public async completeBill(billId: string, performedById: string, creditOverrideApproved = false): Promise<Bill> {
    const bill = await this.billRepo.getAsync(billId);
    if (!bill) throw new NotFoundException(`Bill ${billId} not found`);
    const items = await this.itemRepo.allAsync({ billId } as Filter<BillItem>);

    if (bill.saleType === ESaleType.Credit && !creditOverrideApproved) {
      await this.enforceCreditLimit(bill, performedById);
    }

    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      if (bill.saleType === ESaleType.Black) {
        await this.deductBlackStock(bill, items, performedById, runner.manager);
        await this.recordCommission(bill);
      } else {
        await this.deductOfficialStock(bill, items, runner.manager);
      }
      if (bill.saleType === ESaleType.Credit) {
        await this.applyCredit(bill, performedById);
      }
      await runner.commitTransaction();
    } catch (err) {
      await runner.rollbackTransaction();
      throw err;
    } finally {
      await runner.release();
    }

    bill.billedAt = new Date();
    bill.status = 'COMPLETED' as Bill['status'];
    return this.billRepo.updateAsync(bill);
  }

  private async enforceCreditLimit(bill: Bill, requestedById: string): Promise<void> {
    if (!bill.customerId) throw new BadRequestException('Credit sale requires a customer');
    const customer = await this.customerRepo.getAsync(bill.customerId);
    if (!customer.creditLimit) throw new BadRequestException('Customer has no credit limit set');
    const wouldBeBalance = Number(customer.creditBalance) + Number(bill.totalAmount);
    if (wouldBeBalance > Number(customer.creditLimit)) {
      const approval = await this.creditApprovalRepo.createAsync({
        organizationId: bill.organizationId,
        customerId: bill.customerId,
        billId: bill.id,
        requestedAmount: bill.totalAmount,
        requestedById,
        status: ECreditApprovalStatus.Pending,
      } as never);
      throw new CreditLimitExceededError(approval.id);
    }
  }

  private async applyCredit(bill: Bill, performedById: string): Promise<void> {
    const customer = await this.customerRepo.getAsync(bill.customerId as string);
    const before = Number(customer.creditBalance);
    const after  = before + Number(bill.totalAmount);
    customer.creditBalance = after;
    await this.customerRepo.updateAsync(customer);
    await this.creditTxnRepo.createAsync({
      customerId: customer.id, billId: bill.id, type: ECreditTransactionType.CreditSale,
      amount: bill.totalAmount, balanceBefore: before, balanceAfter: after, performedById,
    } as never);
  }

  private async deductOfficialStock(bill: Bill, items: BillItem[], manager: import('typeorm').EntityManager): Promise<void> {
    for (const item of items) {
      const inv = await this.inventoryRepo.findByOrgLocationProductAsync(bill.organizationId, bill.locationId, item.productId, manager);
      if (!inv) throw new BadRequestException(`No inventory found for product ${item.productId} at this location`);
      await this.inventoryRepo.deductStockAsync(inv.id, Number(item.quantity), manager);
    }
  }

  private async deductBlackStock(bill: Bill, items: BillItem[], performedById: string, manager: import('typeorm').EntityManager): Promise<void> {
    for (const item of items) {
      const unp = await this.unpublishedStockRepo.findByOrgLocationProductAsync(bill.organizationId, bill.locationId, item.productId, manager);
      if (!unp) throw new BadRequestException(`No black stock for product ${item.productId} at this location — add black stock first`);
      const before = Number(unp.quantityOnHand);
      const updated = await this.unpublishedStockRepo.deductStockAsync(unp.id, Number(item.quantity), manager);
      await this.unpublishedMovementRepo.createAsync({
        unpublishedStockId: unp.id, locationId: bill.locationId, productId: item.productId,
        performedById, movementType: EUnpublishedMovementType.Sold,
        quantity: item.quantity, quantityBefore: before, quantityAfter: updated.quantityOnHand,
        notes: `Black sale ${bill.billNumber}`,
      } as never);
    }
  }

  private async recordCommission(bill: Bill): Promise<void> {
    if (!bill.facilitatorUserId && !bill.facilitatorName) return;
    if (!bill.commissionAmount) return;
    await this.commissionRepo.createAsync({
      organizationId: bill.organizationId, billId: bill.id,
      facilitatorUserId: bill.facilitatorUserId, facilitatorName: bill.facilitatorName,
      amount: bill.commissionAmount, status: ECommissionStatus.Owed,
    } as never);
  }
}
```

Register in `core-apis/src/application/shared/shared.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ProductActivityLogger } from './services/product-activity-logger.service';
import { StockOrchestrationService } from './services/stock-orchestration.service';
import { BillCompletionService } from './services/bill-completion.service';

@Module({
  providers: [ProductActivityLogger, StockOrchestrationService, BillCompletionService],
  exports:   [ProductActivityLogger, StockOrchestrationService, BillCompletionService],
})
export class SharedModule {}
```

Note: `IInventoryRepo` must already expose `findByOrgLocationProductAsync` (used by `publishStock` in the existing `StockOrchestrationService` — confirmed present) and `IUnpublishedStockMovementRepo` must expose `createAsync` (standard `IBaseRepo` method). `IBillRepo`'s `Bill.status` type — check `bill.model.ts`'s current type for `status` (likely `string` or `EBillStatus`) and use exactly that type for the `bill.status = 'COMPLETED' as Bill['status'];` line; if it's typed as `EBillStatus`, import that enum instead of the string-literal cast.

- [ ] **Step 4: Run to verify it passes**

Run: `cd core-apis && npx jest bill-completion.service.spec.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Build check**

Run: `cd core-apis && npm run build`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
cd core-apis
git add src/application/shared/services/bill-completion.service.ts src/application/shared/services/bill-completion.service.spec.ts src/application/shared/shared.module.ts
git commit -m "feat: add BillCompletionService — black/credit-aware bill completion"
```

---

### Task 7: Wire `BillCompletionService` into bill transition + credit approval endpoints

**Files:**
- Modify: `core-apis/src/application/modules/bills/commands/transition-bill-status/transition-bill-status.command-handler.ts`
- Modify: `core-apis/src/application/modules/bills/commands/transition-bill-status/transition-bill-status.command.ts`
- Modify: `core-apis/src/application/modules/bills/bills.controller.ts`
- Modify: `core-apis/src/application/modules/bills/bills.module.ts`
- Create: `core-apis/src/application/modules/credit-approvals/commands/approve-credit-approval/approve-credit-approval.command.ts`
- Create: `core-apis/src/application/modules/credit-approvals/commands/approve-credit-approval/approve-credit-approval.command-handler.ts`
- Create: `core-apis/src/application/modules/credit-approvals/commands/approve-credit-approval/index.ts`
- Create: `core-apis/src/application/modules/credit-approvals/commands/reject-credit-approval/reject-credit-approval.command.ts`
- Create: `core-apis/src/application/modules/credit-approvals/commands/reject-credit-approval/reject-credit-approval.command-handler.ts`
- Create: `core-apis/src/application/modules/credit-approvals/commands/reject-credit-approval/index.ts`
- Create: `core-apis/src/application/modules/credit-approvals/commands/index.ts`
- Create: `core-apis/src/application/modules/credit-approvals/queries/list-pending-credit-approvals/list-pending-credit-approvals.query.ts`
- Create: `core-apis/src/application/modules/credit-approvals/queries/list-pending-credit-approvals/list-pending-credit-approvals.query-handler.ts`
- Create: `core-apis/src/application/modules/credit-approvals/queries/list-pending-credit-approvals/index.ts`
- Create: `core-apis/src/application/modules/credit-approvals/queries/index.ts`
- Create: `core-apis/src/application/modules/credit-approvals/models/responses/credit-approval-request.response.ts`
- Create: `core-apis/src/application/modules/credit-approvals/models/responses/index.ts`
- Create: `core-apis/src/application/modules/credit-approvals/models/index.ts`
- Create: `core-apis/src/application/modules/credit-approvals/mapper/credit-approval.profile.ts`
- Create: `core-apis/src/application/modules/credit-approvals/mapper/index.ts`
- Create: `core-apis/src/application/modules/credit-approvals/credit-approvals.controller.ts`
- Create: `core-apis/src/application/modules/credit-approvals/credit-approvals.module.ts`
- Modify: `core-apis/src/app.module.ts` (or wherever feature modules are imported — check `bills.module.ts`'s importer)
- Test: `core-apis/src/application/modules/bills/commands/transition-bill-status/transition-bill-status.command-handler.spec.ts`

**Interfaces:**
- Produces: `POST /api/v1/credit-approvals/:id/approve`, `POST /api/v1/credit-approvals/:id/reject`, `GET /api/v1/credit-approvals?status=pending` — all `@Roles(ERole.OrgAdmin, ERole.OrgManager, ERole.SuperAdmin)`.

- [ ] **Step 1: Write the failing test for the transition handler**

Create `core-apis/src/application/modules/bills/commands/transition-bill-status/transition-bill-status.command-handler.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { TransitionBillStatusCommandHandler } from './transition-bill-status.command-handler';
import { TransitionBillStatusCommand } from './transition-bill-status.command';
import { BILL_REPO } from '../../../../constants';
import { BillCompletionService, CreditLimitExceededError } from '../../../../shared/services/bill-completion.service';
import { EBillStatus } from '../../../../../infrastructure/persistence/entities/bill.entity';

describe('TransitionBillStatusCommandHandler', () => {
  const billRepo = { getAsync: jest.fn(), updateAsync: jest.fn((b) => b) };
  const completionService = { completeBill: jest.fn() };
  let handler: TransitionBillStatusCommandHandler;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        TransitionBillStatusCommandHandler,
        { provide: BILL_REPO, useValue: billRepo },
        { provide: BillCompletionService, useValue: completionService },
        { provide: getLoggerToken(TransitionBillStatusCommandHandler.name), useValue: { info: jest.fn() } },
      ],
    }).compile();
    handler = module.get(TransitionBillStatusCommandHandler);
  });

  function command(status: EBillStatus): TransitionBillStatusCommand {
    const c = new TransitionBillStatusCommand();
    c.billId = 'bill-1';
    c.status = status;
    c.performedById = 'user-1';
    return c;
  }

  it('delegates to BillCompletionService.completeBill on COMPLETED', async () => {
    billRepo.getAsync.mockResolvedValue({ id: 'bill-1', status: EBillStatus.DRAFT });
    completionService.completeBill.mockResolvedValue({ id: 'bill-1', status: EBillStatus.COMPLETED });

    await handler.execute(command(EBillStatus.COMPLETED));

    expect(completionService.completeBill).toHaveBeenCalledWith('bill-1', 'user-1', false);
  });

  it('propagates CreditLimitExceededError without marking the bill completed', async () => {
    billRepo.getAsync.mockResolvedValue({ id: 'bill-1', status: EBillStatus.DRAFT });
    completionService.completeBill.mockRejectedValue(new CreditLimitExceededError('approval-1'));

    await expect(handler.execute(command(EBillStatus.COMPLETED))).rejects.toBeInstanceOf(CreditLimitExceededError);
    expect(billRepo.updateAsync).not.toHaveBeenCalled();
  });

  it('still handles DRAFT/CANCELLED transitions without touching BillCompletionService', async () => {
    billRepo.getAsync.mockResolvedValue({ id: 'bill-1', status: EBillStatus.INITIATED });

    await handler.execute(command(EBillStatus.DRAFT));

    expect(completionService.completeBill).not.toHaveBeenCalled();
    expect(billRepo.updateAsync).toHaveBeenCalledWith(expect.objectContaining({ status: EBillStatus.DRAFT }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd core-apis && npx jest transition-bill-status.command-handler.spec.ts`
Expected: FAIL — handler doesn't inject `BillCompletionService` yet, `command.performedById` doesn't exist.

- [ ] **Step 3: Add `performedById` to the command/request, wire controller**

Edit `core-apis/src/application/modules/bills/commands/transition-bill-status/transition-bill-status.command.ts`:
```typescript
export class TransitionBillStatusCommand extends CommandBase {
  public billId: string;
  @AutoMap() public status: EBillStatus;
  @AutoMap() public paymentMethod?: EPaymentMethod;
  public performedById: string;
}
```

Edit `core-apis/src/application/modules/bills/bills.controller.ts`'s `transitionStatus()` — add `@CurrentUser() user?: AuthenticatedUser` param and set `command.performedById = user?.dbUserId ?? FALLBACK_USER_ID;` before `mediator.execute`.

- [ ] **Step 4: Rewrite the handler to delegate**

Edit `core-apis/src/application/modules/bills/commands/transition-bill-status/transition-bill-status.command-handler.ts`:

```typescript
import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict } from '../../../../../common';
import { BILL_REPO } from '../../../../constants';
import { Bill } from '../../domain';
import { IBillRepo } from '../../i-bill.repo';
import { EBillStatus } from '../../../../../infrastructure/persistence/entities/bill.entity';
import { BillCompletionService } from '../../../../shared/services/bill-completion.service';
import { TransitionBillStatusCommand } from './transition-bill-status.command';

const ALLOWED: Record<EBillStatus, EBillStatus[]> = {
  [EBillStatus.INITIATED]: [EBillStatus.DRAFT, EBillStatus.CANCELLED],
  [EBillStatus.DRAFT]:     [EBillStatus.COMPLETED, EBillStatus.CANCELLED],
  [EBillStatus.COMPLETED]: [],
  [EBillStatus.CANCELLED]: [],
};

@CommandHandlerStrict(TransitionBillStatusCommand)
export class TransitionBillStatusCommandHandler implements ICommandHandler<TransitionBillStatusCommand, Bill> {
  constructor(
    @Inject(BILL_REPO) private readonly billRepo: IBillRepo,
    private readonly completionService: BillCompletionService,
    @InjectPinoLogger(TransitionBillStatusCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: TransitionBillStatusCommand): Promise<Bill> {
    this.logger.info(`Executing ${TransitionBillStatusCommand.name} billId=${command.billId} → ${command.status}`);
    const bill = await this.billRepo.getAsync(command.billId);
    if (!bill) throw new NotFoundException(`Bill ${command.billId} not found`);

    if (!ALLOWED[bill.status]?.includes(command.status)) {
      throw new BadRequestException(`Cannot transition bill from ${bill.status} to ${command.status}`);
    }

    if (command.status === EBillStatus.COMPLETED) {
      return this.completionService.completeBill(bill.id, command.performedById, false);
    }

    bill.status = command.status;
    if (command.paymentMethod) bill.paymentMethod = command.paymentMethod;
    return this.billRepo.updateAsync(bill);
  }
}
```

Edit `core-apis/src/application/modules/bills/bills.module.ts` — import `SharedModule` (matching the `unpublished-stock.module.ts` precedent from Task 5/earlier) so `BillCompletionService` resolves:
```typescript
imports: [CqrsModule, SharedModule],
```
(add `import { SharedModule } from 'src/application/shared';`)

- [ ] **Step 5: Run to verify it passes**

Run: `cd core-apis && npx jest transition-bill-status.command-handler.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Credit-approval commands, query, controller, module**

Create `core-apis/src/application/modules/credit-approvals/commands/approve-credit-approval/approve-credit-approval.command.ts`:
```typescript
import { CommandBase } from '../../../../../common';

export class ApproveCreditApprovalCommand extends CommandBase {
  public id: string;
  public decidedById: string;
}
```

Create `.../approve-credit-approval.command-handler.ts`:
```typescript
import { Inject, NotFoundException } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict } from '../../../../../common';
import { CREDIT_APPROVAL_REQUEST_REPO } from '../../i-credit-approval-request.repo';
import { ICreditApprovalRequestRepo, CreditApprovalRequest } from '../..';
import { ECreditApprovalStatus } from '../../../../../infrastructure/persistence/entities/credit-approval-request.entity';
import { BillCompletionService } from '../../../../shared/services/bill-completion.service';
import { ApproveCreditApprovalCommand } from './approve-credit-approval.command';

@CommandHandlerStrict(ApproveCreditApprovalCommand)
export class ApproveCreditApprovalCommandHandler implements ICommandHandler<ApproveCreditApprovalCommand, CreditApprovalRequest> {
  constructor(
    @Inject(CREDIT_APPROVAL_REQUEST_REPO) private readonly repo: ICreditApprovalRequestRepo,
    private readonly completionService: BillCompletionService,
    @InjectPinoLogger(ApproveCreditApprovalCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: ApproveCreditApprovalCommand): Promise<CreditApprovalRequest> {
    this.logger.info(`Executing ${ApproveCreditApprovalCommand.name} id=${command.id}`);
    const request = await this.repo.getAsync(command.id);
    if (!request) throw new NotFoundException(`CreditApprovalRequest ${command.id} not found`);

    await this.completionService.completeBill(request.billId, command.decidedById, true);

    request.status = ECreditApprovalStatus.Approved;
    request.decidedById = command.decidedById;
    request.decidedAt = new Date();
    return this.repo.updateAsync(request);
  }
}
```

Create the mirror `reject-credit-approval` command/handler (no `BillCompletionService` call — just sets `status = ECreditApprovalStatus.Rejected`, `decidedById`, `decidedAt`; the bill stays in `DRAFT`).

Create `commands/index.ts` exporting both plus a `CreditApprovalCommandHandlers` array (matching the `BillCommandHandlers` barrel pattern seen in `bills/commands/index.ts` — read that file for the exact export shape and mirror it).

Create `queries/list-pending-credit-approvals/list-pending-credit-approvals.query.ts` + handler (mirrors `ListStockTransfersQuery`/handler style from the stock-transfer-redesign plan): takes `organizationId`, calls `this.repo.allAsync({ organizationId, status: ECreditApprovalStatus.Pending } as Filter<CreditApprovalRequest>)`.

Create `models/responses/credit-approval-request.response.ts` (fields mirroring the domain model, `@ApiProperty`/`@AutoMap()` per the established convention) and `mapper/credit-approval.profile.ts` (`createMap` entity↔domain↔response, following `bill.profile.ts`'s structure).

Create `credit-approvals.controller.ts`:
```typescript
import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ClerkAuthGuard, RolesGuard, Roles, CqrsMediator, CurrentUser, AuthenticatedUser } from 'src/common';
import { ERole } from 'src/infrastructure/persistence/entities/role.entity';
import { ApproveCreditApprovalCommand } from './commands/approve-credit-approval';
import { RejectCreditApprovalCommand } from './commands/reject-credit-approval';
import { ListPendingCreditApprovalsQuery } from './queries/list-pending-credit-approvals';
import { CreditApprovalRequest } from './domain';
import { CreditApprovalRequestResponse } from './models';

@ApiBearerAuth()
@ApiTags('Credit Approvals')
@Controller({ path: 'credit-approvals', version: '1' })
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(ERole.OrgAdmin, ERole.OrgManager, ERole.SuperAdmin)
export class CreditApprovalsController {
  constructor(
    protected readonly mediator: CqrsMediator,
    @InjectMapper() protected readonly mapper: Mapper,
    @InjectPinoLogger(CreditApprovalsController.name) protected readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'List pending credit approval requests' })
  @ApiOkResponse({ type: [CreditApprovalRequestResponse] })
  @HttpCode(HttpStatus.OK)
  @Get()
  public async listPending(@CurrentUser() user: AuthenticatedUser): Promise<CreditApprovalRequestResponse[]> {
    const query = new ListPendingCreditApprovalsQuery();
    query.organizationId = user.organizationId;
    const result = await this.mediator.execute<ListPendingCreditApprovalsQuery, CreditApprovalRequest[]>(query);
    return this.mapper.mapArray(result, CreditApprovalRequest, CreditApprovalRequestResponse);
  }

  @ApiOperation({ summary: 'Approve a credit approval request — completes the underlying bill' })
  @ApiOkResponse({ type: CreditApprovalRequestResponse })
  @HttpCode(HttpStatus.OK)
  @Post(':id/approve')
  public async approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<CreditApprovalRequestResponse> {
    const command = new ApproveCreditApprovalCommand();
    command.id = id;
    command.decidedById = user.dbUserId;
    const result = await this.mediator.execute<ApproveCreditApprovalCommand, CreditApprovalRequest>(command);
    return this.mapper.map(result, CreditApprovalRequest, CreditApprovalRequestResponse);
  }

  @ApiOperation({ summary: 'Reject a credit approval request — bill stays in DRAFT' })
  @ApiOkResponse({ type: CreditApprovalRequestResponse })
  @HttpCode(HttpStatus.OK)
  @Post(':id/reject')
  public async reject(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<CreditApprovalRequestResponse> {
    const command = new RejectCreditApprovalCommand();
    command.id = id;
    command.decidedById = user.dbUserId;
    const result = await this.mediator.execute<RejectCreditApprovalCommand, CreditApprovalRequest>(command);
    return this.mapper.map(result, CreditApprovalRequest, CreditApprovalRequestResponse);
  }
}
```

Create `credit-approvals.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SharedModule } from 'src/application/shared';
import { CreditApprovalsController } from './credit-approvals.controller';
import { CreditApprovalCommandHandlers } from './commands';
import { CreditApprovalQueryHandlers } from './queries';
import { CreditApprovalProfile } from './mapper';

@Module({
  imports:     [CqrsModule, SharedModule],
  controllers: [CreditApprovalsController],
  providers:   [...CreditApprovalCommandHandlers, ...CreditApprovalQueryHandlers, CreditApprovalProfile],
})
export class CreditApprovalsModule {}
```

Register `CreditApprovalsModule` wherever `BillsModule` is imported (check `core-apis/src/app.module.ts` or a feature-aggregator module — read it first, add the import in the same list).

- [ ] **Step 7: Build check**

Run: `cd core-apis && npm run build`
Expected: no errors

- [ ] **Step 8: Manual verification**

Run: `npm run start:dev`. Using a tool like Postman/curl with a valid bearer token:
1. Create a customer with `creditLimit: 100`.
2. Create + complete a normal bill for that customer under $100 with `saleType: credit` — expect 200, and `GET /customers/:id` shows `creditBalance` risen by the bill total.
3. Create + attempt to complete a second credit bill that would push the balance over 100 — expect the transition call to fail with the `CreditLimitExceededError` message, and `GET /credit-approvals` (as an OrgAdmin token) shows a pending row.
4. `POST /credit-approvals/:id/approve` — expect 200, bill now `COMPLETED`, customer balance updated.

- [ ] **Step 9: Commit**

```bash
cd core-apis
git add src/application/modules/bills/ src/application/modules/credit-approvals/ src/app.module.ts
git commit -m "feat: wire BillCompletionService into bill transition + add credit-approvals endpoints"
```

---

### Task 8: Black-sale creation role gate + black-amount computation

**Files:**
- Modify: `core-apis/src/application/modules/bills/commands/create-bill/create-bill.command-handler.ts`
- Test: `core-apis/src/application/modules/bills/commands/create-bill/create-bill.command-handler.spec.ts`

**Interfaces:**
- Consumes: `command.saleType`, `command.performedByRoles`, `command.commissionPct` (Task 2).
- Produces: `Bill.blackAmount`, `Bill.commissionAmount` computed and persisted on create when `saleType = black`.

- [ ] **Step 1: Write the failing test**

Create `core-apis/src/application/modules/bills/commands/create-bill/create-bill.command-handler.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { Mapper } from '@automapper/core';
import { ForbiddenException } from '@nestjs/common';
import { CreateBillCommandHandler } from './create-bill.command-handler';
import { CreateBillCommand } from './create-bill.command';
import { BILL_REPO, BILL_ITEM_REPO, PRODUCT_REPO } from '../../../../constants';
import { ESaleType } from '../../../../../infrastructure/persistence/entities/bill.entity';
import { ERole } from '../../../../../infrastructure/persistence/entities/role.entity';

describe('CreateBillCommandHandler — black sale authorization + math', () => {
  const billRepo = { createAsync: jest.fn(), updateAsync: jest.fn((b) => b), countForDateAsync: jest.fn().mockResolvedValue(0) };
  const itemRepo = { createAsync: jest.fn((i) => i) };
  const productRepo = { getAsync: jest.fn() };
  const mapper = { map: jest.fn((cmd) => ({ ...cmd })) } as unknown as Mapper;
  let handler: CreateBillCommandHandler;

  beforeEach(async () => {
    jest.clearAllMocks();
    billRepo.createAsync.mockImplementation((b) => ({ id: 'bill-1', ...b }));
    const module = await Test.createTestingModule({
      providers: [
        CreateBillCommandHandler,
        { provide: BILL_REPO, useValue: billRepo },
        { provide: BILL_ITEM_REPO, useValue: itemRepo },
        { provide: PRODUCT_REPO, useValue: productRepo },
        { provide: 'automapper:nestjs:default', useValue: mapper },
        { provide: getLoggerToken(CreateBillCommandHandler.name), useValue: { info: jest.fn() } },
      ],
    }).compile();
    handler = module.get(CreateBillCommandHandler);
  });

  function command(overrides: Partial<CreateBillCommand> = {}): CreateBillCommand {
    const c = new CreateBillCommand();
    c.organizationId = 'org-1';
    c.locationId = 'loc-1';
    c.walkInName = 'Walk-in';
    c.saleType = ESaleType.Black;
    c.performedByRoles = [ERole.OrgAdmin];
    c.items = [{ productId: 'prod-1', quantity: 2, unitPrice: 150 } as never];
    return Object.assign(c, overrides);
  }

  it('rejects black-sale creation from a Store Staff role', async () => {
    const cmd = command({ performedByRoles: [ERole.StoreStaff] });
    await expect(handler.execute(cmd)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows black-sale creation for OrgAdmin and computes blackAmount from official price', async () => {
    productRepo.getAsync.mockResolvedValue({ id: 'prod-1', retailPrice: 100 });
    const result = await handler.execute(command());
    expect(result.blackAmount).toBe(100); // (150-100) * 2
  });

  it('computes commissionAmount from commissionPct of the black markup', async () => {
    productRepo.getAsync.mockResolvedValue({ id: 'prod-1', retailPrice: 100 });
    const result = await handler.execute(command({ commissionPct: 30 }));
    expect(result.commissionAmount).toBe(30); // 30% of 100
  });

  it('leaves blackAmount/commissionAmount at 0 for a normal sale', async () => {
    const result = await handler.execute(command({ saleType: ESaleType.Normal, performedByRoles: [ERole.StoreStaff] }));
    expect(result.blackAmount).toBe(0);
    expect(result.commissionAmount).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd core-apis && npx jest create-bill.command-handler.spec.ts`
Expected: FAIL — no role check, no black-amount computation, `PRODUCT_REPO` not injected.

- [ ] **Step 3: Implement**

Edit `core-apis/src/application/modules/bills/commands/create-bill/create-bill.command-handler.ts`:

```typescript
import { BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict } from '../../../../../common';
import { BILL_ITEM_REPO, BILL_REPO, PRODUCT_REPO } from '../../../../constants';
import { Bill, BillItem } from '../../domain';
import { IBillRepo } from '../../i-bill.repo';
import { IProductRepo } from '../../../products';
import { IBaseRepo, Filter, PageableFilter } from '../../../../../common';
import { EBillStatus, ESaleType } from '../../../../../infrastructure/persistence/entities/bill.entity';
import { ERole } from '../../../../../infrastructure/persistence/entities/role.entity';
import { CreateBillCommand } from './create-bill.command';

const BLACK_SALE_ROLES = new Set([ERole.OrgAdmin, ERole.OrgManager, ERole.SuperAdmin]);

@CommandHandlerStrict(CreateBillCommand)
export class CreateBillCommandHandler implements ICommandHandler<CreateBillCommand, Bill> {
  constructor(
    @Inject(BILL_REPO) private readonly billRepo: IBillRepo,
    @Inject(BILL_ITEM_REPO) private readonly itemRepo: IBaseRepo<BillItem, string, PageableFilter<BillItem>, Filter<BillItem>>,
    @Inject(PRODUCT_REPO) private readonly productRepo: IProductRepo,
    @InjectMapper() private readonly mapper: Mapper,
    @InjectPinoLogger(CreateBillCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: CreateBillCommand): Promise<Bill> {
    this.logger.info(`Executing ${CreateBillCommand.name}`);

    if (!command.customerId && !command.walkInName) {
      throw new BadRequestException('walkInName is required when customerId is not provided');
    }

    const saleType = command.saleType ?? ESaleType.Normal;
    if (saleType === ESaleType.Black && !command.performedByRoles.some((r) => BLACK_SALE_ROLES.has(r))) {
      throw new ForbiddenException('Only Org Admin/Org Manager can create a black sale');
    }

    const bill          = this.mapper.map(command, CreateBillCommand, Bill);
    bill.saleType        = saleType;
    bill.status          = EBillStatus.INITIATED;
    bill.billNumber      = await this.generateBillNumber();
    bill.subtotal        = 0;
    bill.taxAmount       = 0;
    bill.discountAmount  = 0;
    bill.totalAmount     = 0;
    bill.blackAmount      = 0;
    bill.commissionAmount = 0;

    const saved = await this.billRepo.createAsync(bill);

    let blackAmount = 0;
    const items: BillItem[] = [];
    for (const req of command.items ?? []) {
      const taxRate     = Number(req.taxRate ?? 0);
      const discountAmt = Number(req.discountAmount ?? 0);
      const taxAmount   = (Number(req.quantity) * Number(req.unitPrice) * taxRate) / 100;
      const lineTotal   = Number(req.quantity) * Number(req.unitPrice) + taxAmount - discountAmt;
      const item          = new BillItem();
      item.billId          = saved.id;
      item.productId       = req.productId;
      item.variantId       = req.variantId;
      item.quantity        = Number(req.quantity);
      item.unitPrice       = Number(req.unitPrice);
      item.taxRate         = taxRate;
      item.taxAmount       = taxAmount;
      item.discountAmount  = discountAmt;
      item.lineTotal       = lineTotal;
      items.push(item);

      if (saleType === ESaleType.Black) {
        const product = await this.productRepo.getAsync(req.productId);
        const officialPrice = Number(product.retailPrice ?? 0);
        blackAmount += (Number(req.unitPrice) - officialPrice) * Number(req.quantity);
      }
    }

    const savedItems: BillItem[] = [];
    for (const item of items) {
      savedItems.push(await this.itemRepo.createAsync(item));
    }

    saved.subtotal    = savedItems.reduce((s, it) => s + Number(it.quantity) * Number(it.unitPrice), 0);
    saved.taxAmount   = savedItems.reduce((s, it) => s + Number(it.taxAmount), 0);
    saved.totalAmount = saved.subtotal + saved.taxAmount - Number(saved.discountAmount);
    saved.items       = savedItems;

    if (saleType === ESaleType.Black) {
      saved.blackAmount = blackAmount;
      if ((command.facilitatorUserId || command.facilitatorName) && command.commissionPct) {
        saved.commissionAmount = (blackAmount * command.commissionPct) / 100;
      }
    }

    return this.billRepo.updateAsync(saved);
  }

  private async generateBillNumber(): Promise<string> {
    const now      = new Date();
    const dateStr  = now.toISOString().slice(0, 10).replace(/-/g, '');
    const count    = await this.billRepo.countForDateAsync(now);
    return `BILL-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
}
```

Check `IProductRepo`'s export path (likely `../../../products` from this file's depth — grep `export.*IProductRepo` if the import path above doesn't resolve) and confirm `ProductEntity`/domain `Product.retailPrice` is the exact field name (confirmed earlier via `POSTerminal.tsx`'s `productRate()` helper — `p.retailPrice`).

- [ ] **Step 4: Run to verify it passes**

Run: `cd core-apis && npx jest create-bill.command-handler.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Build check**

Run: `cd core-apis && npm run build`

- [ ] **Step 6: Commit**

```bash
cd core-apis
git add src/application/modules/bills/commands/create-bill/
git commit -m "feat: gate black-sale creation to OrgAdmin/OrgManager, compute black/commission amounts"
```

---

### Task 9: `UnpublishedStock` role/location-scope tightening

**Files:**
- Modify: `core-apis/src/application/modules/unpublished-stock/unpublished-stock.controller.ts`
- Modify: `core-apis/src/application/modules/unpublished-stock/queries/list-unpublished-stock/list-unpublished-stock.query.ts`
- Modify: `core-apis/src/application/modules/unpublished-stock/queries/list-unpublished-stock/list-unpublished-stock.query-handler.ts`
- Test: `core-apis/src/application/modules/unpublished-stock/queries/list-unpublished-stock/list-unpublished-stock.query-handler.spec.ts`

**Interfaces:**
- Consumes: `AuthenticatedUser.roles`, a location-scoping concept — Store Manager/Staff need their assigned location(s); check how `AuthenticatedUser` or `org-member`/`store-member` associates a user with a location before implementing (grep `locationId` on `AuthenticatedUser` or a `StoreMember`-equivalent lookup — the codebase's `OrgMemberEntity` seen earlier in memory notes had a `status` column but no confirmed `locationId`; **do not guess this** — read `core-apis/src/common/auth/types/authenticated-user.ts` in full and `org-member.entity.ts` in full as the first step of this task, before writing the query-handler change, to find the real mechanism a Store Manager/Staff's location is resolved by elsewhere in the codebase (e.g. how `POSTerminal.tsx`'s location picker or an existing Store-scoped endpoint restricts by location) and mirror that exact mechanism).

- [ ] **Step 1: Investigate the location-scoping mechanism**

Read `core-apis/src/common/auth/types/authenticated-user.ts` in full. Read `core-apis/src/infrastructure/persistence/entities/org-member.entity.ts` in full. Grep the codebase for any existing endpoint that already restricts data by a Store Manager/Staff's assigned location (search for `locationId` near `ERole.StoreManager` or `ERole.StoreStaff`). Record what you find — if no such mechanism exists anywhere yet, this task's location-scoping half is not currently buildable without first adding a location-assignment concept to users, which is out of scope for this plan. In that case, implement only the role widening (Step 2 below — allow `StoreManager`/`StoreStaff` to call these endpoints at all, which they already could not before only in the sense that Task 1 didn't change their existing access — re-read the original controller from the design-phase exploration: **`StoreManager`/`StoreStaff` already had `list`/`add` access before this plan** (see `docs/superpowers/specs/2026-08-07-sales-v2-credit-black-design.md`'s "Background" section) — so location-scoping is the only real gap versus today, and it's genuinely blocked if the lookup mechanism doesn't exist. Flag this finding rather than guessing at a fake scoping filter.

- [ ] **Step 2: Add `OrgManager` to the role lists**

Edit `core-apis/src/application/modules/unpublished-stock/unpublished-stock.controller.ts` — update every `@Roles(...)` decorator to include `ERole.OrgManager` alongside `ERole.OrgAdmin`:
```typescript
@Roles(ERole.OrgAdmin, ERole.OrgManager, ERole.SuperAdmin, ERole.StoreManager, ERole.StoreStaff)
```
(class-level, for `list`/`getById`/`listMovements`), and:
```typescript
@Roles(ERole.OrgAdmin, ERole.OrgManager, ERole.SuperAdmin, ERole.StoreManager)
```
(on `addStock`), and:
```typescript
@Roles(ERole.OrgAdmin, ERole.OrgManager, ERole.SuperAdmin, ERole.StoreManager)
```
(on `publishStock`).

- [ ] **Step 3: Location-scoping, if Step 1 found a mechanism**

If Step 1 located a real per-user location mechanism, write a failing spec for `ListUnpublishedStockQueryHandler` asserting that a query with a `StoreStaff`/`StoreManager` caller's role+location is filtered to that location, using whatever field Step 1 found — implement it, run to pass, following the same TDD steps as prior tasks. If Step 1 found no such mechanism, skip this step and note the gap in the Task 9 commit message instead.

- [ ] **Step 4: Build check**

Run: `cd core-apis && npm run build`

- [ ] **Step 5: Commit**

```bash
cd core-apis
git add src/application/modules/unpublished-stock/
git commit -m "feat: allow OrgManager on black-stock endpoints$(test -f src/application/modules/unpublished-stock/queries/list-unpublished-stock/list-unpublished-stock.query-handler.spec.ts && echo ', scope Store roles to their own location')"
```

---

### Task 10: Black ledger read endpoint + mark-commission-paid

**Files:**
- Create: `core-apis/src/application/modules/credit-approvals/queries/get-black-ledger/get-black-ledger.query.ts`
- Create: `core-apis/src/application/modules/credit-approvals/queries/get-black-ledger/get-black-ledger.query-handler.ts`
- Create: `core-apis/src/application/modules/credit-approvals/queries/get-black-ledger/index.ts`
- Create: `core-apis/src/application/modules/credit-approvals/commands/mark-commission-paid/mark-commission-paid.command.ts`
- Create: `core-apis/src/application/modules/credit-approvals/commands/mark-commission-paid/mark-commission-paid.command-handler.ts`
- Create: `core-apis/src/application/modules/credit-approvals/commands/mark-commission-paid/index.ts`
- Modify: `core-apis/src/application/modules/credit-approvals/credit-approvals.controller.ts`
- Modify: `core-apis/src/application/modules/credit-approvals/commands/index.ts`, `queries/index.ts`

**Interfaces:**
- Produces: `GET /api/v1/credit-approvals/black-ledger` → `{ bills: BillResponse[] (saleType=black), commissions: CommissionPayableResponse[] }`, `POST /api/v1/commission-payables/:id/mark-paid` — both `@Roles(OrgAdmin, OrgManager, SuperAdmin)`.

- [ ] **Step 1: `GetBlackLedgerQuery`**

Create the query/handler pair: query takes `organizationId`; handler calls `BILL_REPO.allAsync({ organizationId, saleType: ESaleType.Black } as Filter<Bill>)` and `COMMISSION_PAYABLE_REPO.allAsync({ organizationId } as Filter<CommissionPayable>)`, returns `{ bills, commissions }`. Follow the exact `QueryHandlerStrict` + `@Inject(TOKEN)` pattern from `list-pending-credit-approvals` (Task 7).

- [ ] **Step 2: `MarkCommissionPaidCommand`**

Command takes `id`. Handler: `getAsync(id)` → set `status = ECommissionStatus.Paid`, `paidAt = new Date()` → `updateAsync`. Same pattern as `approve-credit-approval`.

- [ ] **Step 3: Controller routes**

Add to `credit-approvals.controller.ts` (same file/class as Task 7, both endpoints already covered by the class-level `@Roles(OrgAdmin, OrgManager, SuperAdmin)`):
```typescript
  @ApiOperation({ summary: 'Black ledger — black bills and commission payables for the org' })
  @HttpCode(HttpStatus.OK)
  @Get('black-ledger')
  public async blackLedger(@CurrentUser() user: AuthenticatedUser) {
    const query = new GetBlackLedgerQuery();
    query.organizationId = user.organizationId;
    return this.mediator.execute<GetBlackLedgerQuery, { bills: Bill[]; commissions: CommissionPayable[] }>(query);
  }

  @ApiOperation({ summary: 'Mark a commission payable as paid' })
  @HttpCode(HttpStatus.OK)
  @Post('commissions/:id/mark-paid')
  public async markCommissionPaid(@Param('id') id: string) {
    const command = new MarkCommissionPaidCommand();
    command.id = id;
    return this.mediator.execute<MarkCommissionPaidCommand, CommissionPayable>(command);
  }
```
(Note this puts commission endpoints under `/credit-approvals/commissions/...` rather than a separate controller — acceptable since it's the same admin-only surface and avoids a one-route module; move to a dedicated `CommissionsController` later only if this area grows.)

Place `@Get('black-ledger')` before any `@Get(':id')`-shaped route if one exists in this controller (none currently does, per Task 7's version — safe either way).

- [ ] **Step 4: Build check**

Run: `cd core-apis && npm run build`

- [ ] **Step 5: Manual verification**

`npm run start:dev`, complete a black sale (Task 8/7's flow), then `GET /api/v1/credit-approvals/black-ledger` as an OrgAdmin token — expect the bill and its commission payable (if a facilitator was set) in the response. `POST /api/v1/credit-approvals/commissions/:id/mark-paid` — expect `status: paid`.

- [ ] **Step 6: Commit**

```bash
cd core-apis
git add src/application/modules/credit-approvals/
git commit -m "feat: add black ledger read endpoint and mark-commission-paid"
```

---

### Task 11: Frontend — `types.ts` + `api.ts` extensions

**Files:**
- Modify: `ERP-Client/renderer/src/types.ts`
- Modify: `ERP-Client/renderer/src/api.ts`

**Interfaces:**
- Produces: extended `Bill`, `Customer` types; `CreditApprovalRequest`, `CommissionPayable` types; `CreditApprovals` resource object with `useListPending()`, `useApprove()`, `useReject()`, `useBlackLedger()`, `useMarkCommissionPaid()` hooks — consumed by Tasks 12–14.

- [ ] **Step 1: Extend `Bill` and `Customer` types**

Edit `ERP-Client/renderer/src/types.ts`:

```typescript
export type SaleType = 'normal' | 'credit' | 'black';
export type CustomerType = 'regular' | 'new' | 'shop' | 'big_customer';
export type PaymentTiming = 'before_delivery' | 'after_delivery' | 'half' | 'cod';
```

Add to `Bill` (after `paymentMethod`):
```typescript
  saleType: SaleType | string;
  customerType?: CustomerType | string | null;
  paymentTiming?: PaymentTiming | string | null;
  partialAmount?: number | null;
  blackAmount: number;
  facilitatorUserId?: string | null;
  facilitatorName?: string | null;
  commissionAmount: number;
```

Add to `Customer` (after `gstin`):
```typescript
  creditLimit?: number | null;
  creditBalance?: number;
```

- [ ] **Step 2: New types for credit approvals + commissions**

Add after the `Customer` interface:
```typescript
export type CreditApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface CreditApprovalRequest {
  id: string;
  organizationId: string;
  customerId: string;
  billId: string;
  requestedAmount: number;
  requestedById: string;
  status: CreditApprovalStatus | string;
  decidedById?: string | null;
  decidedAt?: string | null;
  createdAt: string;
}

export type CommissionStatus = 'owed' | 'paid';

export interface CommissionPayable {
  id: string;
  organizationId: string;
  billId: string;
  facilitatorUserId?: string | null;
  facilitatorName?: string | null;
  amount: number;
  status: CommissionStatus | string;
  paidAt?: string | null;
  createdAt: string;
}
```

- [ ] **Step 3: `CreditApprovals` resource in `api.ts`**

Edit `ERP-Client/renderer/src/api.ts` — add near the `Bills`/`Customers` resource definitions:

```typescript
export const CreditApprovals = {
  useListPending() {
    return useQuery({
      queryKey: ['credit-approvals', 'pending'],
      queryFn: () => get<CreditApprovalRequest[]>('/api/v1/credit-approvals'),
    });
  },
  useApprove() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => post<CreditApprovalRequest>(`/api/v1/credit-approvals/${id}/approve`, {}),
      onSuccess: () => {
        toast.success('Credit sale approved');
        queryClient.invalidateQueries({ queryKey: ['credit-approvals'] });
        queryClient.invalidateQueries({ queryKey: ['bills'] });
        queryClient.invalidateQueries({ queryKey: ['customers'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to approve'),
    });
  },
  useReject() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => post<CreditApprovalRequest>(`/api/v1/credit-approvals/${id}/reject`, {}),
      onSuccess: () => {
        toast.success('Credit sale rejected');
        queryClient.invalidateQueries({ queryKey: ['credit-approvals'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to reject'),
    });
  },
  useBlackLedger() {
    return useQuery({
      queryKey: ['credit-approvals', 'black-ledger'],
      queryFn: () => get<{ bills: Bill[]; commissions: CommissionPayable[] }>('/api/v1/credit-approvals/black-ledger'),
    });
  },
  useMarkCommissionPaid() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => post<CommissionPayable>(`/api/v1/credit-approvals/commissions/${id}/mark-paid`, {}),
      onSuccess: () => {
        toast.success('Commission marked paid');
        queryClient.invalidateQueries({ queryKey: ['credit-approvals', 'black-ledger'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to mark paid'),
    });
  },
};
```

Add `CreditApprovalRequest, CommissionPayable` to the `import type { ... } from './types'` line at the top of `api.ts`. Confirm `get`/`post`/`useQuery`/`useMutation`/`useQueryClient`/`toast` are already imported in this file (they are, per existing `Bills`/`Customers` usage above) — no new imports needed beyond the types.

- [ ] **Step 4: Manual verification**

Run: `cd ERP-Client && npm run dev`. Open dev tools, confirm no TypeScript errors in the terminal output from `npm run dev:renderer` (Vite will surface type errors on save). No UI change yet — this task is API-surface only, consumed by later tasks.

- [ ] **Step 5: Commit**

```bash
cd ERP-Client
git add renderer/src/types.ts renderer/src/api.ts
git commit -m "feat: extend Bill/Customer types, add CreditApprovals resource hooks"
```

---

### Task 12: `POSTerminal.tsx` — sale type, customer type, credit display, payment timing, hold/draft

**Files:**
- Modify: `ERP-Client/renderer/src/pages/pos/POSTerminal.tsx`
- Modify: `ERP-Client/renderer/src/pages/pos/checkout.ts`
- Create: `ERP-Client/renderer/src/pages/pos/HeldSalesPanel.tsx`

**Interfaces:**
- Consumes: `SaleType`, `CustomerType`, `PaymentTiming` from `types.ts` (Task 11), `Bills.useTransitionStatus()` (existing).
- Produces: `SalesCheckoutInput` gains `saleType`, `customerType`, `paymentTiming`, `partialAmount` — consumed by Task 13's black-mode extension of the same input.

- [ ] **Step 1: Extend `checkout.ts`'s `SalesCheckoutInput` and wire the new fields into the bill create payload**

Edit `ERP-Client/renderer/src/pages/pos/checkout.ts` — add to `SalesCheckoutInput`:
```typescript
  saleType?: 'normal' | 'credit' | 'black';
  customerType?: 'regular' | 'new' | 'shop' | 'big_customer';
  paymentTiming?: 'before_delivery' | 'after_delivery' | 'half' | 'cod';
  partialAmount?: number;
```

In `runSalesCheckout`'s `post<Bill>('/api/v1/bills', { ... })` call, add to the payload object:
```typescript
        saleType: input.saleType,
        customerType: input.customerType,
        paymentTiming: input.paymentTiming,
        partialAmount: input.paymentTiming === 'half' ? input.partialAmount : undefined,
```

- [ ] **Step 2: Read the current role/auth surface in the renderer**

Before adding role-gating for the Black toggle, check how the renderer currently knows the logged-in user's role (grep `roles` or `useAuth`/`useCurrentUser` in `ERP-Client/renderer/src`) — if a hook already exposes `AuthenticatedUser.roles`, use it directly; if not, this step blocks on finding the right source and must not be guessed (e.g. don't assume a `useUser()` hook exists without confirming). Record the hook/selector found and use it in Step 3.

- [ ] **Step 3: Sale-type toggle + customer-type row + credit display**

In `POSTerminal.tsx`, add state near the existing `payMethod`/`customerId` state:
```typescript
  const [saleType, setSaleType] = useState<'normal' | 'credit' | 'black'>('normal');
  const [customerType, setCustomerType] = useState<'regular' | 'new' | 'shop' | 'big_customer'>('regular');
  const [paymentTiming, setPaymentTiming] = useState<'before_delivery' | 'after_delivery' | 'half' | 'cod'>('cod');
  const [partialAmount, setPartialAmount] = useState('');
```

Add a `canCreateBlackSale` boolean computed from Step 2's role source, e.g.:
```typescript
  const canCreateBlackSale = userRoles.some((r) => ['org_admin', 'org_manager', 'super_admin'].includes(r));
```

Add a `SaleTypeToggle` component (same visual pattern as the existing `ModeToggle` function above `POSTerminal`) rendered only when `mode === 'sales'`, with three buttons Normal/Credit/Black — the Black button only rendered when `canCreateBlackSale` is true. When `saleType !== 'normal'` and a `customerId` is selected, fetch that customer's full record (the existing `Customers.useSearch` result already includes it, or add `Customers.useById(customerId)` if the resource doesn't already expose one — check `createResource`'s generated hooks first) and render `Credit limit: {creditLimit} · Balance: {creditBalance}` near the customer block when `saleType === 'credit'`.

Add the customer-type row (four buttons Regular/New/Shop/Big Customer, single-select, same toggle visual style) below the customer fields, always visible in sales mode.

- [ ] **Step 4: Payment timing + half amount**

Add a payment-timing selector (four options) next to the existing cash/card payment method UI. When `paymentTiming === 'half'`, render a numeric input bound to `partialAmount`.

- [ ] **Step 5: Hold ("Rakhone") + Held Sales list**

Add a "Hold" button next to checkout that calls a new local function `holdSale()`:
```typescript
  const holdSale = async () => {
    // Reuses the same bill-create path as checkout, but stops after DRAFT — never calls the COMPLETED transition.
    ...
  };
```
Implement by extracting the "create bill → mark DRAFT" portion of `runSalesCheckout` (checkout.ts) into an exported helper `createDraftSale(input: SalesCheckoutInput): Promise<{ billId: string; steps: CheckoutStep[] }>` reused by both `runSalesCheckout` (which continues on to COMPLETED) and a new `holdSale` entry point that stops after DRAFT. Wire `holdSale` in `POSTerminal.tsx` to call this helper, show a toast confirming the hold, and clear the cart.

Create `ERP-Client/renderer/src/pages/pos/HeldSalesPanel.tsx` — a small panel/drawer listing `Bills.useSearch({ filters: { status: 'DRAFT', locationId } })`, each row showing customer/total/time, with a "Resume" button that re-populates `POSTerminal`'s cart state from the selected bill's items (fetch via `Bills.useById` if available, else the existing `get<Bill>('/api/v1/bills/:id')`) and clears the held-sale panel. Wire a toggle button in `POSTerminal.tsx`'s toolbar to open this panel.

- [ ] **Step 6: Pass new fields through checkout**

In `POSTerminal.tsx`'s existing checkout-trigger function (wherever `runSalesCheckout(...)` is currently called), add `saleType`, `customerType`, `paymentTiming`, `partialAmount: paymentTiming === 'half' ? Number(partialAmount) : undefined` to the input object.

- [ ] **Step 7: Manual verification**

Run: `cd ERP-Client && npm run dev`. In the running app:
1. Open POS, confirm Normal/Credit/Black toggle appears (Black only if logged in as an admin/manager role — verify with a non-admin session too, confirming Black is hidden).
2. Select a customer, switch to Credit — confirm credit limit/balance render.
3. Set payment timing to "Half" — confirm the partial-amount field appears and is required before checkout.
4. Click Hold — confirm the bill leaves the cart, appears in Held Sales, and Resume repopulates the cart correctly.
5. Complete a normal sale — confirm no regression versus current behavior (receipt, stock deduction).

- [ ] **Step 8: Commit**

```bash
cd ERP-Client
git add renderer/src/pages/pos/
git commit -m "feat: add sale-type/customer-type toggles, payment timing, hold/draft to POS"
```

---

### Task 13: `POSTerminal.tsx` — Black mode UI (charged price, facilitator, commission)

**Files:**
- Modify: `ERP-Client/renderer/src/pages/pos/POSTerminal.tsx`
- Modify: `ERP-Client/renderer/src/pages/pos/checkout.ts`

**Interfaces:**
- Consumes: Task 12's `saleType` state, `SalesCheckoutInput` (Task 12's extension).
- Produces: `SalesCheckoutInput` gains `facilitatorUserId?`, `facilitatorName?`, `commissionPct?` — sent through to `POST /api/v1/bills` (Task 8 reads these off the request body already).

- [ ] **Step 1: Extend `SalesCheckoutInput` and the create-bill payload**

Edit `checkout.ts` — add to `SalesCheckoutInput`:
```typescript
  facilitatorUserId?: string;
  facilitatorName?: string;
  commissionPct?: number;
```
Add to the `post<Bill>('/api/v1/bills', {...})` payload in `runSalesCheckout`:
```typescript
        facilitatorUserId: input.facilitatorUserId,
        facilitatorName: input.facilitatorName,
        commissionPct: input.commissionPct,
```

- [ ] **Step 2: Charged-price override per line when in Black mode**

`POSTerminal.tsx` already has `overrideLine`/`overridePrice` state for a per-line price override (used today for discounts/manual pricing — read the existing override UI to confirm). When `saleType === 'black'`, reuse this same override mechanism as the "charged price" entry point — no new per-line UI needed, just relabel the override affordance (e.g. tooltip/placeholder text) to "Charged price" when in Black mode, since the backend (Task 8) already computes `blackAmount` from `unitPrice` vs. the product's official `retailPrice`.

- [ ] **Step 3: Facilitator + commission inputs**

Add, visible only when `saleType === 'black'`: a facilitator selector — a toggle between "System user" (reusing the existing customer-search-style combobox pattern, but against a user list — check whether a `Users.useSearch()` hook already exists in `api.ts`; if not, a plain text name field is the fallback per the spec's "system user OR free-text name" rule) and "Name only" (free-text `facilitatorName` input), plus a numeric `commissionPct` input. State:
```typescript
  const [facilitatorMode, setFacilitatorMode] = useState<'none' | 'user' | 'name'>('none');
  const [facilitatorUserId, setFacilitatorUserId] = useState('');
  const [facilitatorName, setFacilitatorName] = useState('');
  const [commissionPct, setCommissionPct] = useState('');
```

Show a live-computed preview near the totals when `saleType === 'black'`: black markup = sum of `(line.rate - officialPrice) * line.qty` — since the frontend doesn't know each product's official `retailPrice` without a lookup, use the already-loaded `Products.useSearch`/inventory product records (same source `productRate()` in this file already reads `p.retailPrice` from) to compute this client-side preview; the server (Task 8) remains the source of truth on submit.

- [ ] **Step 4: Wire into checkout call**

Add `facilitatorUserId: facilitatorMode === 'user' ? facilitatorUserId : undefined, facilitatorName: facilitatorMode === 'name' ? facilitatorName : undefined, commissionPct: commissionPct ? Number(commissionPct) : undefined` to the `runSalesCheckout(...)` call site.

- [ ] **Step 5: Manual verification**

1. Log in as OrgAdmin, switch POS to Black mode, add a product, override its charged price above the official price.
2. Set a facilitator name + commission % — confirm the live preview shows the expected black markup/commission split.
3. Complete the sale — confirm success, then via the Task 14 black-ledger page (once built) or a direct API check, confirm the bill's `blackAmount`/`commissionAmount` match the preview and a `CommissionPayable` row exists.
4. Confirm the product's official stock count is unchanged (`Inventory` page) and its black-stock count (UnpublishedStock page) dropped by the sold quantity.

- [ ] **Step 6: Commit**

```bash
cd ERP-Client
git add renderer/src/pages/pos/
git commit -m "feat: add black-mode charged price, facilitator, commission UI to POS"
```

---

### Task 14: Pending Approvals page + Black Ledger page

**Files:**
- Create: `ERP-Client/renderer/src/pages/PendingApprovals/index.tsx`
- Create: `ERP-Client/renderer/src/pages/BlackLedger/index.tsx`
- Modify: `ERP-Client/renderer/src/modules.ts` (or wherever nav/routes are registered — check how `UnpublishedStock`'s route/nav entry is defined and mirror it)
- Modify: `ERP-Client/renderer/src/App.tsx` (route registration, if separate from `modules.ts`)

**Interfaces:**
- Consumes: `CreditApprovals.useListPending()`, `.useApprove()`, `.useReject()`, `.useBlackLedger()`, `.useMarkCommissionPaid()` (Task 11).

- [ ] **Step 1: `PendingApprovals` page**

Create `ERP-Client/renderer/src/pages/PendingApprovals/index.tsx` — a table (reuse whatever table/list component pattern `UnpublishedStock/index.tsx` or `Users/index.tsx` uses) listing `CreditApprovals.useListPending()` results: customer name (resolve via `Customers` cache or an included relation — check what the `GetBlackLedgerQuery`/`ListPendingCreditApprovalsQuery` responses actually include; if customer/bill details aren't embedded, either extend the backend response in Task 7 to include them or fetch them client-side per row), requested amount, requested-by, created date, and Approve/Reject buttons wired to `useApprove()`/`useReject()`.

- [ ] **Step 2: `BlackLedger` page**

Create `ERP-Client/renderer/src/pages/BlackLedger/index.tsx` — two sections from `CreditApprovals.useBlackLedger()`: a black-bills table (bill number, location, total, blackAmount, date) and a commissions table (facilitator, amount, status, a "Mark Paid" button wired to `useMarkCommissionPaid()` for `owed` rows).

- [ ] **Step 3: Route + nav registration, role-gated**

Register both routes (e.g. `/pending-approvals`, `/black-ledger`) following the exact pattern used for `/pos` (per the existing `pos-billing-design.md`: "modules.ts + App.tsx route `/pos`") — read `modules.ts` first to see if nav entries carry a role-visibility flag already (several pages here are clearly admin-only, e.g. `PlatformConfigurations`, `Organizations` — check how those are hidden from non-qualifying roles and mirror that exact mechanism for these two new pages, gated to org_admin/org_manager/super_admin).

- [ ] **Step 4: Manual verification**

1. As OrgAdmin: trigger an over-limit credit sale (Task 12's flow), confirm it appears in Pending Approvals, Approve it, confirm the bill completes and the row disappears from pending.
2. Complete a black sale with a facilitator (Task 13), confirm it appears in Black Ledger with correct amounts, mark the commission paid, confirm status updates.
3. As a non-admin role: confirm neither nav entry is visible and direct navigation to the routes doesn't show data (or is blocked, per whatever pattern Step 3 mirrored).

- [ ] **Step 5: Commit**

```bash
cd ERP-Client
git add renderer/src/pages/PendingApprovals/ renderer/src/pages/BlackLedger/ renderer/src/modules.ts renderer/src/App.tsx
git commit -m "feat: add Pending Approvals and Black Ledger pages"
```

---

### Task 15: Documents — Debtor Note, Statement, Delivery Note

**Files:**
- Create: `ERP-Client/renderer/src/pages/pos/DebtorNoteDocument.tsx`
- Create: `ERP-Client/renderer/src/pages/pos/StatementDocument.tsx`
- Create: `ERP-Client/renderer/src/pages/pos/DeliveryNoteDocument.tsx`
- Modify: `ERP-Client/renderer/src/pages/pos/POSTerminal.tsx` (buttons to open each, reusing the `BillSuccessModal`/`printReceipt` pattern already in the file)

**Interfaces:**
- Consumes: `Bill`, `Customer` types; the same `window.print()` pattern as `ReceiptDocument.tsx` (read that file in full first and copy its structural approach — print-specific CSS classes like `pos-no-print` already exist in this codebase per `BillSuccessModal`'s className usage).

- [ ] **Step 1: Read `ReceiptDocument.tsx` in full**

This is the template for all three new documents — same props shape (a plain data object, not live queries inside the document component), same print CSS class conventions.

- [ ] **Step 2: `DebtorNoteDocument.tsx`**

A component taking `{ bill: Bill; customer: Customer }`, rendering customer details, outstanding balance (`customer.creditBalance`), the bill's line items and total — styled for print, following `ReceiptDocument.tsx`'s layout conventions exactly (same header/footer structure, same print media query classes).

- [ ] **Step 3: `StatementDocument.tsx`**

Takes `{ customer: Customer; transactions: CustomerCreditTransaction[] }` (needs a small new backend piece: `GET /api/v1/customers/:id/credit-transactions` — if this doesn't exist yet, add it as a short additional step here: a `ListCustomerCreditTransactionsQuery`/handler in the `credit-approvals` module reading `CUSTOMER_CREDIT_TRANSACTION_REPO.allAsync({ customerId })`, exposed via a route on `CustomersController` or `CreditApprovalsController` — pick whichever controller already owns customer-scoped reads, check `customers.controller.ts` first). Renders a running-balance ledger view.

- [ ] **Step 4: `DeliveryNoteDocument.tsx`**

Takes `{ bill: Bill; customer: Customer }` plus whatever delivery/driver fields exist on the bill today (per the design spec, driver/transport fields are explicitly deferred to the Boxes Tracker phase — this document renders what's available now: customer address/contact if present, payment timing, and leaves a blank driver/transport section for manual fill-in, matching the sketch's document intent without inventing backend fields this plan didn't build).

- [ ] **Step 5: Wire buttons in `POSTerminal.tsx`**

In `BillSuccessModal` (or a new post-sale actions area), add three buttons — "Debtor Note", "Statement", "Delivery Note" — each opening the relevant document in the same modal/print pattern `printReceipt`/`ReceiptDocument` already use, calling `window.print()` on click.

- [ ] **Step 6: Manual verification**

Complete a credit sale, open each of the three documents from the success modal, confirm they render correctly and `window.print()` produces a sane print preview for each (check via the browser/Electron print dialog, not just on-screen rendering).

- [ ] **Step 7: Commit**

```bash
cd ERP-Client
git add renderer/src/pages/pos/
git commit -m "feat: add Debtor Note, Statement, Delivery Note printable documents"
```

---

## Self-Review Notes

- **Spec coverage:** Every "Locked" row in the design spec maps to a task — Bill extension (Task 2), Hold/Draft reusing DRAFT (Task 12), black inventory on UnpublishedStock (Task 5/9), black stock visibility to Store roles (Task 9, with an honest flag if the location-scoping mechanism turns out not to exist yet), black sale creation restricted to Org Admin/Manager (Task 8), black ledger admin-only (Task 10/14), OrgManager role (Task 1), credit running balance (Task 3/6), in-app approval list (Task 7/14), window.print documents (Task 15), specific (non-generic) approval table (Task 4).
- **Deferred items correctly excluded:** no task builds Boxes Tracker, the wider reporting suite, real-time notifications, or downloadable PDFs — matching the design spec's "Out of scope."
- **Corrected from a first draft:** originally planned to gate black-sale creation via `RolesGuard`/`@Roles()` on `BillsController`, but that controller has no `RolesGuard` today and serves all sale types through the same generic `POST /bills` route — moved the check inline into `CreateBillCommandHandler` using `command.performedByRoles`, passed from the controller's `AuthenticatedUser`.
- **Known open risk, flagged rather than hand-waved:** Task 9's location-scoping for Store Manager/Staff on black stock assumes a per-user location mechanism exists elsewhere in the codebase; Task 9 Step 1 requires investigating this before writing code, and explicitly permits shipping without scoping (with a flagged gap) if no such mechanism is found — better than fabricating a fake filter.
- **Type consistency:** `ESaleType`/`ECustomerType`/`EPaymentTiming` (Task 2) are the single source of truth, imported by `BillCompletionService` (Task 6), `CreateBillCommandHandler` (Task 8), and the frontend's parallel string-literal types (Task 11) — kept as plain string unions on the frontend (not a shared package) since this codebase has no shared-types package between `core-apis` and `ERP-Client` (confirmed by `types.ts`'s existing comment "Matches core-apis EPaymentMethod" — the established convention here is manual sync via comments, not a generated client).
