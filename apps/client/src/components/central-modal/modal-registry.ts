import React from "react";

// Global registry for modal components
const modalRegistry: Record<string, React.ComponentType<any>> = {};

/**
 * Register a modal component with a unique ID
 * @param modalId - Unique identifier for the modal
 * @param Component - The modal component to register
 */
export function registerModal(modalId: string, Component: React.ComponentType<any>) {
  modalRegistry[modalId] = Component;
}

/**
 * Get a registered modal component by ID
 * @param modalId - Unique identifier for the modal
 * @returns The registered modal component or undefined
 */
export function getModal(modalId: string): React.ComponentType<any> | undefined {
  return modalRegistry[modalId];
}

/**
 * Unregister a modal component
 * @param modalId - Unique identifier for the modal
 */
export function unregisterModal(modalId: string) {
  delete modalRegistry[modalId];
}

/**
 * Get all registered modal IDs
 * @returns Array of registered modal IDs
 */
export function getRegisteredModalIds(): string[] {
  return Object.keys(modalRegistry);
}

/**
 * Clear all registered modals
 */
export function clearModalRegistry() {
  Object.keys(modalRegistry).forEach((key) => delete modalRegistry[key]);
}
