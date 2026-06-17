import { Routes, Route } from 'react-router-dom';
import { PoliciesPage } from './pages/PoliciesPage';
import { PolicyDetailPage } from './pages/PolicyDetailPage';

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
        <Routes>
          <Route path="/" element={<PoliciesPage />} />
          <Route path="/policies/:id" element={<PolicyDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
