# CentralModal - Global Modal Management System

CentralModal is a global modal management system. It provides a unified way to manage modals throughout your React application, solving common problems with modal state management and component coupling.

## Features

- **Global Modal Management**: Manage all modals from a single store
- **Promise-based API**: Get return values from modals using Promises
- **TypeScript Support**: Full TypeScript support with proper typing
- **Zustand Integration**: Built on top of Zustand for state management
- **Shadcn UI Compatible**: Works seamlessly with Shadcn UI Dialog and AlertDialog components
- **Auto Registration**: Automatic modal registration and rendering
- **Animation Support**: Proper handling of modal animations and transitions

## Installation

The CentralModal system is already integrated into the project. No additional installation required.

## Basic Usage

### 1. Create a Modal Component

```tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CentralModal, useCentralModal } from "@/components/central-modal";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface UserModalProps {
  modal: ReturnType<typeof useCentralModal>;
  user?: { id: string; name: string; email: string };
}

export function UserModal({ modal, user }: UserModalProps) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  const handleSubmit = () => {
    const userData = { id: user?.id || Date.now().toString(), name, email };
    modal.resolve(userData); // Return data to caller
  };

  return (
    <CentralModal id="user-modal">
      <DialogHeader>
        <DialogTitle>{user ? "Edit User" : "Create User"}</DialogTitle>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
        />
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => modal.hide()}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>{user ? "Update" : "Create"}</Button>
      </DialogFooter>
    </CentralModal>
  );
}
```

### 2. Use the Modal from Any Component

```tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { useCentralModal } from "@/components/central-modal";
import { UserModal } from "./UserModal";

export function UserList() {
  const userModal = useCentralModal("user-modal");

  const handleCreateUser = async () => {
    try {
      const result = await userModal.show();
      console.log("User created:", result);
      // Handle the result
    } catch (error) {
      console.log("User creation cancelled");
    }
  };

  const handleEditUser = async (user: any) => {
    try {
      const result = await userModal.show(user);
      console.log("User updated:", result);
      // Handle the result
    } catch (error) {
      console.log("User edit cancelled");
    }
  };

  return (
    <div>
      <Button onClick={handleCreateUser}>Create User</Button>
      <Button
        onClick={() =>
          handleEditUser({ id: "1", name: "John", email: "john@example.com" })
        }
      >
        Edit User
      </Button>

      {/* The modal component - can be placed anywhere */}
      <UserModal modal={userModal} />
    </div>
  );
}
```

### 3. Set up AutoModalProvider (Optional)

For automatic modal rendering, add the `AutoModalProvider` to your app root:

```tsx
import { AutoModalProvider } from "@/components/central-modal";

function App() {
  return <AutoModalProvider>{/* Your app content */}</AutoModalProvider>;
}
```

## API Reference

### useCentralModal(modalId: string)

Returns a modal control object with the following properties:

- `args: any` - Current modal arguments
- `hiding: boolean` - Whether the modal is in hiding animation
- `visible: boolean` - Whether the modal is visible
- `show(args?: any): Promise<any>` - Show the modal and return a Promise
- `hide(force?: boolean): void` - Hide the modal
- `resolve(value?: any): void` - Resolve the modal with a return value

### CentralModal Component

```tsx
<CentralModal
  id="modal-id" // Required: Unique modal identifier
  type="dialog" // Optional: "dialog" or "alert" (default: "dialog")
  className="custom-class" // Optional: Additional CSS classes
  onOpenChange={(open) => {}} // Optional: Handle open state changes
>
  {/* Modal content */}
</CentralModal>
```

### createCentralModal(modalId: string, Component: React.ComponentType)

Creates a modal component with CentralModal functionality:

```tsx
const MyModal = createCentralModal("my-modal", MyModalComponent);
```

## Advanced Usage

### Modal Registry

```tsx
import {
  registerModal,
  getModal,
  unregisterModal,
} from "@/components/central-modal";

// Register a modal
registerModal("my-modal", MyModalComponent);

// Get a registered modal
const ModalComponent = getModal("my-modal");

// Unregister a modal
unregisterModal("my-modal");
```

### Custom Modal Provider

```tsx
import { ModalProvider } from "@/components/central-modal";

function App() {
  const modals = [
    <UserModal key="user-modal" modal={useCentralModal("user-modal")} />,
    <ConfirmModal
      key="confirm-modal"
      modal={useCentralModal("confirm-modal")}
    />,
  ];

  return (
    <ModalProvider modals={modals}>{/* Your app content */}</ModalProvider>
  );
}
```

## Migration from Existing Modals

### Before (Traditional Approach)

```tsx
function ParentComponent() {
  const [modalOpen, setModalOpen] = useState(false);
  const [user, setUser] = useState(null);

  const showModal = (userData) => {
    setUser(userData);
    setModalOpen(true);
  };

  return (
    <div>
      <ChildComponent onShowModal={showModal} />
      <UserModal
        open={modalOpen}
        user={user}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
```

### After (CentralModal Approach)

```tsx
function ParentComponent() {
  return (
    <div>
      <ChildComponent />
      <UserModal modal={useCentralModal("user-modal")} />
    </div>
  );
}

function ChildComponent() {
  const userModal = useCentralModal("user-modal");

  const handleClick = () => {
    userModal.show({ id: "1", name: "John" });
  };

  return <Button onClick={handleClick}>Show Modal</Button>;
}
```

## Benefits

1. **Decoupling**: Modals are no longer tightly coupled to their parent components
2. **Reusability**: Any component can trigger any modal
3. **State Management**: Centralized modal state management
4. **Type Safety**: Full TypeScript support
5. **Performance**: Only visible modals are rendered
6. **Flexibility**: Easy to add new modals without modifying existing code

## Examples

See the `examples/` directory for complete working examples:

- `user-info-modal.tsx` - User creation/editing modal
- `confirm-modal-example.tsx` - Confirmation dialog
- `example-usage.tsx` - Basic usage patterns

## Best Practices

1. **Unique IDs**: Always use unique modal IDs across your application
2. **Type Safety**: Define proper TypeScript interfaces for modal props
3. **Error Handling**: Always handle Promise rejections when using `modal.show()`
4. **Cleanup**: Use `modal.hide(true)` to force cleanup after animations
5. **Registry**: Use the modal registry for dynamic modal management
