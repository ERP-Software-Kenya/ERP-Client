# Stock Transfer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the product-first stock transfer flow (select product → see locations holding stock → pick source/target → confirm with an animation) with a real, persisted transfer history and correct backend behavior for transferring into a location that has never stocked the product before.

**Architecture:** Most of the frontend UX already exists as **uncommitted local changes** on this machine (see "Starting Point" below) — this plan finishes it, it does not start from scratch. Backend: reuse the existing generic `pagedAsync`/`Filter` mechanism for the new list endpoint (no custom query-builder needed, unlike user management — `StockTransferEntity` has no cross-relation search requirement). Resolve-or-create the destination `InventoryEntity` row server-side so the frontend never has to know a `toInventoryId` for a location that's never held the product. Populate `StockTransferItemEntity` on complete (currently written nowhere). Source-stock validation **already exists** at `InventoryRepo.deductStockAsync` (`core-apis/src/infrastructure/persistence/repositories/inventory.repo.ts:81-87` — throws `BadRequestException` if requested quantity exceeds on-hand) — no new validation code needed there, only a task to confirm it fires correctly end-to-end.

**Tech Stack:** NestJS + TypeORM + CQRS (`core-apis`), React + TanStack Query + Radix (`ERP-Client`). No new dependencies — the "GPay-style" success animation is plain Tailwind (`animate-in fade-in zoom-in`), already used in the existing uncommitted code.

## Global Constraints

- Backend: strict CQRS, `@CommandHandlerStrict`/`@QueryHandlerStrict`, `CqrsMediator.execute`, DI via `@Inject(TOKEN)`. (`core-apis/.claude/rules/backend-rules.md`)
- Do not modify `StockOrchestrationService` (`core-apis/src/application/shared/services/stock-orchestration.service.ts`) — it's shared by other transfer/write-off/adjustment paths. All new logic in this plan lives in `CompleteStockTransferCommandHandler`, which calls the orchestrator, not inside it.
- Single product per transfer (confirmed scope decision) — do not reintroduce multi-line-item transfer creation.

## Starting Point — read this before touching any file

`ERP-Client/renderer/src/pages/StockTransfers.tsx`, `ERP-Client/renderer/src/api.ts`, and `core-apis/src/application/modules/inventory/inventory.controller.ts` all have **uncommitted local changes already on disk** (not from this plan, not yet committed — run `git status --short` in both repos to confirm before starting). That existing work already implements:
- Product-first modal (select product → `Inventory.useByProduct(productId)` shows locations with stock → pick source → pick destination → quantity)
- The success animation (`animate-in fade-in zoom-in duration-500`, checkmark, "Transfer Successful" state)
- Client-side max-quantity validation
- `GET /api/v1/inventory/by-product/:productId` backend endpoint (`core-apis/src/application/modules/inventory/inventory.controller.ts`, uncommitted) — already works, reuses `ListInventoryQuery` with a `productId` filter.

It is **broken as shipped** in two ways this plan fixes:
1. `StockTransfers.useSearch()` (`ERP-Client/renderer/src/api.ts:233-245`) calls `GET /api/v1/stock-transfers`, which has no list route on the backend today — the history table will show a permanent error.
2. `StockTransfers.tsx`'s `handleSubmit` (around line 95) sends `toInventoryId: ''` to the complete endpoint with a comment `// Assume backend populates this or modifies it` — `CompleteTransferItemRequest.toInventoryId` (`core-apis/src/application/modules/stock-transfers/models/requests/complete-stock-transfer.request.ts`) is `@IsNotEmpty() @IsUUID()`, so every transfer completion will 400.

Do not discard this uncommitted work — build on it. Tasks below reference exact current line numbers from what's on disk right now; re-check with `git diff` if those have shifted.

---

### Task 1: Destination inventory resolution + item logging on complete

