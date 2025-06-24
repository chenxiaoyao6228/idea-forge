import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock zustand stores
vi.mock("@/stores/subspace", () => ({
  default: vi.fn(),
}));

vi.mock("@/stores/document", () => ({
  default: vi.fn(),
}));

// Mock fractional-index
vi.mock("fractional-index", () => ({
  default: vi.fn(),
}));

// Mock @dnd-kit/core
vi.mock("@dnd-kit/core", () => ({
  useSensor: vi.fn(),
  useSensors: vi.fn(),
  PointerSensor: vi.fn(),
}));
