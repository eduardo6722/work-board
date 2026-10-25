# React component organization

Project-owned React function components use this body order:

1. States
2. Library hooks
3. Custom hooks
4. Constants and derived values
5. Functions and handlers
6. Effects
7. Return

Prefer named default function declarations:

```tsx
export default function CreateTaskForm() {
  const form = useForm({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { title: "" },
  });
  const createTask = useCreateTask();
  const isSubmitting = createTask.isPending;

  const handleSubmit = form.handleSubmit((values) => {
    createTask.mutate(values);
  });

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

## Rules of Hooks take priority

Do not call hooks inside conditions, loops, or nested functions. If a hook needs a locally computed value, compute that value first. Early returns are allowed after hooks. Server Components must not be converted to Client Components merely to satisfy this convention.

Vendored shadcn primitives in `@repo/ui` are not required to follow this order.

The ESLint rule `react-component-structure/react-component-structure` enforces the order in `apps/web`. Justified exceptions can use a disable comment with a reason.

See `.cursor/skills/create-react-component/SKILL.md` and `.cursor/rules/react-component-structure.mdc`.
