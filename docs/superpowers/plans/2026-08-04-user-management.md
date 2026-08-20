# User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give org admins a real member directory (name/email/phone/created-at/role/status) with working invite-by-email (including brand-new emails) and a pending-invites panel, built on the existing `OrgMemberEntity`/`UserEntity` tables that already back real authorization.

**Architecture:** DB-native. `org_member.user_id` becomes nullable so a row can represent a pending invite (`invited_email` set, no `user`) before the invitee signs up. `SyncUserCommand` (already called on every Clerk login) reconciles pending rows into real memberships. A new query, built with a manual join (TypeORM relations aren't wired for `OrgMemberEntity` today), returns the flattened list the frontend needs. Clerk is used only to send the actual invitation email (`ClerkService.inviteUserAsync`, already implemented) — Clerk is not the source of truth for membership state.

**Tech Stack:** NestJS + TypeORM + CQRS (`core-apis`), React + TanStack Query (`ERP-Client`). No new dependencies.

## Global Constraints

- Backend: strict CQRS — commands extend `CommandBase`, queries extend `QueryBase`, handlers use `@CommandHandlerStrict`/`@QueryHandlerStrict`, dispatched via `CqrsMediator.execute`. (`core-apis/.claude/rules/backend-rules.md`)
- Backend: kebab-case filenames, `I[Name]Repo`/`I[Name]Service` interfaces, DI tokens as `SCREAMING_SNAKE_CASE` string constants, `@Inject(TOKEN)` everywhere.
- Backend: every entity property that crosses a mapper boundary needs `@AutoMap()`.
- Backend: run `npm run build` (tsc) after each backend task; this repo has no per-module lint script wired into this plan — rely on `tsc` + `npm test`.
- Frontend: reuse `createResource`, `DataTable`, `FormDrawer`, `ResourceSelect`, `usePagination` — don't hand-roll fetch logic.
- Do not touch `/api/v1/users/clerk/*` (this morning's separate Clerk-native commit) — out of scope, left as-is.
- **Known uncommitted state (verify before starting Task 5):** `ERP-Client/renderer/src/pages/Users.tsx` and `ERP-Client/renderer/src/api.ts` already have uncommitted local changes from an earlier, incomplete attempt (switched `Users` to `createResource`, added a `DataTable`). That attempt points at the wrong endpoint (`/api/v1/users`, which is Clerk-shaped as of this morning and has no `phone`/pending data) and has no pending-invites panel. Task 5 builds on top of that file as it exists on disk, not from git HEAD — run `git diff renderer/src/pages/Users.tsx` first to see the starting point.

---

### Task 1: `org_member` schema migration

**Files:**
- Modify: `core-apis/src/infrastructure/persistence/entities/org-member.entity.ts`
- Create: `core-apis/src/infrastructure/persistence/migrations/1800000000004-migration.ts`

**Interfaces:**
- Produces: `OrgMemberEntity.userId: string | null`, `OrgMemberEntity.invitedEmail?: string`, `OrgMemberEntity.invitedAt?: Date`, `EOrgMemberStatus` enum (`Active = 'active'`, `Invited = 'invited'`).

- [ ] **Step 1: Update the entity**

Edit `core-apis/src/infrastructure/persistence/entities/org-member.entity.ts`:

```typescript
import { AutoMap } from '@automapper/classes';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CORE_SCHEMA, ECoreTableName } from './e-core-table-name';
import { OrganizationEntity } from './organization.entity';
import { UserEntity } from './user.entity';
import { RoleEntity } from './role.entity';

const PK_NAME = 'PK_' + ECoreTableName.OrgMembers;

export enum EOrgMemberStatus {
  Active  = 'active',
  Invited = 'invited',
}

@Entity({ schema: CORE_SCHEMA, name: ECoreTableName.OrgMembers })
@Index('UQ__org_members__org_user', ['organizationId', 'userId'], { unique: true, where: '"user_id" IS NOT NULL' })
@Index('UQ__org_members__org_invited_email', ['organizationId', 'invitedEmail'], { unique: true, where: '"invited_email" IS NOT NULL' })
export class OrgMemberEntity {
  @AutoMap()
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: PK_NAME })
  public id: string;

  @AutoMap()
  @Column({ name: 'org_id', type: 'uuid' })
  public organizationId: string;

  @AutoMap()
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  public userId: string | null;

  @AutoMap()
  @Column({ name: 'invited_email', type: 'varchar', length: 255, nullable: true })
  public invitedEmail?: string;

  @AutoMap(() => Date)
  @Column({ name: 'invited_at', type: 'timestamp', nullable: true })
  public invitedAt?: Date;

  @AutoMap()
  @Column({ name: 'role_id', type: 'uuid' })
  public roleId: string;

  @AutoMap(() => String)
  @Column({ type: 'varchar', length: 50, default: EOrgMemberStatus.Active })
  public status: string;

  @AutoMap()
  @Column({ name: 'invited_by', type: 'uuid', nullable: true })
  public invitedById?: string;

  @AutoMap(() => Date)
  @Column({ name: 'joined_at', type: 'timestamp', nullable: true })
  public joinedAt?: Date;

  // ─── Relations ──────────────────────────────────────────────────────────────

  @AutoMap(() => OrganizationEntity)
  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({
    name: 'org_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.OrgMembers}__${ECoreTableName.Organizations}`,
  })
  public organization: OrganizationEntity;

  @AutoMap(() => UserEntity)
  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.OrgMembers}__${ECoreTableName.Users}`,
  })
  public user?: UserEntity;

  @AutoMap(() => RoleEntity)
  @ManyToOne(() => RoleEntity)
  @JoinColumn({
    name: 'role_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.OrgMembers}__${ECoreTableName.Roles}`,
  })
  public role: RoleEntity;

  @AutoMap(() => UserEntity)
  @ManyToOne(() => UserEntity)
  @JoinColumn({
    name: 'invited_by',
    referencedColumnName: 'id',
    foreignKeyConstraintName: `FK__${ECoreTableName.OrgMembers}__invited_by`,
  })
  public invitedBy?: UserEntity;
}
```

Note what changed: `userId` is now `string | null` (was `string`), added `invitedEmail`/`invitedAt`, added `EOrgMemberStatus` enum, replaced the single `@Index(['organizationId','userId'], {unique:true})` with two named partial unique indexes, added a `user` relation (was missing entirely — needed for the eager-load in Task 4).

- [ ] **Step 2: Write the migration**

Create `core-apis/src/infrastructure/persistence/migrations/1800000000004-migration.ts`:

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1800000000004 implements MigrationInterface {
    name = 'Migration1800000000004'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core"."org_members" ALTER COLUMN "user_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "core"."org_members" ADD "invited_email" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "core"."org_members" ADD "invited_at" TIMESTAMP`);
        await queryRunner.query(`DROP INDEX "core"."IDX_986db88b0e82a9189921841199"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ__org_members__org_user" ON "core"."org_members" ("org_id", "user_id") WHERE "user_id" IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ__org_members__org_invited_email" ON "core"."org_members" ("org_id", "invited_email") WHERE "invited_email" IS NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "core"."UQ__org_members__org_invited_email"`);
        await queryRunner.query(`DROP INDEX "core"."UQ__org_members__org_user"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_986db88b0e82a9189921841199" ON "core"."org_members" ("org_id", "user_id")`);
        await queryRunner.query(`ALTER TABLE "core"."org_members" DROP COLUMN "invited_at"`);
        await queryRunner.query(`ALTER TABLE "core"."org_members" DROP COLUMN "invited_email"`);
        await queryRunner.query(`ALTER TABLE "core"."org_members" ALTER COLUMN "user_id" SET NOT NULL`);
    }
}
```

The `down()` NOT NULL restore will fail if any pending (`user_id IS NULL`) rows exist by then — acceptable, rollback of this migration is only expected before any real invite has used the new pending path.

- [ ] **Step 3: Run the migration against your local DB**

Run: `npm run migration:run` (check `package.json` for the exact script name if different — search for `"migration:run"` in `core-apis/package.json`)
Expected: migration `1800000000004` applied with no errors.

- [ ] **Step 4: Build check**

Run: `cd core-apis && npm run build`
Expected: no TypeScript errors (the `user` relation is now optional — anything reading `orgMember.user.xxx` without a null check will now fail to compile; fix any such call site by null-checking, there should be none today since this relation didn't exist before).

- [ ] **Step 5: Commit**

```bash
cd core-apis
git add src/infrastructure/persistence/entities/org-member.entity.ts src/infrastructure/persistence/migrations/1800000000004-migration.ts
git commit -m "feat: make org_member.user_id nullable for pending invites"
```

---

### Task 2: Fix invite flow — allow inviting unregistered emails, actually send the email

**Files:**
- Modify: `core-apis/src/application/modules/auth/commands/invite-member/invite-member.command-handler.ts`
- Modify: `core-apis/src/application/modules/auth/auth.module.ts`
- Test: `core-apis/src/application/modules/auth/commands/invite-member/invite-member.command-handler.spec.ts`

**Interfaces:**
- Consumes: `IOrgMemberRepo.findByUserAndOrgAsync(userId, organizationId)` (existing), `IUserRepo.findOneAsync({email})` (existing), `IClerkService.inviteUserAsync({email, roles?, redirectUrl?})` (existing, from `core-apis/src/common/auth/clerk.service.ts:65-72`).
- Produces: `InviteMemberCommandHandler.execute` now returns an `OrgMember` whose `status` is `EOrgMemberStatus.Invited` for both the "already-registered" and "brand-new" cases (previously it was a magic string `'invited'` — now the typed enum from Task 1).

- [ ] **Step 1: Write the failing test**

Create `core-apis/src/application/modules/auth/commands/invite-member/invite-member.command-handler.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { USER_REPO, ORG_MEMBER_REPO, CLERK_SERVICE } from '../../../../../common';
import { InviteMemberCommandHandler } from './invite-member.command-handler';
import { InviteMemberCommand } from './invite-member.command';
import { EOrgMemberStatus } from '../../../../../infrastructure/persistence/entities/org-member.entity';

