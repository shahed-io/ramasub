import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

/* ----- Dialog ----- */

function ControlledDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button>before</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
          <input aria-label="first" />
          <input aria-label="second" />
          <DialogClose>Done</DialogClose>
        </DialogContent>
      </Dialog>
      <button>after</button>
    </>
  );
}

describe("Dialog (shadcn/Radix)", () => {
  it("opens, traps Tab focus inside, closes on Escape and restores focus", async () => {
    const user = userEvent.setup();
    render(<ControlledDialog />);

    const trigger = screen.getByText("Open");
    await user.click(trigger);

    // Dialog rendered
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Test Dialog")).toBeInTheDocument();

    // Focus inside dialog
    const first = screen.getByLabelText("first");
    const second = screen.getByLabelText("second");
    const close = screen.getByText("Done");

    first.focus();
    expect(first).toHaveFocus();
    await user.tab();
    expect(second).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    // Tab from last → wraps back inside dialog (does NOT escape to "after")
    await user.tab();
    expect(document.activeElement).not.toBe(screen.getByText("after"));
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);

    // Escape closes
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Focus returns to trigger
    expect(trigger).toHaveFocus();
  });

  it("closes via X close button", async () => {
    const user = userEvent.setup();
    render(<ControlledDialog />);
    await user.click(screen.getByText("Open"));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByText("Done"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

/* ----- AlertDialog ----- */

function ControlledAlert() {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger>Delete</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>Cannot be undone</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe("AlertDialog", () => {
  it("traps focus between Cancel and Confirm and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<ControlledAlert />);
    await user.click(screen.getByText("Delete"));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toBeInTheDocument();

    const cancel = screen.getByText("Cancel");
    const confirm = screen.getByText("Confirm");

    cancel.focus();
    await user.tab();
    expect(confirm).toHaveFocus();
    await user.tab();
    // wraps back inside
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("Cancel button closes dialog", async () => {
    const user = userEvent.setup();
    render(<ControlledAlert />);
    await user.click(screen.getByText("Delete"));
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByText("Cancel"));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

/* ----- Sheet ----- */

function ControlledSheet() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>Open Sheet</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Side Panel</SheetTitle>
        </SheetHeader>
        <input aria-label="sheet-input" />
        <SheetClose>Close</SheetClose>
      </SheetContent>
    </Sheet>
  );
}

describe("Sheet", () => {
  it("opens, traps focus, and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<ControlledSheet />);
    await user.click(screen.getByText("Open Sheet"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    const input = screen.getByLabelText("sheet-input");
    input.focus();
    expect(input).toHaveFocus();
    await user.tab();
    // focus stays inside
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
