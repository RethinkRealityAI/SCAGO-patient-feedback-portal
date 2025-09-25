export function BotMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-start">
      <div className="rounded-lg bg-gray-200 p-3 text-gray-800">
        {children}
      </div>
    </div>
  );
}