**Files:**
- Modify: `core-apis/src/application/modules/stock-transfers/commands/complete-stock-transfer/complete-stock-transfer.command-handler.ts`
- Modify: `core-apis/src/application/modules/stock-transfers/commands/complete-stock-transfer/complete-stock-transfer.command.ts`
- Modify: `core-apis/src/application/modules/stock-transfers/models/requests/complete-stock-transfer.request.ts`
- Modify: `core-apis/src/application/modules/stock-transfers/i-stock-transfer.repo.ts`
- Modify: `core-apis/src/infrastructure/persistence/repositories/stock-transfer.repo.ts`
- Modify: `core-apis/src/application/modules/stock-transfers/mapper/stock-transfer.profile.ts`
- Test: `core-apis/src/application/modules/stock-transfers/commands/complete-stock-transfer/complete-stock-transfer.command-handler.spec.ts`

**Interfaces:**
- Produces: `IStockTransferRepo.createItemsAsync(items: NewStockTransferItem[]): Promise<void>` where `NewStockTransferItem = { transferId: string; productId: string; quantitySent: number; quantityReceived: number }`.
- `CompleteTransferItemRequest.toInventoryId` becomes optional (`?`, drops `@IsNotEmpty()`/`@IsUUID()` in favor of `@IsOptional() @IsUUID()`).

- [ ] **Step 1: Write the failing test**

Create `core-apis/src/application/modules/stock-transfers/commands/complete-stock-transfer/complete-stock-transfer.command-handler.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { Mapper } from '@automapper/core';
import { CompleteStockTransferCommandHandler } from './complete-stock-transfer.command-handler';
import { CompleteStockTransferCommand } from './complete-stock-transfer.command';
import { STOCK_TRANSFER_REPO } from '../../../../constants';
import { INVENTORY_REPO } from '../../../../constants';
import { EStockTransferStatus, StockOrchestrationService } from '../../../../shared';

describe('CompleteStockTransferCommandHandler', () => {
  const repo = { getAsync: jest.fn(), createItemsAsync: jest.fn() };
  const inventoryRepo = { findOneAsync: jest.fn(), createAsync: jest.fn() };
  const orchestrator = { completeTransferBatch: jest.fn() };
  const mapper = { mapArray: jest.fn((items) => items) } as unknown as Mapper;
  let handler: CompleteStockTransferCommandHandler;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CompleteStockTransferCommandHandler,
        { provide: STOCK_TRANSFER_REPO, useValue: repo },
        { provide: INVENTORY_REPO, useValue: inventoryRepo },
        { provide: StockOrchestrationService, useValue: orchestrator },
        { provide: 'automapper:nestjs:default', useValue: mapper },
        { provide: getLoggerToken(CompleteStockTransferCommandHandler.name), useValue: { info: jest.fn() } },
      ],
    }).compile();
    handler = module.get(CompleteStockTransferCommandHandler);
  });

  function command(): CompleteStockTransferCommand {
    const c = new CompleteStockTransferCommand();
    c.transferId = 'transfer-1';
    c.organizationId = 'org-1';
    c.performedById = 'user-1';
    c.items = [{
      fromInventoryId: 'inv-src', toInventoryId: undefined as unknown as string,
      productId: 'prod-1', fromLocationId: 'loc-src', toLocationId: 'loc-dest', quantity: 5,
    }] as unknown as CompleteStockTransferCommand['items'];
    return c;
  }

  it('creates a zero-stock destination inventory row when the product has never been at the target location', async () => {
    repo.getAsync.mockResolvedValue({ id: 'transfer-1', status: EStockTransferStatus.Pending });
    inventoryRepo.findOneAsync.mockResolvedValue(null);
    inventoryRepo.createAsync.mockResolvedValue({ id: 'inv-dest-new' });

    await handler.execute(command());

    expect(inventoryRepo.findOneAsync).toHaveBeenCalledWith({ organizationId: 'org-1', locationId: 'loc-dest', productId: 'prod-1' });
    expect(inventoryRepo.createAsync).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 'org-1', locationId: 'loc-dest', productId: 'prod-1', quantityOnHand: 0, quantityReserved: 0,
    }));
    expect(orchestrator.completeTransferBatch).toHaveBeenCalledWith('transfer-1', expect.arrayContaining([
      expect.objectContaining({ toInventoryId: 'inv-dest-new' }),
    ]));
  });

  it('reuses the existing destination inventory row when one already exists', async () => {
    repo.getAsync.mockResolvedValue({ id: 'transfer-1', status: EStockTransferStatus.Pending });
    inventoryRepo.findOneAsync.mockResolvedValue({ id: 'inv-dest-existing' });

    await handler.execute(command());

    expect(inventoryRepo.createAsync).not.toHaveBeenCalled();
    expect(orchestrator.completeTransferBatch).toHaveBeenCalledWith('transfer-1', expect.arrayContaining([
      expect.objectContaining({ toInventoryId: 'inv-dest-existing' }),
    ]));
  });

  it('records a StockTransferItem row per item after the orchestrator completes', async () => {
    repo.getAsync.mockResolvedValue({ id: 'transfer-1', status: EStockTransferStatus.Pending });
    inventoryRepo.findOneAsync.mockResolvedValue({ id: 'inv-dest-existing' });

    await handler.execute(command());

    expect(repo.createItemsAsync).toHaveBeenCalledWith([
      { transferId: 'transfer-1', productId: 'prod-1', quantitySent: 5, quantityReceived: 5 },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd core-apis && npx jest complete-stock-transfer.command-handler.spec.ts`
