import { Button } from "@/components/ui/button";

export default function TestSentry() {
  return (
    <div>
      <Button
        type="button"
        onClick={() => {
          throw new Error("Sentry Test Error");
        }}
      >
        Click me to throw an error, test sentry
      </Button>
    </div>
  );
}
