import { Routes, Route } from 'react-router-dom';
import { PoliciesPage } from './pages/PoliciesPage';
import { PolicyDetailPage } from './pages/PolicyDetailPage';

function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface/60 backdrop-blur">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <h1 className="font-display text-2xl text-ink">◐ ILP Visibility</h1>
          <p className="text-sm text-muted">See what your policy really costs.</p>
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
