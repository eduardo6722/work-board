# React component examples

## useState

```tsx
export default function Counter() {
  const [value, setValue] = useState(0);

  const handleClick = () => {
    setValue((previous) => previous + 1);
  };

  return (
    <button type="button" onClick={handleClick}>
      {value}
    </button>
  );
}
```

## React Hook Form + TanStack Query + custom hook

```tsx
"use client";

export default function CreateTaskForm() {
  const form = useForm({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { title: "" },
  });
  const query = useQuery({ queryKey: boardKeys.state(), queryFn: getBoard });
  const createTask = useCreateTask();

  const isSubmitting = createTask.isPending;
  const isEmpty = (query.data?.columns.todo.length ?? 0) === 0;

  const handleSubmit = form.handleSubmit((values) => {
    createTask.mutate(values);
  });

  return <form onSubmit={handleSubmit}>{isEmpty ? <p>No tasks</p> : null}</form>;
}
```

## useEffect only for external sync

```tsx
export default function TitleSync() {
  const [title, setTitle] = useState("Work Board");

  useEffect(() => {
    document.title = title;
  }, [title]);

  return <input value={title} onChange={(event) => setTitle(event.target.value)} />;
}
```

## No hooks / Server Component

```tsx
export default function PageHeader() {
  return <h1>Work Board</h1>;
}
```

## Exception

If a library hook requires a value, compute it first even if that looks like a constant before a library hook. Document the exception.
