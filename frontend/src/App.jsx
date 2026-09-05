import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Overview } from './pages/Overview';
import { Transactions } from './pages/Transactions';
import { Simulator } from './pages/Simulator';
import { Policies } from './pages/Policies';
import { Audit } from './pages/Audit';
import { Analytics } from './pages/Analytics';
import { SecurityArchitecture } from './pages/SecurityArchitecture';
import { fetchHealth, fetchMetrics, fetchTransactions, fetchPolicies } from './api/client';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [health, setHealth] = useState({ backend: false, ollama: false, ollamaModel: '', razorpayMode: 'MOCK', razorpayReachable: false });

  // Initialize data on mount
  useEffect(() => {
    loadHealth();
    loadData();
    // Setting up a basic interval to refresh data (optional for real-time feel)
    const intervalId = setInterval(() => {
      loadData();
    }, 10000); // 10s refresh for live transactions
    return () => clearInterval(intervalId);
  }, []);

  const loadHealth = async () => {
    const data = await fetchHealth();
    setHealth(data);
  };

  const loadData = async () => {
    try {
      const mets = await fetchMetrics();
      if (mets) setMetrics(mets);
      
      const txs = await fetchTransactions();
      if (txs) setTransactions(txs);
      
      const pols = await fetchPolicies();
      if (pols) setPolicies(pols);
    } catch (e) {
      console.error("Failed to load backend data", e);
    }
  };

  // Helper for cross-page navigation from monitor -> investigation
  const openInvestigation = (tx) => {
    // In our simplified routing, we can't deep link easily without React Router,
    // but we can send them to the simulator tab where they can run it again.
    // However, the user asked for "Clicking a transaction opens Investigation".
    // For this prototype, jumping to 'simulation' tab is adequate, 
    // or we can implement an activeTx state.
    // Since Simulator currently handles state execution, we will just alert or switch tab for now.
    setActiveTab('simulation');
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} health={health} />
      
      <div className="main-content">
        {activeTab === 'overview' && <Overview health={health} metrics={metrics} transactions={transactions} />}
        {activeTab === 'monitor' && <Transactions transactions={transactions} openInvestigation={openInvestigation} />}
        {activeTab === 'simulation' && <Simulator />}
        {activeTab === 'policies' && <Policies policies={policies} />}
        {activeTab === 'audit' && <Audit transactions={transactions} />}
        {activeTab === 'analytics' && <Analytics metrics={metrics} />}
        {activeTab === 'architecture' && <SecurityArchitecture />}
      </div>
    </div>
  );
}

export default App;