describe('InviteMemberCommandHandler', () => {
  const userRepo = { findOneAsync: jest.fn() };
  const orgMemberRepo = { findByUserAndOrgAsync: jest.fn(), createAsync: jest.fn() };
  const clerkService = { inviteUserAsync: jest.fn() };
  let handler: InviteMemberCommandHandler;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        InviteMemberCommandHandler,
        { provide: USER_REPO, useValue: userRepo },
        { provide: ORG_MEMBER_REPO, useValue: orgMemberRepo },
        { provide: CLERK_SERVICE, useValue: clerkService },
        { provide: getLoggerToken(InviteMemberCommandHandler.name), useValue: { info: jest.fn(), error: jest.fn() } },
      ],
    }).compile();
    handler = module.get(InviteMemberCommandHandler);
  });

  function command(): InviteMemberCommand {
    const c = new InviteMemberCommand();
    c.email = 'new-person@acme.com';
    c.organizationId = 'org-1';
    c.roleId = 'role-1';
    c.invitedByUserId = 'inviter-1';
    return c;
  }

  it('creates a pending row (userId=null) for an unregistered email and sends a Clerk invite', async () => {
    userRepo.findOneAsync.mockResolvedValue(null);
    orgMemberRepo.createAsync.mockResolvedValue({ id: 'member-1', status: EOrgMemberStatus.Invited });

    const result = await handler.execute(command());

    expect(orgMemberRepo.createAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        invitedEmail: 'new-person@acme.com',
        organizationId: 'org-1',
        roleId: 'role-1',
        status: EOrgMemberStatus.Invited,
      }),
    );
    expect(clerkService.inviteUserAsync).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new-person@acme.com' }),
    );
    expect(result.status).toBe(EOrgMemberStatus.Invited);
  });

  it('creates a membership by userId for an already-registered email, still sends the Clerk invite', async () => {
    userRepo.findOneAsync.mockResolvedValue({ id: 'user-1', email: 'new-person@acme.com' });
    orgMemberRepo.findByUserAndOrgAsync.mockResolvedValue(null);
    orgMemberRepo.createAsync.mockResolvedValue({ id: 'member-1', status: EOrgMemberStatus.Invited });

    await handler.execute(command());

    expect(orgMemberRepo.createAsync).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', invitedEmail: undefined }),
    );
    expect(clerkService.inviteUserAsync).toHaveBeenCalled();
  });

  it('rejects re-inviting an already-active member', async () => {
    userRepo.findOneAsync.mockResolvedValue({ id: 'user-1', email: 'new-person@acme.com' });
    orgMemberRepo.findByUserAndOrgAsync.mockResolvedValue({ id: 'existing' });

    await expect(handler.execute(command())).rejects.toThrow('already a member');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd core-apis && npx jest invite-member.command-handler.spec.ts`
Expected: FAIL — `InviteMemberCommandHandler` doesn't inject `CLERK_SERVICE` yet, doesn't handle the null-user case, `EOrgMemberStatus` doesn't exist as an import target from that path yet (it does after Task 1, but the handler doesn't use it yet).

- [ ] **Step 3: Rewrite the handler**

Replace `core-apis/src/application/modules/auth/commands/invite-member/invite-member.command-handler.ts`:

```typescript
import { ConflictException, Inject } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict, CLERK_SERVICE, IClerkService } from '../../../../../common';
import { USER_REPO, ORG_MEMBER_REPO } from '../../../../constants';
import { IUserRepo } from '../../../users';
import { IOrgMemberRepo } from '../../i-org-member.repo';
import { OrgMember } from '../../domain';
import { EOrgMemberStatus } from '../../../../../infrastructure/persistence/entities/org-member.entity';
import { InviteMemberCommand } from './invite-member.command';

@CommandHandlerStrict(InviteMemberCommand)
export class InviteMemberCommandHandler implements ICommandHandler<InviteMemberCommand, OrgMember> {
  constructor(
    @Inject(USER_REPO) private readonly userRepo: IUserRepo,
    @Inject(ORG_MEMBER_REPO) private readonly orgMemberRepo: IOrgMemberRepo,
    @Inject(CLERK_SERVICE) private readonly clerkService: IClerkService,
    @InjectPinoLogger(InviteMemberCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: InviteMemberCommand): Promise<OrgMember> {
    this.logger.info({ email: command.email, organizationId: command.organizationId }, 'Inviting member');

    const invitee = await this.userRepo.findOneAsync({ email: command.email });

    if (invitee) {
      const existing = await this.orgMemberRepo.findByUserAndOrgAsync(invitee.id, command.organizationId);
      if (existing) {
        throw new ConflictException('User is already a member of this organization');
      }
    }

    const membership = await this.orgMemberRepo.createAsync({
      organizationId: command.organizationId,
      userId: invitee ? invitee.id : null,
      invitedEmail: invitee ? undefined : command.email,
      invitedAt: new Date(),
      roleId: command.roleId,
      invitedById: command.invitedByUserId,
      status: EOrgMemberStatus.Invited,
      joinedAt: null,
    } as unknown as OrgMember);

    await this.clerkService.inviteUserAsync({ email: command.email });

    return membership;
  }
}
```

Also add `{ provide: CLERK_SERVICE, useClass: ClerkService }` to `core-apis/src/application/modules/auth/auth.module.ts`'s `providers` array (it already imports `ClerkService` — just add the token binding alongside the existing `ClerkService` entry, mirroring `core-apis/src/application/modules/users/users.module.ts:11`):

```typescript
import { CLERK_SERVICE, ClerkJwtStrategy, ClerkService, RolesGuard, CLERK_STRATEGY } from '../../../common';
// ...
  providers: [
    ClerkJwtStrategy,
    ClerkService,
    { provide: CLERK_SERVICE, useClass: ClerkService },
    RolesGuard,
    AuthProfile,
    ...AuthCommandHandlers,
    ...AuthQueryHandlers,
  ],
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd core-apis && npx jest invite-member.command-handler.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Build check**

Run: `cd core-apis && npm run build`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
cd core-apis
git add src/application/modules/auth/commands/invite-member/invite-member.command-handler.ts src/application/modules/auth/commands/invite-member/invite-member.command-handler.spec.ts src/application/modules/auth/auth.module.ts
git commit -m "fix: allow inviting unregistered emails, actually send the invite"
```

---

### Task 3: Reconcile pending invites on sign-in, sync phone

**Files:**
- Modify: `core-apis/src/application/modules/auth/commands/sync-user/sync-user.command-handler.ts`
- Modify: `core-apis/src/application/modules/auth/commands/sync-user/sync-user.command.ts`
- Modify: `core-apis/src/application/modules/auth/i-org-member.repo.ts`
- Modify: `core-apis/src/infrastructure/persistence/repositories/org-member.repo.ts`
- Test: `core-apis/src/application/modules/auth/commands/sync-user/sync-user.command-handler.spec.ts`

**Interfaces:**
- Produces: `IOrgMemberRepo.findPendingByEmailAsync(email: string): Promise<OrgMember[]>`, `IOrgMemberRepo.claimPendingAsync(id: string, userId: string): Promise<void>`.
- Consumes (from Task 1): `EOrgMemberStatus`.

- [ ] **Step 1: Write the failing test**

Create `core-apis/src/application/modules/auth/commands/sync-user/sync-user.command-handler.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { USER_REPO, ORG_MEMBER_REPO } from '../../../../constants';
import { SyncUserCommandHandler } from './sync-user.command-handler';
import { SyncUserCommand } from './sync-user.command';
import { EOrgMemberStatus } from '../../../../../infrastructure/persistence/entities/org-member.entity';

describe('SyncUserCommandHandler', () => {
  const userRepo = { upsertByClerkIdAsync: jest.fn() };
  const orgMemberRepo = { findPendingByEmailAsync: jest.fn(), claimPendingAsync: jest.fn() };
  let handler: SyncUserCommandHandler;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        SyncUserCommandHandler,
        { provide: USER_REPO, useValue: userRepo },
        { provide: ORG_MEMBER_REPO, useValue: orgMemberRepo },
        { provide: getLoggerToken(SyncUserCommandHandler.name), useValue: { info: jest.fn() } },
      ],
    }).compile();
    handler = module.get(SyncUserCommandHandler);
  });

  function command(): SyncUserCommand {
    const c = new SyncUserCommand();
    c.clerkUserId = 'clerk-1';
    c.email = 'pending@acme.com';
    c.firstName = 'Pat';
    c.lastName = 'Doe';
    c.phone = '+15551234567';
    return c;
  }

  it('claims matching pending invites and passes phone through to the upsert', async () => {
    const user = { id: 'user-1', email: 'pending@acme.com' };
    userRepo.upsertByClerkIdAsync.mockResolvedValue(user);
    orgMemberRepo.findPendingByEmailAsync.mockResolvedValue([{ id: 'member-1' }, { id: 'member-2' }]);

    await handler.execute(command());

    expect(userRepo.upsertByClerkIdAsync).toHaveBeenCalledWith('clerk-1', expect.objectContaining({ phone: '+15551234567' }));
    expect(orgMemberRepo.findPendingByEmailAsync).toHaveBeenCalledWith('pending@acme.com');
    expect(orgMemberRepo.claimPendingAsync).toHaveBeenCalledWith('member-1', 'user-1');
    expect(orgMemberRepo.claimPendingAsync).toHaveBeenCalledWith('member-2', 'user-1');
  });

  it('does nothing extra when there are no pending invites for the email', async () => {
    userRepo.upsertByClerkIdAsync.mockResolvedValue({ id: 'user-1', email: 'nobody-invited@acme.com' });
    orgMemberRepo.findPendingByEmailAsync.mockResolvedValue([]);

    await handler.execute(command());

    expect(orgMemberRepo.claimPendingAsync).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd core-apis && npx jest sync-user.command-handler.spec.ts`
Expected: FAIL — `SyncUserCommand` has no `phone` field, handler doesn't call `findPendingByEmailAsync`/`claimPendingAsync`.

- [ ] **Step 3: Add repo methods**

Add to `core-apis/src/application/modules/auth/i-org-member.repo.ts` (inside the existing `IOrgMemberRepo` interface, alongside `findByUserAndOrgAsync`/`findByUserIdAsync`):

```typescript
  findPendingByEmailAsync(email: string): Promise<OrgMember[]>;
  claimPendingAsync(id: string, userId: string): Promise<void>;
```

Add to `core-apis/src/infrastructure/persistence/repositories/org-member.repo.ts` (inside the `OrgMemberRepo` class), and import `EOrgMemberStatus`:

```typescript
  public async findPendingByEmailAsync(email: string): Promise<OrgMember[]> {
    const entities = await this.internalRepo.find({
      where: { invitedEmail: email, status: EOrgMemberStatus.Invited },
    });
    return this.mapToModelArray(entities);
  }

  public async claimPendingAsync(id: string, userId: string): Promise<void> {
    await this.internalRepo.update(id, {
      userId,
      invitedEmail: undefined,
      status: EOrgMemberStatus.Active,
      joinedAt: new Date(),
    });
  }
```

(`undefined` on a TypeORM `.update()` call is dropped, not set to NULL — use `null as unknown as string` if you need the column actually cleared: `invitedEmail: null as unknown as string`. Use that form.)

- [ ] **Step 4: Update SyncUserCommand and handler**

Add `phone` to `core-apis/src/application/modules/auth/commands/sync-user/sync-user.command.ts`:

```typescript
  @AutoMap() public phone?: string;
```

(add this line inside the existing `SyncUserCommand` class, alongside `email`/`firstName`/`lastName`/`imageUrl`)

Replace `core-apis/src/application/modules/auth/commands/sync-user/sync-user.command-handler.ts`:

```typescript
import { Inject } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict } from '../../../../../common';
import { USER_REPO, ORG_MEMBER_REPO } from '../../../../constants';
import { User } from '../../../users/domain';
import { IUserRepo } from '../../../users';
import { IOrgMemberRepo } from '../../i-org-member.repo';
import { SyncUserCommand } from './sync-user.command';

@CommandHandlerStrict(SyncUserCommand)
export class SyncUserCommandHandler implements ICommandHandler<SyncUserCommand, User> {
  constructor(
    @Inject(USER_REPO) private readonly userRepo: IUserRepo,
    @Inject(ORG_MEMBER_REPO) private readonly orgMemberRepo: IOrgMemberRepo,
    @InjectPinoLogger(SyncUserCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: SyncUserCommand): Promise<User> {
    this.logger.info({ clerkUserId: command.clerkUserId }, 'Syncing Clerk user to DB');

    const user = await this.userRepo.upsertByClerkIdAsync(command.clerkUserId, {
      email: command.email,
      firstName: command.firstName,
      lastName: command.lastName,
      avatarUrl: command.imageUrl,
      phone: command.phone,
      isActive: true,
    });

    const pending = await this.orgMemberRepo.findPendingByEmailAsync(command.email);
    for (const membership of pending) {
      await this.orgMemberRepo.claimPendingAsync(membership.id, user.id);
    }

    return user;
  }
}
```

- [ ] **Step 5: Wire `phone` from the Clerk JWT into the command**

Check `core-apis/src/common/auth/strategies/clerk-jwt.strategy.ts` for where `SyncUserCommand` (or the equivalent enrichment call feeding `POST /auth/sync`) is constructed from the Clerk payload, and pass `phone` through from `clerkJwtPayload.phone_number` (or the JWT claim actually present — read the strategy file's existing field mapping for `email`/`firstName` to match the exact claim names it already uses, since the plan can't see the live JWT shape). Add the equivalent `phone` line next to wherever `email` is currently assigned.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd core-apis && npx jest sync-user.command-handler.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 7: Build check**

Run: `cd core-apis && npm run build`
Expected: no errors

- [ ] **Step 8: Commit**

```bash
cd core-apis
git add src/application/modules/auth/commands/sync-user/ src/application/modules/auth/i-org-member.repo.ts src/infrastructure/persistence/repositories/org-member.repo.ts src/common/auth/strategies/clerk-jwt.strategy.ts
git commit -m "feat: reconcile pending invites and sync phone on sign-in"
```

---

### Task 4: List/search org members endpoint

**Files:**
- Create: `core-apis/src/application/modules/auth/queries/list-org-members/list-org-members.query.ts`
- Create: `core-apis/src/application/modules/auth/queries/list-org-members/list-org-members.query-handler.ts`
- Create: `core-apis/src/application/modules/auth/queries/list-org-members/index.ts`
- Create: `core-apis/src/application/modules/auth/models/requests/list-org-members.request.ts`
- Create: `core-apis/src/application/modules/auth/models/responses/org-member-detail.response.ts`
- Modify: `core-apis/src/application/modules/auth/queries/index.ts`
- Modify: `core-apis/src/application/modules/auth/models/requests/index.ts`
- Modify: `core-apis/src/application/modules/auth/models/responses/index.ts`
- Modify: `core-apis/src/application/modules/auth/i-org-member.repo.ts`
- Modify: `core-apis/src/infrastructure/persistence/repositories/org-member.repo.ts`
- Modify: `core-apis/src/application/modules/auth/auth.controller.ts`

**Interfaces:**
- Produces: `GET /api/v1/auth/members?$page&$perPage&name` → `{ items: OrgMemberDetailResponse[], total: number, page: number, perPage: number, totalPages: number }`
- `OrgMemberDetailResponse`: `{ id, firstName, lastName, email, phone, createdAt, isActive, role, status, invitedEmail }` (`firstName`/`lastName`/`email`/`phone`/`createdAt`/`isActive` are `null` for pending rows; `invitedEmail` is `null` for active rows).

- [ ] **Step 1: Add the repo query method**

Add to `core-apis/src/application/modules/auth/i-org-member.repo.ts`:

```typescript
import { OrgMemberEntity } from '../../../infrastructure/persistence/entities';
// (add alongside existing imports)

export type OrgMemberSearchResult = {
  items: OrgMemberEntity[];
  total: number;
};

// inside IOrgMemberRepo:
  searchWithDetailsAsync(organizationId: string, search: string | undefined, page: number, perPage: number): Promise<OrgMemberSearchResult>;
```

Add to `core-apis/src/infrastructure/persistence/repositories/org-member.repo.ts` (inside `OrgMemberRepo`):

```typescript
  public async searchWithDetailsAsync(
    organizationId: string,
    search: string | undefined,
    page: number,
    perPage: number,
  ): Promise<{ items: OrgMemberEntity[]; total: number }> {
    const qb = this.internalRepo
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('member.role', 'role')
      .where('member.org_id = :organizationId', { organizationId });

    if (search) {
      qb.andWhere(
        '(user.first_name ILIKE :search OR user.last_name ILIKE :search OR user.email ILIKE :search OR member.invited_email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('member.invited_at', 'DESC', 'NULLS LAST')
      .addOrderBy('user.created_at', 'DESC', 'NULLS LAST')
      .skip((page - 1) * perPage)
      .take(perPage);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }
```

This is a direct `createQueryBuilder` on `OrgMemberEntity`, matching the `InventoryRepo` precedent for cross-relation queries the generic `pagedAsync`/`Filter` mechanism can't express (it only filters on the entity's own columns, not joined relations).

- [ ] **Step 2: Response DTO and request DTO**

Create `core-apis/src/application/modules/auth/models/responses/org-member-detail.response.ts`:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrgMemberDetailResponse {
  @ApiProperty() public id: string;
  @ApiPropertyOptional({ nullable: true }) public firstName: string | null;
  @ApiPropertyOptional({ nullable: true }) public lastName: string | null;
  @ApiPropertyOptional({ nullable: true }) public email: string | null;
  @ApiPropertyOptional({ nullable: true }) public phone: string | null;
  @ApiPropertyOptional({ nullable: true }) public createdAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) public isActive: boolean | null;
  @ApiProperty() public role: string;
  @ApiProperty() public status: string;
  @ApiPropertyOptional({ nullable: true }) public invitedEmail: string | null;
}

export class OrgMemberListResponse {
  @ApiProperty({ type: [OrgMemberDetailResponse] }) public items: OrgMemberDetailResponse[];
  @ApiProperty() public total: number;
  @ApiProperty() public page: number;
  @ApiProperty() public perPage: number;
  @ApiProperty() public totalPages: number;
}
```

Add both exports to `core-apis/src/application/modules/auth/models/responses/index.ts`.

Create `core-apis/src/application/modules/auth/models/requests/list-org-members.request.ts` (mirrors `core-apis/src/application/modules/products/models/requests/search-products.request.ts`):

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListOrgMembersRequest {
  @ApiPropertyOptional() @IsOptional() @IsString() public name?: string;

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(1) public $page?: number = 1;

  @ApiPropertyOptional({ default: 15 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(1) public $perPage?: number = 15;
}
```

Add the export to `core-apis/src/application/modules/auth/models/requests/index.ts`.

- [ ] **Step 3: Query and handler**

Create `core-apis/src/application/modules/auth/queries/list-org-members/list-org-members.query.ts`:

```typescript
import { AutoMap } from '@automapper/classes';
import { QueryBase } from '../../../../../common';

export class ListOrgMembersQuery extends QueryBase {
  @AutoMap() public organizationId: string;
  @AutoMap() public name?: string;
  @AutoMap() public page: number;
  @AutoMap() public perPage: number;
}
```

Create `core-apis/src/application/modules/auth/queries/list-org-members/list-org-members.query-handler.ts`:

```typescript
import { Inject } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { QueryHandlerStrict, countPages } from '../../../../../common';
import { ORG_MEMBER_REPO } from '../../../../constants';
import { IOrgMemberRepo } from '../../i-org-member.repo';
import { OrgMemberDetailResponse, OrgMemberListResponse } from '../../models';
import { ListOrgMembersQuery } from './list-org-members.query';

@QueryHandlerStrict(ListOrgMembersQuery)
export class ListOrgMembersQueryHandler implements IQueryHandler<ListOrgMembersQuery, OrgMemberListResponse> {
  constructor(
    @Inject(ORG_MEMBER_REPO) private readonly orgMemberRepo: IOrgMemberRepo,
    @InjectPinoLogger(ListOrgMembersQueryHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(query: ListOrgMembersQuery): Promise<OrgMemberListResponse> {
    this.logger.info(`Executing ${ListOrgMembersQuery.name} organizationId=${query.organizationId}`);

    const { items, total } = await this.orgMemberRepo.searchWithDetailsAsync(
      query.organizationId,
      query.name,
      query.page,
      query.perPage,
    );

    return {
      items: items.map((member): OrgMemberDetailResponse => ({
        id: member.id,
        firstName: member.user?.firstName ?? null,
        lastName: member.user?.lastName ?? null,
        email: member.user?.email ?? null,
        phone: member.user?.phone ?? null,
        createdAt: member.user?.createdAt ?? null,
        isActive: member.user?.isActive ?? null,
        role: member.role?.name ?? '',
        status: member.status,
        invitedEmail: member.invitedEmail ?? null,
      })),
      total,
      page: query.page,
      perPage: query.perPage,
      totalPages: countPages(total, query.perPage),
    };
  }
}
```

Create `core-apis/src/application/modules/auth/queries/list-org-members/index.ts`:

```typescript
export * from './list-org-members.query';
export * from './list-org-members.query-handler';
```

Update `core-apis/src/application/modules/auth/queries/index.ts`:

```typescript
import { GetMeQueryHandler } from './get-me';
import { GetTokenQueryHandler } from './get-token';
import { ListOrgMembersQueryHandler } from './list-org-members';

export * from './get-me';
export * from './get-token';
export * from './list-org-members';

export const AuthQueryHandlers = [GetMeQueryHandler, GetTokenQueryHandler, ListOrgMembersQueryHandler];
```

- [ ] **Step 4: Controller endpoint**

Add to `core-apis/src/application/modules/auth/auth.controller.ts` (new route, alongside the existing `POST /auth/invite`; add the needed imports — `ListOrgMembersRequest`, `OrgMemberListResponse`, `ListOrgMembersQuery`, `Query` from `@nestjs/common`):

```typescript
  // ── GET /auth/members ────────────────────────────────────────────────────────
  @ApiOperation({ summary: 'List/search organization members (active + pending invites)' })
  @ApiOkResponse({ type: OrgMemberListResponse })
  @HttpCode(HttpStatus.OK)
  @Get('members')
  public async listMembers(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() params: ListOrgMembersRequest,
  ): Promise<OrgMemberListResponse> {
    const query = new ListOrgMembersQuery();
    query.organizationId = currentUser.organizationId;
    query.name = params.name;
    query.page = params.$page ?? 1;
    query.perPage = params.$perPage ?? 15;
    return this.mediator.execute<ListOrgMembersQuery, OrgMemberListResponse>(query);
  }
```

Route order note: NestJS matches routes in declaration order and `:id`-less literal segments (`members`) never collide with this controller's other routes (`invite`, `me`) since none of them are parameterized at the top level — no reordering needed.

- [ ] **Step 5: Build check**

Run: `cd core-apis && npm run build`
Expected: no errors

- [ ] **Step 6: Manual verification**

Run: `npm run start:dev` (or equivalent), then `curl -H "Authorization: Bearer <token>" http://localhost:<port>/api/v1/auth/members`
Expected: `200` with `{ items: [...], total, page, perPage, totalPages }`, including the currently-onboarded org admin as one active row.

- [ ] **Step 7: Commit**

```bash
cd core-apis
git add src/application/modules/auth/
git commit -m "feat: add GET /auth/members list/search endpoint"
```

---

### Task 5: Frontend — real member table, wired to the new endpoint

**Files:**
- Modify: `ERP-Client/renderer/src/api.ts`
- Modify: `ERP-Client/renderer/src/types.ts`
- Modify: `ERP-Client/renderer/src/pages/Users.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/auth/members` (Task 4).
- Produces: `OrgMembers` resource (`ERP-Client/renderer/src/api.ts`), `OrgMemberDetail` type (`ERP-Client/renderer/src/types.ts`).

- [ ] **Step 1: Check the starting point**

Run: `cd ERP-Client && git diff renderer/src/pages/Users.tsx renderer/src/api.ts`
This shows uncommitted local changes already sitting in the working tree (an earlier, incomplete pass at this same page). Read the current file with `Read`, not the diff — the diff shows deltas from `HEAD`, but the working file is where you edit from.

- [ ] **Step 2: Add the type and resource**

Add to `ERP-Client/renderer/src/types.ts`, near `PlatformUser`:

```typescript
export interface OrgMemberDetail {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string | null;
  isActive: boolean | null;
  role: string;
  status: string;
  invitedEmail: string | null;
}
```

Add to `ERP-Client/renderer/src/api.ts`, near the `Users` resource declaration:

```typescript
export const OrgMembers = createResource<OrgMemberDetail>('/api/v1/auth/members', 'org-members', 'Member');
```

Add `OrgMemberDetail` to the type-only import list at the top of `api.ts` (alongside `PlatformUser`).

- [ ] **Step 3: Rewrite the list section of Users.tsx**

In `ERP-Client/renderer/src/pages/Users.tsx`:

- Change the import from `PlatformUser` to also import `OrgMemberDetail` from `'../types'`.
- Import `OrgMembers` from `'../api'` alongside the existing `Users, Organizations, Locations`.
- Replace `Users.useSearch(...)` with `OrgMembers.useSearch(...)` — same call shape (`{ page, limit: 15, search: debouncedSearch }`), just a different resource.
- Replace the `columns` array's row type from `PlatformUser` to `OrgMemberDetail`, and update `render` to fall back to the invite email for pending rows:

```typescript
function memberDisplayName(row: OrgMemberDetail) {
  return [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
}

const columns: Column<OrgMemberDetail>[] = [
  { key: 'name', label: 'Name', render: (row) => memberDisplayName(row) || '—' },
  { key: 'email', label: 'Email', render: (row) => row.email || row.invitedEmail || '—' },
  { key: 'phone', label: 'Phone', render: (row) => row.phone || '—' },
  { key: 'createdAt', label: 'Created', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—' },
  { key: 'role', label: 'Role', render: (row) => row.role || '—' },
  { key: 'status', label: 'Status', render: (row) => row.status === 'invited' ? 'Pending' : (row.isActive ? 'Active' : 'Inactive') },
];
```

- Update the `ViewDrawer` row-detail block and `viewRow` state type from `PlatformUser` to `OrgMemberDetail` to match.
- Leave the "New User" `FormDrawer` (still uses `Users.useCreate()`, unrelated DB-provisioning flow, out of scope) and the "Invite member" `FormDrawer` (already correct — email + roleId via `AuthService.inviteMember`) as they are.

- [ ] **Step 4: Manual verification**

Run: `cd ERP-Client && npm run dev` (or the project's existing dev script), open the Users page.
Expected: table shows real org members with name/email/phone/created/role/status columns; inviting a brand-new email (one that doesn't exist in `UserEntity`) succeeds and the row shows "Pending" status with the invited email under the Email column.

- [ ] **Step 5: Commit**

```bash
cd ERP-Client
git add renderer/src/api.ts renderer/src/types.ts renderer/src/pages/Users.tsx
git commit -m "feat: wire Users page to the real org-members directory"
```

---

### Task 6: Pending-invites side panel

**Files:**
- Create: `ERP-Client/renderer/src/components/PendingInvitesPanel.tsx`
- Modify: `ERP-Client/renderer/src/pages/Users.tsx`
- Modify: `core-apis/src/application/modules/auth/auth.controller.ts`
- Create: `core-apis/src/application/modules/auth/commands/revoke-invite/` (command + handler + index, mirroring `invite-member`'s file layout)
- Modify: `core-apis/src/application/modules/auth/commands/index.ts`

**Interfaces:**
- Produces: `DELETE /api/v1/auth/members/:id` (revoke a pending invite — hard-deletes the `org_member` row; only valid while `status === 'invited'`), reuses `GET /api/v1/auth/members` filtered client-side to `status === 'invited'` for the panel list (no new list endpoint needed — the org's member count is small enough that fetching one page with `omitPagination` and filtering client-side is the pragmatic choice here over a second server-side status filter).

- [ ] **Step 1: Backend — revoke command**

Create `core-apis/src/application/modules/auth/commands/revoke-invite/revoke-invite.command.ts`:

```typescript
import { AutoMap } from '@automapper/classes';
import { CommandBase } from '../../../../../common';

export class RevokeInviteCommand extends CommandBase {
  @AutoMap() public id: string;
  @AutoMap() public organizationId: string;
}
```

Create `core-apis/src/application/modules/auth/commands/revoke-invite/revoke-invite.command-handler.ts`:

```typescript
import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CommandHandlerStrict } from '../../../../../common';
import { ORG_MEMBER_REPO } from '../../../../constants';
import { IOrgMemberRepo } from '../../i-org-member.repo';
import { EOrgMemberStatus } from '../../../../../infrastructure/persistence/entities/org-member.entity';
import { RevokeInviteCommand } from './revoke-invite.command';

@CommandHandlerStrict(RevokeInviteCommand)
export class RevokeInviteCommandHandler implements ICommandHandler<RevokeInviteCommand, void> {
  constructor(
    @Inject(ORG_MEMBER_REPO) private readonly orgMemberRepo: IOrgMemberRepo,
    @InjectPinoLogger(RevokeInviteCommandHandler.name) private readonly logger: PinoLogger,
  ) {}

  public async execute(command: RevokeInviteCommand): Promise<void> {
    this.logger.info(`Executing ${RevokeInviteCommand.name} id=${command.id}`);
    const member = await this.orgMemberRepo.getAsync(command.id);
    if (!member || member.organizationId !== command.organizationId) {
      throw new NotFoundException('Invite not found');
    }
    if (member.status !== EOrgMemberStatus.Invited) {
      throw new BadRequestException('Only pending invites can be revoked');
    }
    await this.orgMemberRepo.deleteAsync(command.id, true);
  }
}
```

Create `core-apis/src/application/modules/auth/commands/revoke-invite/index.ts`:

```typescript
export * from './revoke-invite.command';
export * from './revoke-invite.command-handler';
```

Update `core-apis/src/application/modules/auth/commands/index.ts` to add `RevokeInviteCommandHandler` to the imports, exports, and `AuthCommandHandlers` array (same shape as the existing three entries).

Add to `core-apis/src/application/modules/auth/auth.controller.ts` (needs `Delete`, `Param` from `@nestjs/common` already imported at top; add `RevokeInviteCommand` import):

```typescript
  // ── DELETE /auth/members/:id ─────────────────────────────────────────────────
  @ApiOperation({ summary: 'Revoke a pending invite' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(ERole.OrgAdmin, ERole.SuperAdmin)
  @Delete('members/:id')
  public async revokeInvite(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    const command = new RevokeInviteCommand();
    command.id = id;
    command.organizationId = currentUser.organizationId;
    await this.mediator.execute<RevokeInviteCommand, void>(command);
  }
```

- [ ] **Step 2: Frontend panel component**

Create `ERP-Client/renderer/src/components/PendingInvitesPanel.tsx`:

```tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { Settings, X, Mail } from 'lucide-react';
import { Button } from './ui/button';
import { OrgMembers } from '../api';
import { del } from '../lib/http';
import { useQueryClient } from '@tanstack/react-query';
import type { OrgMemberDetail } from '../types';

export function PendingInvitesTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="icon" onClick={() => setOpen(true)} title="Pending invites">
        <Settings size={16} />
      </Button>
      {open && <PendingInvitesPanel onClose={() => setOpen(false)} />}
    </>
  );
}

function PendingInvitesPanel({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = OrgMembers.useSearch({ omitPagination: true });
  const pending = (data?.items ?? []).filter((m: OrgMemberDetail) => m.status === 'invited');

  const revoke = async (id: string) => {
    try {
      await del(`/api/v1/auth/members/${id}`);
      toast.success('Invite revoked');
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke invite');
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 border-l border-border bg-card p-4 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Pending invites</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="text-xs text-muted-foreground">No pending invites.</p>
      ) : (
        <ul className="space-y-2">
          {pending.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
              <span className="flex items-center gap-1.5 truncate"><Mail size={13} className="shrink-0 text-muted-foreground" />{m.invitedEmail}</span>
              <Button variant="ghost" size="sm" onClick={() => revoke(m.id)}>Revoke</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

Check `ERP-Client/renderer/src/lib/http.ts` exports a `del(path)` function before using it as above (it's already imported that way in `renderer/src/lib/resource.ts` — reuse the same import).

- [ ] **Step 3: Wire the trigger into Users.tsx**

In the `toolbar` prop of the `DataTable` in `ERP-Client/renderer/src/pages/Users.tsx`, add `<PendingInvitesTrigger />` next to the "Invite member" button, and import it from `'../components/PendingInvitesPanel'`.

- [ ] **Step 4: Build check**

Run: `cd core-apis && npm run build && cd ../ERP-Client && npx tsc --noEmit` (adjust the frontend typecheck command to whatever this repo's `package.json` defines, e.g. `npm run typecheck`)
Expected: no errors in either repo.

- [ ] **Step 5: Manual verification**

Send an invite to a new email, open the pending-invites panel via the gear icon, confirm the invite shows with its email, click Revoke, confirm it disappears and re-inviting the same email now works again (the partial unique index no longer blocks it).

- [ ] **Step 6: Commit**

```bash
cd core-apis && git add src/application/modules/auth/ && git commit -m "feat: add revoke-pending-invite endpoint"
cd ../ERP-Client && git add renderer/src/components/PendingInvitesPanel.tsx renderer/src/pages/Users.tsx && git commit -m "feat: add pending-invites side panel"
```

---

## Self-Review Notes

- **Spec coverage:** list with name/email/phone/created/role/status (Task 4+5) — covered. Pending tracking (Task 3, 6) — covered. Invite by email+role (Task 2) — covered. Gear-icon side panel (Task 6) — covered.
- **Type consistency:** `OrgMemberDetail`/`OrgMemberDetailResponse` field names match exactly between backend response and frontend type across Tasks 4–6.
- **Known gap to flag during execution, not silently fixed here:** Task 3 Step 5 (wiring `phone` from the Clerk JWT strategy) names the file to edit but not the exact claim name, since that depends on live JWT contents this plan didn't fetch — the implementer must open `clerk-jwt.strategy.ts` and match the existing `email`/`firstName` extraction pattern.
