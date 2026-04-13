import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import SummaryPage from './pages/SummaryPage';
import DataAnalysisPage from './pages/DataAnalysisPage';
import ConnectivityPage from './pages/ConnectivityPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<SummaryPage />} />
          <Route path="/data-analysis" element={<DataAnalysisPage />} />
          <Route path="/connectivity" element={<ConnectivityPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
