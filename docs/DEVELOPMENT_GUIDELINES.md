# ERP-Client Development Guidelines & Best Practices

This document serves as the central source of truth for developing, maintaining, and structuring the `ERP-Client` application. It is based on the specific tech stack we are using (React 19, TypeScript, Electron, Vite, Tailwind CSS, TanStack Query, Radix UI, Clerk).

---

## 1. Architecture Overview

`ERP-Client` is an Electron application. It has two distinct environments:
- **Main Process (`src/main/`)**: Runs in a Node.js environment. It is responsible for creating windows, interacting with the operating system (file system, hardware), and managing the application lifecycle.
- **Renderer Process (`renderer/src/`)**: This is the React application. It runs in a Chromium web environment and handles the UI.

> [!WARNING]
> **Separation of Concerns:** Never attempt to use Node.js modules directly in the Renderer process, and never try to manipulate the DOM in the Main process. Use `contextBridge` to communicate via IPC (Inter-Process Communication).

---

## 2. Folder Structure Best Practices

We follow a hybrid feature-based and type-based folder structure for the **Renderer** process. 

```text
renderer/src/
├── api/             # Global API definitions (if any) or API clients.
├── components/      # Global, reusable UI components (buttons, inputs, modals).
│   ├── ui/          # Radix/Tailwind generic components (shadcn style).
│   └── shared/      # Complex components used across multiple pages.
├── config/          # Environment variables, constants, global settings.
├── context/         # React Context providers (Auth, Theme). Keep this minimal!
├── hooks/           # Global custom hooks (e.g., useWindowSize, useKeyPress).
├── lib/             # Utility functions, formatters, and third-party wrappers (e.g., utils.ts for tailwind-merge).
├── pages/           # Page-level components. Each folder represents a route.
│   ├── Dashboard/
│   │   ├── components/ # Components specific ONLY to the Dashboard.
│   │   ├── hooks/      # Hooks specific ONLY to the Dashboard.
│   │   └── index.tsx   # Main entry point for the page.
├── services/        # Abstractions for external services (if not using React Query directly).
├── types.ts         # Global TypeScript definitions.
└── App.tsx          # Main React component and Route definitions.
```

> [!TIP]
> **Co-location:** Keep things that change together close to each other. If a component, hook, or type is only used on the `Invoice` page, it belongs inside `pages/Invoice/`, not in the global `src/components/` folder.

---

## 3. Maintaining Code & Logic

### Data Fetching & State
We use **TanStack React Query** for server state. 
- **DO NOT** use `useEffect` and `useState` to fetch data.
- **DO** create custom hooks for your queries and mutations.

```typescript
// ✅ GOOD: Abstracting the query logic
export const useGetInvoices = () => {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: fetchInvoices
  });
};
```

### Global State (Context)
- Use **Context** only for data that truly needs to be global and changes infrequently (e.g., Theme, Current User Session, Language).
- For rapidly changing global state, consider Zustand instead of Context to prevent unnecessary re-renders, but for now, rely heavily on React Query cache as your global state for server data.

### Component Logic
- **Fat Hooks, Skinny Components:** Move complex logic out of your UI components and into custom hooks. Your JSX should be easy to read and focused on rendering.

---

## 4. UI & Styling (Tailwind + Radix)

We use Tailwind CSS v4 and Radix UI primitives.

### The `cn` Utility
Always use the `cn` utility (combining `clsx` and `tailwind-merge`) when applying classes conditionally or accepting `className` props.

```typescript
// ✅ GOOD: Prevents class conflicts
import { cn } from "@/lib/utils"

export function Button({ className, ...props }) {
  return (
    <button className={cn("bg-blue-500 rounded p-2", className)} {...props} />
  )
}
```

### Building Components
- **Don't reinvent the wheel:** If you need a dropdown, dialog, or select menu, use the pre-built Radix UI primitives. They handle accessibility (ARIA, keyboard navigation) out of the box.
- Avoid using arbitrary inline styles. Stick to Tailwind classes to maintain the design system.

---

## 5. What We HAVE To Do (The DOs)

1. **Use TypeScript Strictly:** Avoid `any`. Define proper interfaces for your API responses, component props, and context states.
2. **Handle Loading & Error States:** Every network request (handled via React Query) must have a loading skeleton/spinner and a fallback UI for errors.
3. **Use Absolute Imports:** Configure your `tsconfig.json` and Vite to use `@/` for imports relative to the `src` directory to avoid `../../../../../components`.
4. **Follow Naming Conventions:**
   - React Components: `PascalCase.tsx`
   - Hooks: `camelCase.ts` (must start with `use`)
   - Utilities/Lib: `camelCase.ts`
   - Types/Interfaces: Start with `I` (e.g., `IInvoice`) or use descriptive noun (e.g., `InvoiceData`).

---

## 6. What We DO NOT Have To Do (The DONTs)

1. **DON'T bloat the global `components/` folder:** Only put truly universal building blocks there.
2. **DON'T put secrets in the Renderer:** Never hardcode API keys or secrets in the React code. If needed, they must be injected via secure IPC from the Main process or securely handled by backend APIs.
3. **DON'T use Redux:** React Query handles 90% of state needs (server state). For the remaining 10% (UI state like 'is sidebar open'), simple React Context or a tiny library like Zustand is preferred.
4. **DON'T use heavy generic CSS classes:** Stick to the atomic nature of Tailwind. Do not write custom CSS in `index.css` unless absolutely necessary (like declaring CSS variables for the theme).
5. **DON'T ignore accessibility:** Always use Radix primitives for interactive elements to ensure the app is usable via keyboard and screen readers.
