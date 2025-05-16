import { Button } from "@/components/ui/button";
import useTestStore from "@/stores/demo-store";

export default function TestSentry() {
  const isEven = useTestStore.use.isEven();
  const count = useTestStore.use.count();
  const increment = useTestStore.use.increment();
  return (
    <div>
      <Button
        type="button"
        onClick={() => {
          increment();
        }}
      >
        Increment - {count} - {isEven ? "Even" : "Odd"}
      </Button>
    </div>
  );
}
