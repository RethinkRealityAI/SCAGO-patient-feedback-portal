import { testFirebaseConnection } from '@/lib/firebase-test';

export default async function TestFirebasePage() {
  const result = await testFirebaseConnection();
  
  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-2xl font-bold mb-4">Firebase Connection Test</h1>
      
      {result.success ? (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <h2 className="font-bold">✅ Connection Successful!</h2>
          <p>Surveys: {result.surveys}</p>
          <p>Feedback submissions: {result.feedback}</p>
        </div>
      ) : (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <h2 className="font-bold">❌ Connection Failed</h2>
          <p>Error: {result.error}</p>
        </div>
      )}
    </div>
  );
}
