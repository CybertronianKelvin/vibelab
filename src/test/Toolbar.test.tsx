import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Toolbar } from "../components/Toolbar/Toolbar";
import { useStore } from "../store";

beforeEach(() => {
  useStore.setState({ language: "js", isRunning: false });
});

describe("Toolbar", () => {
  it("renders JS and TS buttons", () => {
    render(<Toolbar onRun={vi.fn()} />);
    expect(screen.getByText("JS")).toBeInTheDocument();
    expect(screen.getByText("TS")).toBeInTheDocument();
  });

  it("calls onRun when Run button is clicked", async () => {
    const user = userEvent.setup();
    const onRun = vi.fn();
    render(<Toolbar onRun={onRun} />);
    await user.click(screen.getByRole("button", { name: /Run/ }));
    expect(onRun).toHaveBeenCalledOnce();
  });

  it("disables Run button while running", () => {
    useStore.setState({ isRunning: true });
    render(<Toolbar onRun={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Running/ })).toBeDisabled();
  });

  it("switches language to TS when TS is clicked", async () => {
    const user = userEvent.setup();
    render(<Toolbar onRun={vi.fn()} />);
    await user.click(screen.getByText("TS"));
    expect(useStore.getState().language).toBe("ts");
  });

  it("switches language back to JS", async () => {
    const user = userEvent.setup();
    useStore.setState({ language: "ts" });
    render(<Toolbar onRun={vi.fn()} />);
    await user.click(screen.getByText("JS"));
    expect(useStore.getState().language).toBe("js");
  });
});
