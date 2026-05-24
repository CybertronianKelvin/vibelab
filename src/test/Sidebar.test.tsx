import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Sidebar } from "../components/Sidebar/Sidebar";
import { useStore } from "../store";
import type { Snippet } from "../types";

vi.mock("../hooks/useSnippets", () => ({
  useSnippets: () => ({
    loadSnippets: vi.fn(),
    saveSnippet: vi.fn().mockResolvedValue({
      id: "new-id",
      name: "My Snippet",
      code: 'console.log("hi")',
      language: "js",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    }),
    deleteSnippet: vi.fn().mockResolvedValue(undefined),
  }),
}));

const testSnippet: Snippet = {
  id: "s1",
  name: "Greet",
  code: 'console.log("hello")',
  language: "js",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

beforeEach(() => {
  useStore.setState({ snippets: [], code: "existing code", language: "js" });
});

describe("Sidebar", () => {
  it("shows empty state when no snippets", () => {
    render(<Sidebar />);
    expect(screen.getByText(/No snippets yet/)).toBeInTheDocument();
  });

  it("renders snippets list", () => {
    useStore.setState({ snippets: [testSnippet] });
    render(<Sidebar />);
    expect(screen.getByText("Greet")).toBeInTheDocument();
    expect(screen.getByText("JS")).toBeInTheDocument();
  });

  it("loads snippet code into editor on click", async () => {
    const user = userEvent.setup();
    useStore.setState({ snippets: [testSnippet] });
    render(<Sidebar />);
    await user.click(screen.getByText("Greet"));
    expect(useStore.getState().code).toBe('console.log("hello")');
  });

  it("save button is disabled when name is empty", () => {
    render(<Sidebar />);
    expect(screen.getByText("+")).toBeDisabled();
  });

  it("save button is enabled when name is typed", async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    await user.type(screen.getByPlaceholderText("Name..."), "My Snippet");
    expect(screen.getByText("+")).not.toBeDisabled();
  });
});
