import { PoliciesPage } from './pages/PoliciesPage';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <h1 className="text-xl font-semibold">ILP Visibility</h1>
          <p className="text-sm text-gray-500">Easy viewing of estimated policy fees</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <PoliciesPage />
      </main>
    </div>
  );
}

export default App;
