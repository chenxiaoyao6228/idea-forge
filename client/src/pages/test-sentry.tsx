import { Button } from "@/components/ui/button";

export default function TestSentry() {
  return (
    <div>
      <Button
        type="button"
        onClick={() => {
          throw new Error("Test error");
        }}
      >
        Test Error
      </Button>
    </div>
  );
}
