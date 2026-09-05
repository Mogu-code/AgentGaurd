import { Shield, Activity, Settings, Database, TerminalSquare, Brain, List, FileKey2 } from 'lucide-react';

export function Sidebar({ activeTab, setActiveTab, health }) {
  return (
    <div className="sidebar">
      <div className="logo-container">
        <div className="logo-main">
          <Shield size={24} className="text-blue" />
          <span>AgentPay Guard</span>
        </div>
        <span className="logo-sub">Security Control Plane</span>
      </div>

      <div className="nav-menu">
        <div className="nav-section">Monitor</div>
        <NavItem icon={<Activity size={18}/>} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <NavItem icon={<List size={18}/>} label="Transactions" active={activeTab === 'monitor'} onClick={() => setActiveTab('monitor')} />
        
        <div className="nav-section">Control</div>
        <NavItem icon={<TerminalSquare size={18}/>} label="Attack Simulator" active={activeTab === 'simulation'} onClick={() => setActiveTab('simulation')} />
        <NavItem icon={<Settings size={18}/>} label="Policies" active={activeTab === 'policies'} onClick={() => setActiveTab('policies')} />
        
        <div className="nav-section">Intelligence</div>
        <NavItem icon={<Brain size={18}/>} label="ML Analytics" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
        <NavItem icon={<Database size={18}/>} label="Audit Log" active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} />

        <div className="nav-section">System</div>
        <NavItem icon={<FileKey2 size={18}/>} label="Architecture" active={activeTab === 'architecture'} onClick={() => setActiveTab('architecture')} />
      </div>

      <div className="system-status">
        <div className="system-status-title">SYSTEM STATUS</div>
        <StatusRow label="Backend API" status={health.backend ? 'ONLINE' : 'OFFLINE'} type={health.backend ? 'online' : 'offline'} />
        <StatusRow label="Ollama (Local)" status={health.ollama ? 'ONLINE' : 'OFFLINE'} type={health.ollama ? 'online' : 'offline'} />
        <StatusRow label="Razorpay Mode" status={health.razorpayMode.toUpperCase()} type={health.razorpayMode === 'test' ? 'online' : 'pending'} />
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {icon} <span>{label}</span>
    </div>
  );
}

function StatusRow({ label, status, type }) {
  return (
    <div className="status-row">
      <span className="text-secondary">{label}</span>
      <div className="status-indicator">
        <div className={`status-dot ${type}`}></div>
        <span className={type === 'online' ? 'text-green' : type === 'offline' ? 'text-red' : 'text-secondary'}>{status}</span>
      </div>
    </div>
  );
}
