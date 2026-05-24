import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Console } from "../components/Console/Console";
import { useStore } from "../store";
import type { ExecutionLine } from "../types";

beforeEach(() => {
  useStore.setState({ outputLines: [], isRunning: false });
});

describe("Console", () => {
  it("shows empty state message when no output", () => {
    render(<Console />);
    expect(screen.getByText(/Run some code to see output/)).toBeInTheDocument();
  });

  it("renders stdout lines", () => {
    const line: ExecutionLine = { output_type: "stdout", content: "Hello World", timestamp: 1 };
    useStore.setState({ outputLines: [line] });
    render(<Console />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("renders stderr lines", () => {
    const line: ExecutionLine = { output_type: "stderr", content: "Error: oops", timestamp: 1 };
    useStore.setState({ outputLines: [line] });
    render(<Console />);
    const el = screen.getByText("Error: oops");
    expect(el.closest("div")).toHaveClass("text-red-400");
  });

  it("shows running indicator when isRunning is true", () => {
    useStore.setState({ isRunning: true });
    render(<Console />);
    expect(screen.getByText(/Running/)).toBeInTheDocument();
  });

  it("clears output when Clear is clicked", async () => {
    const user = userEvent.setup();
    const line: ExecutionLine = { output_type: "stdout", content: "to clear", timestamp: 1 };
    useStore.setState({ outputLines: [line] });
    render(<Console />);
    await user.click(screen.getByText("Clear"));
    expect(useStore.getState().outputLines).toHaveLength(0);
  });
});