Expected: FAIL — handler doesn't resolve/create destination inventory, `IStockTransferRepo.createItemsAsync` doesn't exist, `INVENTORY_REPO` isn't injected into this handler.

- [ ] **Step 3: Relax the request DTO**

Edit `core-apis/src/application/modules/stock-transfers/models/requests/complete-stock-transfer.request.ts` — change the `toInventoryId` property:

```typescript
  @ApiPropertyOptional() @IsOptional() @IsUUID() @AutoMap() public toInventoryId?: string;
```

(change its `@ApiProperty()` → `@ApiPropertyOptional()`, `@IsNotEmpty()` → `@IsOptional()`; add `ApiPropertyOptional` and `IsOptional` to the existing import lines from `@nestjs/swagger` and `class-validator`.)

Mirror the same change on `CompleteTransferItemInput` — find it (it's imported in the command handler as `from '../../index'` or `'../index'`, defined in `core-apis/src/application/modules/stock-transfers/commands/index.ts` or a shared models file — grep `class CompleteTransferItemInput` to locate it) and make its `toInventoryId` field optional too, matching the request DTO.

- [ ] **Step 4: Add `createItemsAsync` to the repo**

Add to `core-apis/src/application/modules/stock-transfers/i-stock-transfer.repo.ts`:

```typescript
import { IBaseRepo, Filter, PageableFilter } from '../../../common';
import { StockTransfer } from './domain';

export type StockTransferFilter = {
  search?: string;
};

export type NewStockTransferItem = {
  transferId: string;
  productId: string;
  quantitySent: number;
  quantityReceived: number;
};

export interface IStockTransferRepo extends IBaseRepo<StockTransfer, string, PageableFilter<StockTransferFilter>, Filter<StockTransferFilter>> {
  createItemsAsync(items: NewStockTransferItem[]): Promise<void>;
}
```

(`StockTransferFilter` gains a `search` field here — needed by Task 2 too; `IStockTransferRepo` changes from a type alias to an interface so it can declare the new method.)

Edit `core-apis/src/infrastructure/persistence/repositories/stock-transfer.repo.ts` — add a second injected repository and the new method:

```typescript
import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { BaseRepo, Filter, PageableFilter } from '../../../common';
import { StockTransferEntity, StockTransferItemEntity } from '../entities';
import { StockTransfer } from '../../../application/modules/stock-transfers/domain';
import { IStockTransferRepo, StockTransferFilter, NewStockTransferItem } from '../../../application/modules/stock-transfers';

@Injectable()
export class StockTransferRepo extends BaseRepo<StockTransferEntity, StockTransfer, string, PageableFilter<StockTransferFilter>, Filter<StockTransferFilter>> implements IStockTransferRepo {
  constructor(
    @InjectRepository(StockTransferEntity) internalRepo: Repository<StockTransferEntity>,
    @InjectRepository(StockTransferItemEntity) private readonly itemRepo: Repository<StockTransferItemEntity>,
    @InjectMapper() mapper: Mapper,
    @InjectPinoLogger(StockTransferRepo.name) logger: PinoLogger,
  ) {
    super(internalRepo, mapper, logger, StockTransferEntity, StockTransfer);
  }

  public override get idColumnName(): keyof StockTransferEntity {
    return 'id';
  }

  public async createItemsAsync(items: NewStockTransferItem[]): Promise<void> {
    await this.itemRepo.insert(items.map((i) => ({
      transferId: i.transferId,
      productId: i.productId,
      quantitySent: i.quantitySent,
      quantityReceived: i.quantityReceived,
    })));
  }
}
```

Add `StockTransferItemEntity` to the `TypeOrmModule.forFeature([...])` list in `core-apis/src/application/modules/stock-transfers/stock-transfers.module.ts` if it isn't already registered there (check first — it may already be registered globally; if `StockTransferRepo` fails to resolve `StockTransferItemEntity`'s repository at runtime, that's the fix).

- [ ] **Step 5: Update the command and handler**

Edit `core-apis/src/application/modules/stock-transfers/commands/complete-stock-transfer/complete-stock-transfer.command-handler.ts`:

```typescript
import { BadRequestException, Inject } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict } from '../../../../../common';
import { EStockTransferStatus, TransferStockOperationInput, StockOrchestrationService } from 'src/application/shared';
import { STOCK_TRANSFER_REPO, INVENTORY_REPO } from '../../../../constants';
import { StockTransfer } from '../../domain';
import { IStockTransferRepo } from '../..';
import { IInventoryRepo } from '../../../inventory';
import { CompleteTransferItemInput } from '../index';
import { CompleteStockTransferCommand } from './complete-stock-transfer.command';

@CommandHandlerStrict(CompleteStockTransferCommand)
export class CompleteStockTransferCommandHandler implements ICommandHandler<CompleteStockTransferCommand, StockTransfer> {
  constructor(
    @Inject(STOCK_TRANSFER_REPO) private readonly repo: IStockTransferRepo,
    @Inject(INVENTORY_REPO) private readonly inventoryRepo: IInventoryRepo,
    private readonly orchestrator: StockOrchestrationService,
    @InjectMapper() private readonly mapper: Mapper,
    @InjectPinoLogger(CompleteStockTransferCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: CompleteStockTransferCommand): Promise<StockTransfer> {
    this.logger.info(`Executing ${CompleteStockTransferCommand.name} transferId=${command.transferId}`);
    const transfer = await this.repo.getAsync(command.transferId);
    if (transfer.status !== EStockTransferStatus.Pending) {
      throw new BadRequestException(`Transfer ${command.transferId} is not in PENDING state`);
    }

    for (const item of command.items) {
      if (!item.toInventoryId) {
        const existing = await this.inventoryRepo.findOneAsync({
          organizationId: command.organizationId,
          locationId: item.toLocationId,
          productId: item.productId,
        });
        if (existing) {
          item.toInventoryId = existing.id;
        } else {
          const created = await this.inventoryRepo.createAsync({
            organizationId: command.organizationId,
            locationId: item.toLocationId,
            productId: item.productId,
            quantityOnHand: 0,
            quantityReserved: 0,
            reorderLevel: 0,
          } as never);
          item.toInventoryId = created.id;
        }
      }
    }

    const inputs = this.mapper.mapArray(command.items, CompleteTransferItemInput, TransferStockOperationInput);
    inputs.forEach((input) => {
      input.organizationId = command.organizationId;
      input.performedById  = command.performedById;
      input.referenceId    = command.transferId;
    });
    await this.orchestrator.completeTransferBatch(command.transferId, inputs);

    await this.repo.createItemsAsync(command.items.map((item) => ({
      transferId: command.transferId,
      productId: item.productId,
      quantitySent: item.quantity,
      quantityReceived: item.quantity,
    })));

    return this.repo.getAsync(command.transferId);
  }
}
```

Check `CompleteTransferItemInput`'s definition (wherever it's exported from — `'../index'` per the existing import) and confirm `toInventoryId` is mutable there (not `readonly`) since the loop above assigns to it; if it's a `class` with plain public properties (matching every other Command/Input in this codebase), this is already fine.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd core-apis && npx jest complete-stock-transfer.command-handler.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 7: Build check**

