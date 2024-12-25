import { Spinner } from "./ui/spinner";

export default function Loading() {
  return (
    <div className="h-screen flex justify-center items-center">
      <Spinner size="lg" />
    </div>
  );
}
