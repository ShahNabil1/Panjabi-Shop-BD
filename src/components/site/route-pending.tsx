export function RoutePending() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100]">
      <div className="h-0.5 w-full overflow-hidden bg-primary/15">
        <div className="h-full w-1/3 animate-[route-progress_1s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
    </div>
  );
}
