export function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="rounded-lg bg-blue-500 p-3 text-white">
        {children}
      </div>
    </div>
  );
}