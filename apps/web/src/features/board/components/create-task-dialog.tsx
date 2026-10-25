"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createTaskSchema } from "@repo/contracts";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
import { useState } from "react";
import { useForm } from "react-hook-form";

import BoardIcon from "./board-icon";

import { useCreateTask } from "../hooks/use-create-task";

type CreateTaskDialogProps = {
  onFeedback: (message: string) => void;
};

export default function CreateTaskDialog({ onFeedback }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
    },
  });
  const createTask = useCreateTask();

  const isSubmitting = createTask.isPending;
  const handleSubmit = form.handleSubmit((values) => {
    setFailure(null);
    createTask.mutate(
      { title: values.title },
      {
        onSuccess: (body) => {
          if (body.result.status === "error") {
            setFailure(body.result.message);
            return;
          }
          onFeedback(body.result.message);
          if (body.result.status === "success") {
            form.reset({ title: "" });
            setOpen(false);
          }
        },
        onError: (error) => {
          const message =
            error instanceof Error ? error.message : "The board could not be saved.";
          setFailure(message);
        },
      },
    );
  });
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
  };

  return (
    <>
      <Button type="button" className="create-task-button" onClick={() => setOpen(true)}>
        <BoardIcon name="plus" />
        Create task
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="create-task-dialog">
          <DialogHeader>
            <span className="dialog-task-icon">
              <BoardIcon name="plus" />
            </span>
            <DialogTitle>New task</DialogTitle>
            <DialogDescription>
              Give your next step a name. It will start in To Do.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="What would you like to work on?"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {failure ? (
                <p className="dialog-error" role="alert">
                  {failure}
                </p>
              ) : null}
              <div className="dialog-actions">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add task"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