Run: `cd core-apis && npm run build`
Expected: no errors

- [ ] **Step 8: Commit**

```bash
cd core-apis
git add src/application/modules/stock-transfers/ src/infrastructure/persistence/repositories/stock-transfer.repo.ts
git commit -m "feat: resolve/create destination inventory and log transfer items on complete"
```

---

### Task 2: `GET /stock-transfers` list endpoint

**Files:**
- Modify: `core-apis/src/infrastructure/persistence/repositories/stock-transfer.repo.ts` (already touched in Task 1 — add `modifyFindOption`/`specialFilterFields` overrides here)
- Create: `core-apis/src/application/modules/stock-transfers/models/requests/search-stock-transfers.request.ts`
- Modify: `core-apis/src/application/modules/stock-transfers/models/requests/index.ts`
- Modify: `core-apis/src/application/modules/stock-transfers/stock-transfers.controller.ts`

**Interfaces:**
- Produces: `GET /api/v1/stock-transfers?$page&$perPage&search` → `{ items: StockTransferResponse[], totalCount, page, perPage, totalPages }` (the shape `IPageable<T>` already produces, matching `SearchProductsQuery`'s pattern).

- [ ] **Step 1: Repo — support free-text search on `transferNumber`**

`StockTransferFilter` (from Task 1) now has a `search?: string` field, but that key doesn't correspond to a real column, so the generic `createPartialWhere` loop in `BaseReadOnlyRepo` would try to filter on a nonexistent `search` column and fail. Add these two overrides to `StockTransferRepo` (`core-apis/src/infrastructure/persistence/repositories/stock-transfer.repo.ts`), mirroring `CategoryRepo`'s `hasParent` handling (`core-apis/src/infrastructure/persistence/repositories/category.repo.ts:27-36`):

```typescript
  public override get specialFilterFields(): (keyof PageableFilter<StockTransferFilter>)[] {
    return [...super.specialFilterFields, 'search'];
  }

  protected override modifyFindOption(
    findOpts: FindManyOptions<StockTransferEntity>,
    filterObj: Filter<StockTransferFilter> | PageableFilter<StockTransferFilter>,
  ): void {
    if (filterObj.search) {
      (findOpts.where as Record<string, unknown>).transferNumber = ILike(`%${filterObj.search}%`);
    }
  }
```

Add `FindManyOptions, ILike` to the `typeorm` import at the top of the file.

- [ ] **Step 2: Request DTO**

Create `core-apis/src/application/modules/stock-transfers/models/requests/search-stock-transfers.request.ts`:

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchStockTransfersRequest {
  @ApiPropertyOptional() @IsOptional() @IsString() public search?: string;

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(1) public $page?: number = 1;

  @ApiPropertyOptional({ default: 15 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(1) public $perPage?: number = 15;
}
```

Add the export to `core-apis/src/application/modules/stock-transfers/models/requests/index.ts`.

- [ ] **Step 3: Controller endpoint**

Add to `core-apis/src/application/modules/stock-transfers/stock-transfers.controller.ts`, above the existing `GET :id` route (needs `Query` added to the `@nestjs/common` import, `SearchStockTransfersRequest` and `IPageable` imported):

```typescript
  @ApiOperation({ summary: 'List/search stock transfers' })
  @ApiOkResponse({ type: [StockTransferResponse] })
  @HttpCode(HttpStatus.OK)
  @Get()
  public async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() params: SearchStockTransfersRequest,
  ): Promise<{ items: StockTransferResponse[]; totalCount: number; page: number; perPage: number; totalPages: number }> {
    const result = await this.repo.pagedAsync({
      organizationId: user.organizationId,
      search: params.search,
      $page: params.$page ?? 1,
      $perPage: params.$perPage ?? 15,
    } as never);
    return {
      ...result,
      items: this.mapper.mapArray(result.items, StockTransfer, StockTransferResponse),
    };
  }
```

Wait — `StockTransfersController` doesn't currently inject the repo directly (it goes through `mediator.execute`). Injecting the repo directly here breaks the CQRS convention every other endpoint in this controller follows. **Do it the CQRS way instead:** add a small `ListStockTransfersQuery`/`ListStockTransfersQueryHandler` pair (mirroring `GetStockTransferQuery`'s file layout in `core-apis/src/application/modules/stock-transfers/queries/get-stock-transfer/`) that just calls `this.repo.pagedAsync(...)` and maps `organizationId` from the query — same shape as `ListOrgMembersQueryHandler` in the user-management plan's Task 4, but simpler since it needs no manual join. Create:

`core-apis/src/application/modules/stock-transfers/queries/list-stock-transfers/list-stock-transfers.query.ts`:
```typescript
import { AutoMap } from '@automapper/classes';
import { QueryBase } from '../../../../../common';

export class ListStockTransfersQuery extends QueryBase {
  @AutoMap() public organizationId: string;
  @AutoMap() public search?: string;
  @AutoMap() public page: number;
  @AutoMap() public perPage: number;
}
```

`core-apis/src/application/modules/stock-transfers/queries/list-stock-transfers/list-stock-transfers.query-handler.ts`:
```typescript
import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict, IPageable } from '../../../../../common';
import { STOCK_TRANSFER_REPO } from '../../../../constants';
import { IStockTransferRepo } from '../..';
import { StockTransfer } from '../../domain';
import { ListStockTransfersQuery } from './list-stock-transfers.query';

@QueryHandlerStrict(ListStockTransfersQuery)
export class ListStockTransfersQueryHandler implements IQueryHandler<ListStockTransfersQuery, IPageable<StockTransfer>> {
  constructor(
    @Inject(STOCK_TRANSFER_REPO) private readonly repo: IStockTransferRepo,
    @InjectPinoLogger(ListStockTransfersQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: ListStockTransfersQuery): Promise<IPageable<StockTransfer>> {
    this.logger.info(`Executing ${ListStockTransfersQuery.name} organizationId=${query.organizationId}`);
    return this.repo.pagedAsync({
      organizationId: query.organizationId,
      search: query.search,
      $page: query.page,
      $perPage: query.perPage,
    } as never);
  }
}
```

`core-apis/src/application/modules/stock-transfers/queries/list-stock-transfers/index.ts`:
```typescript
export * from './list-stock-transfers.query';
export * from './list-stock-transfers.query-handler';
```

Update `core-apis/src/application/modules/stock-transfers/queries/index.ts`:
```typescript
import { GetStockTransferQueryHandler } from './get-stock-transfer';
import { ListStockTransfersQueryHandler } from './list-stock-transfers';

export * from './get-stock-transfer';
export * from './list-stock-transfers';

export const StockTransferQueryHandlers = [GetStockTransferQueryHandler, ListStockTransfersQueryHandler];
```

Now add the controller route (this replaces the earlier direct-repo sketch above — use this version):

```typescript
  @ApiOperation({ summary: 'List/search stock transfers' })
  @HttpCode(HttpStatus.OK)
  @Get()
  public async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() params: SearchStockTransfersRequest,
  ): Promise<{ items: StockTransferResponse[]; totalCount: number; page: number; perPage: number; totalPages: number }> {
    const query = new ListStockTransfersQuery();
    query.organizationId = user.organizationId;
    query.search = params.search;
    query.page = params.$page ?? 1;
    query.perPage = params.$perPage ?? 15;
    const result = await this.mediator.execute<ListStockTransfersQuery, import('../../../common').IPageable<StockTransfer>>(query);
    return {
      totalCount: result.totalCount,
      page: result.page,
      perPage: result.perPage,
      totalPages: result.totalPages,
      items: this.mapper.mapArray(result.items, StockTransfer, StockTransferResponse),
    };
  }
```

(Replace the inline `import(...)` with a proper top-of-file import of `IPageable` from `'src/common'` — written inline above only to show the exact type; use a normal import statement when editing the file.) Add `ListStockTransfersQuery` and `SearchStockTransfersRequest` to the controller's import list. Place this new route **before** `@Get(':id')` in the file — not functionally required (Nest/Express distinguish `/stock-transfers` from `/stock-transfers/:id` by path shape, not declaration order) but keep it there for readability, matching where `list`/`search` routes sit in other controllers (e.g. `ProductsController`).

- [ ] **Step 4: Build check**

Run: `cd core-apis && npm run build`
Expected: no errors

- [ ] **Step 5: Manual verification**

Run: `npm run start:dev`, then `curl -H "Authorization: Bearer <token>" "http://localhost:<port>/api/v1/stock-transfers?\$page=1&\$perPage=15"`
Expected: `200` with `{ items: [...], totalCount, page, perPage, totalPages }`.

- [ ] **Step 6: Commit**

```bash
cd core-apis
git add src/application/modules/stock-transfers/ src/infrastructure/persistence/repositories/stock-transfer.repo.ts
git commit -m "feat: add GET /stock-transfers list/search endpoint"
```

---

### Task 3: Finish the frontend — fix the broken complete call, wire real history

**Files:**
- Modify: `ERP-Client/renderer/src/pages/StockTransfers.tsx`
- Modify: `ERP-Client/renderer/src/api.ts`

**Interfaces:**
- Consumes: `GET /api/v1/stock-transfers` (Task 2), relaxed `toInventoryId` on the complete endpoint (Task 1).

- [ ] **Step 1: Confirm the current on-disk state**

Run: `cd ERP-Client && git diff renderer/src/pages/StockTransfers.tsx renderer/src/api.ts`
Read the actual current file with `Read` (not the diff) before editing — line numbers below assume the file as described in "Starting Point" above; re-verify if it has changed further.

- [ ] **Step 2: Stop sending an empty `toInventoryId`**

In `ERP-Client/renderer/src/api.ts`, in `useCompleteStockTransfer`'s `items` array type, change `toInventoryId: string;` to `toInventoryId?: string;`.

In `ERP-Client/renderer/src/pages/StockTransfers.tsx`, in `handleSubmit`'s `completeMutation.mutate(...)` call, remove the `toInventoryId: '', // Assume backend populates this or modifies it` line entirely — just omit the field (backend now resolves it, per Task 1).

- [ ] **Step 3: Verify history wiring needs no further change**

`StockTransfers.useSearch({ page, limit: 15, filters: debouncedSearch ? { search: debouncedSearch } : undefined })` (already on disk, unchanged) now hits a real endpoint after Task 2 — no code change needed here, just re-verify manually.

- [ ] **Step 4: Manual verification — full flow**

Run: `cd core-apis && npm run start:dev` and `cd ERP-Client && npm run dev` (adjust to actual scripts), then in the app:
1. Open Stock Transfers, click "New Transfer."
2. Pick a product that has stock in one location but has **never** been stocked at a second location.
3. Pick that never-stocked location as the destination, transfer a valid quantity.
4. Expect: success animation plays, transfer completes without a 400, and a new row appears in the history table on refetch.
5. Try transferring a quantity greater than available — expect the existing client-side check to block submission (`qtyNum > maxQty` in `handleSubmit`); separately, verify the server-side backstop by completing a transfer through a direct API call with a stale/over-quantity payload and confirming a `400` with the `Cannot deduct more than on-hand stock` message from `InventoryRepo.deductStockAsync`.
6. Search the history table by transfer number substring — expect matching rows only.

- [ ] **Step 5: Commit**

```bash
cd ERP-Client
git add renderer/src/pages/StockTransfers.tsx renderer/src/api.ts
git commit -m "fix: stop sending empty toInventoryId, verify real transfer history"
```

---

## Self-Review Notes

- **Spec coverage:** product-first modal + animation — already done (uncommitted), verified in Task 3. Source-location stock check — already enforced by `InventoryRepo.deductStockAsync`, verified not re-implemented. Target-location resolution for never-stocked products — Task 1. Persisted history — Task 2 + 3. Logging — already complete via `StockOrchestrationService`, `StockTransferItemEntity` population added in Task 1 as the one missing piece.
- **Corrected from the approved design doc:** the design doc listed "add source-location stock validation to `CreateStockTransferCommandHandler`" as a gap. Reading the actual code (`InventoryRepo.deductStockAsync`) showed this guard already exists and fires at complete time with a clear `BadRequestException` — no new validation code needed, only Task 3 Step 4's manual check that it still fires correctly after Task 1's changes.
- **Type consistency:** `NewStockTransferItem` (Task 1) is used identically in `IStockTransferRepo`, `StockTransferRepo.createItemsAsync`, and the handler's mapping call.
