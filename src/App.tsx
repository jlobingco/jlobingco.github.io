import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Wallet, 
  TrendingUp, 
  History, 
  Plus, 
  Search, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  Calendar, 
  Clock, 
  AlertCircle,
  X,
  Download,
  Trash2,
  Edit2,
  CheckCircle2,
  Info,
  Copy,
  Settings,
  LogOut,
  UserPlus,
  Check,
  Columns
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

// --- Types ---
interface Member {
  id: number;
  name: string;
  slots: number;
  status: string;
  joined_at: string;
  stats?: {
    principal: number;
    dividendShare: number;
    guarantorInterest: number;
    outstandingDebt: number;
    currentPrincipalDebt: number;
    totalLoanAmount: number;
    totalGuaranteedAmount: number;
    annualFees: number;
    annualFeePaidThisYear: boolean;
    monthsContributed: number;
    expectedReceivable: number;
  };
}

interface Transaction {
  id: number;
  member_id: number;
  amount: number;
  type: 'Contribution' | 'AnnualFee' | 'Penalty' | 'Refund';
  period: string;
  month: string;
  date: string;
}

interface Loan {
  id: number;
  member_id: number | null;
  borrower_name: string | null;
  debtor_name: string;
  guarantor_id: number;
  guarantor_name: string;
  principal: number;
  interest_rate: number;
  months: number;
  status: 'Active' | 'Paid';
  created_at: string;
  due_at: string;
  is_overdue: number;
  totalInterest: number;
  biMonthlyPayment: number;
  amountPaid: number;
  remainingBalance: number;
}

interface Summary {
  cashOnHand: number;
  totalPortfolio: number;
  dividendPool: number;
  totalGuarantorRewards: number;
  totalPenalties: number;
  totalMembers: number;
  totalSlots: number;
}

// --- Helpers ---
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function App() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [contributionHistory, setContributionHistory] = useState<Transaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'loans' | 'history'>('dashboard');
  const [visibleColumns, setVisibleColumns] = useState({
    expectedReceivable: true,
    totalContributions: true,
    outstandingDebt: true,
    dividends: true,
    status: true,
    joinedAt: true
  });
  const [showColumnToggle, setShowColumnToggle] = useState(false);

  // Modals
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddContribution, setShowAddContribution] = useState(false);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [showPayLoan, setShowPayLoan] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('sf_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [inviteData, setInviteData] = useState({ email: '', name: '', role: 'editor', member_id: '' });
  const [copySuccess, setCopySuccess] = useState(false);

  // Form States
  const [newMember, setNewMember] = useState({ name: '', slots: 1 });
  const [newContribution, setNewContribution] = useState({ 
    member_id: '', 
    amount: '', 
    isFirstOfYear: false, 
    period: '15th', 
    month: new Date().toISOString().slice(0, 7) 
  });
  const [newLoan, setNewLoan] = useState({ 
    member_id: '', 
    borrower_name: '', 
    guarantor_id: '', 
    amount: '', 
    months: 1 
  });
  const [loanPayment, setLoanPayment] = useState({ loan_id: '', amount: '' });

  // --- Data Fetching ---
  const fetchData = async () => {
    try {
      const [summaryRes, membersRes, loansRes] = await Promise.all([
        fetch('/api/summary'),
        fetch('/api/members'),
        fetch('/api/loans')
      ]);
      
      setSummary(await summaryRes.json());
      setMembers(await membersRes.json());
      setLoans(await loansRes.json());
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const fetchMemberDetails = async (id: number) => {
    try {
      const [detailsRes, historyRes] = await Promise.all([
        fetch(`/api/members/${id}`),
        fetch(`/api/members/${id}/contributions`)
      ]);
      
      const details = await detailsRes.json();
      setSelectedMember(details);
      setContributionHistory(await historyRes.json());
    } catch (err) {
      console.error('Error fetching member details:', err);
    }
  };

  useEffect(() => {
    fetchData();
    if (currentUser?.member_id) {
      fetchMemberDetails(currentUser.member_id);
    }
  }, [currentUser]);

  // --- Actions ---
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });
      if (res.ok) {
        setShowAddMember(false);
        setNewMember({ name: '', slots: 1 });
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newContribution,
          amount: Number(newContribution.amount),
          member_id: Number(newContribution.member_id)
        })
      });
      if (res.ok) {
        setShowAddContribution(false);
        setNewContribution({ ...newContribution, amount: '' });
        fetchData();
        if (selectedMember?.id === Number(newContribution.member_id)) {
          fetchMemberDetails(selectedMember.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const downloadLoanContract = (loanData: any) => {
    const doc = new jsPDF();
    const borrower = loanData.member_id 
      ? members.find(m => m.id === Number(loanData.member_id))?.name 
      : loanData.borrower_name;
    const guarantor = members.find(m => m.id === Number(loanData.guarantor_id))?.name;
    const managerName = "Juvelyn Lobingco"; // From user context
    const amount = Number(loanData.amount);
    const months = Number(loanData.months);
    const totalInterest = amount * 0.06 * months;
    const totalToPay = amount + totalInterest;
    const biMonthly = totalToPay / (months * 2);

    // --- Header / Logo ---
    doc.setFillColor(16, 185, 129); // Emerald 500
    doc.rect(20, 15, 10, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text("SAVERS FUND", 35, 24);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Sinking Fund Management System", 35, 29);
    
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.line(20, 35, 190, 35);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("LOAN AGREEMENT & PROMISSORY NOTE", 105, 50, { align: "center" });
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Reference No: SF-LOAN-${new Date().getTime().toString().slice(-6)}`, 20, 60);
    doc.text(`Date of Disbursement: ${new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}`, 20, 67);
    
    // 1. PARTIES
    doc.setFont("helvetica", "bold");
    doc.text("1. PARTIES", 20, 80);
    doc.setFont("helvetica", "normal");
    doc.text(`Lender: SAVERS FUND (Represented by ${managerName}, Fund Manager)`, 30, 88);
    doc.text(`Borrower: ${borrower}`, 30, 95);
    doc.text(`Guarantor: ${guarantor}`, 30, 102);
    
    // 2. LOAN TERMS
    doc.setFont("helvetica", "bold");
    doc.text("2. LOAN TERMS", 20, 115);
    doc.setFont("helvetica", "normal");
    
    const drawCurrencyRow = (label: string, value: number, y: number, isBold = false) => {
      doc.text(label, 30, y);
      if (isBold) doc.setFont("helvetica", "bold");
      // Using 'P' if Unicode Peso symbol fails, but formatCurrency usually works
      const formatted = formatCurrency(value);
      doc.text(formatted, 100, y);
      if (isBold) doc.setFont("helvetica", "normal");
    };

    drawCurrencyRow("Principal Amount:", amount, 123, true);
    doc.text("Interest Rate:", 30, 130);
    doc.text("6% per month (Fixed)", 100, 130);
    doc.text("Loan Term:", 30, 137);
    doc.text(`${months} Month(s)`, 100, 137);
    drawCurrencyRow("Total Interest:", totalInterest, 144);
    
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.rect(25, 149, 160, 10, 'F');
    doc.setFont("helvetica", "bold");
    drawCurrencyRow("TOTAL AMOUNT PAYABLE:", totalToPay, 156, true);
    doc.setFont("helvetica", "normal");
    
    // 3. REPAYMENT SCHEDULE
    doc.setFont("helvetica", "bold");
    doc.text("3. REPAYMENT SCHEDULE", 20, 175);
    doc.setFont("helvetica", "normal");
    doc.text(`Repayment Frequency:`, 30, 183);
    doc.text(`Bi-Monthly (Every 15th and 30th of the month)`, 100, 183);
    doc.setFont("helvetica", "bold");
    doc.text(`Installment Amount:`, 30, 190);
    doc.setTextColor(16, 185, 129); // Emerald 600
    doc.text(formatCurrency(biMonthly), 100, 190);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.text(`Number of Installments:`, 30, 197);
    doc.text(`${months * 2} Payments`, 100, 197);
    
    // 4. AGREEMENT
    doc.setFont("helvetica", "bold");
    doc.text("4. UNDERTAKING", 20, 212);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const agreementText = "The Borrower hereby acknowledges receipt of the principal amount and promises to pay the Total Amount Payable according to the schedule above. In case of default, the Guarantor agrees to be solidarily liable for the full balance including any penalties that may be imposed by the Savers Fund management.";
    const splitText = doc.splitTextToSize(agreementText, 160);
    doc.text(splitText, 25, 220);
    
    // Signatures
    doc.setFontSize(10);
    doc.text("__________________________", 25, 255);
    doc.setFont("helvetica", "bold");
    doc.text(borrower || "", 25, 260);
    doc.setFont("helvetica", "normal");
    doc.text("Borrower Signature", 25, 265);
    
    doc.text("__________________________", 115, 255);
    doc.setFont("helvetica", "bold");
    doc.text(guarantor || "", 115, 260);
    doc.setFont("helvetica", "normal");
    doc.text("Guarantor Signature", 115, 265);

    doc.text("__________________________", 70, 280);
    doc.setFont("helvetica", "bold");
    doc.text(managerName, 70, 285);
    doc.setFont("helvetica", "normal");
    doc.text("Juvelyn Lobingco, Fund Manager", 70, 290);
    
    doc.save(`SF_Loan_Contract_${borrower?.replace(/\s+/g, '_')}.pdf`);
  };

  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLoan,
          amount: Number(newLoan.amount),
          member_id: newLoan.member_id ? Number(newLoan.member_id) : null,
          guarantor_id: Number(newLoan.guarantor_id)
        })
      });
      if (res.ok) {
        downloadLoanContract(newLoan);
        setShowAddLoan(false);
        setNewLoan({ member_id: '', borrower_name: '', guarantor_id: '', amount: '', months: 1 });
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePayLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/loan-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_id: Number(loanPayment.loan_id),
          amount: Number(loanPayment.amount)
        })
      });
      if (res.ok) {
        setShowPayLoan(false);
        setLoanPayment({ loan_id: '', amount: '' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        localStorage.setItem('sf_user', JSON.stringify(user));
      } else {
        alert("Invalid credentials");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sf_user');
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData)
      });
      if (res.ok) {
        alert("User invited successfully!");
        setInviteData({ email: '', name: '', role: 'editor' });
      } else {
        const data = await res.json();
        alert(data.error || "Failed to invite user");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyMemberData = async () => {
    if (!selectedMember) return;
    const node = document.getElementById('member-dashboard');
    if (!node) return;

    try {
      // Create a high-quality blob of the dashboard
      const blob = await htmlToImage.toBlob(node, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });

      if (blob) {
        // Copy the image blob to the clipboard
        const data = [new ClipboardItem({ [blob.type]: blob })];
        await navigator.clipboard.write(data);
        
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy image, falling back to text:', err);
      // Fallback to text if image copying is not supported or fails
      const stats = selectedMember.stats;
      const dataString = `
MEMBER DATA: ${selectedMember.name}
Slots: ${selectedMember.slots}
Status: ${selectedMember.status}
Joined: ${formatDate(selectedMember.joined_at)}

FINANCIALS:
Principal: ${formatCurrency(stats?.principal || 0)}
Dividend Share: ${formatCurrency(stats?.dividendShare || 0)}
Guarantor Rewards: ${formatCurrency(stats?.guarantorInterest || 0)}
Outstanding Debt: ${formatCurrency(stats?.outstandingDebt || 0)}
Total Loan Amount: ${formatCurrency(stats?.totalLoanAmount || 0)}
Expected Receivable: ${formatCurrency(stats?.expectedReceivable || 0)}
      `.trim();

      navigator.clipboard.writeText(dataString);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    try {
      const res = await fetch(`/api/members/${memberToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setShowDeleteConfirm(false);
        setMemberToDelete(null);
        if (selectedMember?.id === memberToDelete.id) setSelectedMember(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const exportToPDF = async () => {
    const element = document.getElementById('member-dashboard');
    if (!element) return;
    
    const dataUrl = await htmlToImage.toPng(element);
    const pdf = new jsPDF();
    const imgProps = pdf.getImageProperties(dataUrl);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${selectedMember?.name || 'Member'}_Dashboard.pdf`);
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Components ---
  const StatCard = ({ title, value, icon: Icon, color, format = 'currency' }: any) => (
    <div className="glass-panel p-6 flex items-start justify-between border-slate-200 shadow-sm">
      <div>
        <p className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">
          {format === 'currency' ? formatCurrency(value) : value.toLocaleString()}
        </h3>
      </div>
      <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
        <Icon size={20} className={color.replace('bg-', 'text-')} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-72 bg-white border-r border-slate-200 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <TrendingUp size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Savers Fund</h1>
        </div>

        <nav className="space-y-2 flex-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'hover:bg-slate-50 text-slate-500'}`}
          >
            <Wallet size={20} />
            <span className="font-medium">Dashboard</span>
          </button>
          {currentUser?.role !== 'member' && (
            <>
              <button 
                onClick={() => setActiveTab('members')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'members' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'hover:bg-slate-50 text-slate-500'}`}
              >
                <Users size={20} />
                <span className="font-medium">Members</span>
              </button>
              <button 
                onClick={() => setActiveTab('loans')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'loans' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'hover:bg-slate-50 text-slate-500'}`}
              >
                <DollarSign size={20} />
                <span className="font-medium">Loans</span>
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'hover:bg-slate-50 text-slate-500'}`}
              >
                <History size={20} />
                <span className="font-medium">History</span>
              </button>
            </>
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
              {currentUser?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate text-slate-900">{currentUser?.name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{currentUser?.email || 'user@example.com'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setShowSettings(true)}
              className="flex items-center justify-center gap-2 p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-all text-xs font-bold border border-slate-100"
            >
              <Settings size={14} />
              Settings
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all text-xs font-bold border border-rose-100"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-h-screen">
        {activeTab === 'dashboard' && (
          <div className="space-y-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Financial Overview</h2>
                <p className="text-slate-500">Real-time summary of the sinking fund.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    if (selectedMember) {
                      setNewContribution(prev => ({
                        ...prev,
                        member_id: String(selectedMember.id),
                        amount: String(selectedMember.slots * 500)
                      }));
                    }
                    setShowAddContribution(true);
                  }} 
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={18} />
                  Record Contribution
                </button>
                <button onClick={() => setShowAddLoan(true)} className="btn-secondary flex items-center gap-2">
                  <DollarSign size={18} />
                  New Loan
                </button>
              </div>
            </header>

            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <StatCard title="Cash on Hand" value={summary.cashOnHand} icon={Wallet} color="bg-emerald-500" />
                <StatCard title="Active Portfolio" value={summary.totalPortfolio} icon={TrendingUp} color="bg-blue-500" />
                <StatCard title="Dividend Pool (4%)" value={summary.dividendPool} icon={DollarSign} color="bg-amber-500" />
                <StatCard title="Guarantor Rewards (2%)" value={summary.totalGuarantorRewards} icon={CheckCircle2} color="bg-emerald-500" />
                <StatCard title="Total Members" value={summary.totalMembers} icon={Users} color="bg-slate-500" format="number" />
                <StatCard title="Total Slots" value={summary.totalSlots} icon={ChevronRight} color="bg-slate-500" format="number" />
                <StatCard title="Total Penalties" value={summary.totalPenalties} icon={AlertCircle} color="bg-rose-500" />
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
              {/* Member Selector & Dashboard */}
              <div className={`${currentUser?.role === 'member' ? 'xl:col-span-3' : 'xl:col-span-2'} space-y-6`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Member Dashboard</h3>
                  {selectedMember && (
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={copyMemberData} 
                        className={`flex items-center gap-2 text-sm font-medium transition-all ${copySuccess ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                        {copySuccess ? 'Copied!' : 'Copy Data'}
                      </button>
                      <button onClick={exportToPDF} className="text-emerald-600 hover:text-emerald-700 flex items-center gap-2 text-sm font-medium">
                        <Download size={16} />
                        Export PDF
                      </button>
                    </div>
                  )}
                </div>

                {selectedMember ? (
                  <motion.div 
                    id="member-dashboard"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-8 space-y-8 bg-white border-slate-200 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-emerald-600">
                          {selectedMember.name[0]}
                        </div>
                        <div>
                          <h4 className="text-2xl font-bold text-slate-900">{selectedMember.name}</h4>
                          <p className="text-slate-500">Member ID: #{selectedMember.id} • {selectedMember.slots} Slot(s)</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 text-sm font-medium">Expected Receivable</p>
                        <p className="text-3xl font-bold text-emerald-600">{formatCurrency(selectedMember.stats?.expectedReceivable || 0)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-slate-100">
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold mb-1">Principal</p>
                        <p className="text-lg font-bold text-slate-900">{formatCurrency(selectedMember.stats?.principal || 0)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold mb-1">Dividends</p>
                        <p className="text-lg font-bold text-amber-600">+{formatCurrency(selectedMember.stats?.dividendShare || 0)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold mb-1">Guarantor Rewards</p>
                        <p className="text-lg font-bold text-emerald-600">+{formatCurrency(selectedMember.stats?.guarantorInterest || 0)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold mb-1">Outstanding Debt</p>
                        <p className="text-lg font-bold text-rose-600">-{formatCurrency(selectedMember.stats?.outstandingDebt || 0)}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h5 className="font-bold flex items-center gap-2 text-slate-900">
                        <History size={18} className="text-emerald-600" />
                        Recent Contributions
                      </h5>
                      <div className="space-y-2">
                        {contributionHistory.slice(0, 5).map(tx => (
                          <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${tx.type === 'AnnualFee' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                {tx.type === 'AnnualFee' ? <Calendar size={14} /> : <ArrowUpRight size={14} />}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">{tx.type === 'AnnualFee' ? 'Annual Fee' : 'Contribution'}</p>
                                <p className="text-xs text-slate-500">{formatDate(tx.date)} • {tx.period}</p>
                              </div>
                            </div>
                            <p className="font-bold text-slate-900">{formatCurrency(tx.amount)}</p>
                          </div>
                        ))}
                        {contributionHistory.length === 0 && (
                          <p className="text-slate-500 text-sm italic">No contributions recorded yet.</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="glass-panel p-20 flex flex-col items-center justify-center text-center space-y-4 bg-white border-slate-200">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                      <Users size={40} />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900">No Member Selected</h4>
                      <p className="text-slate-500 max-w-xs">Select a member from the directory to view their financial dashboard and stats.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar: Members List */}
              {currentUser?.role !== 'member' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">Directory</h3>
                    <button onClick={() => setShowAddMember(true)} className="p-2 bg-emerald-600 rounded-lg text-white hover:bg-emerald-700 transition-all shadow-sm">
                      <Plus size={16} />
                    </button>
                  </div>
                  
                  <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search members..." 
                      className="input-field w-full !pl-12"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                    {filteredMembers.map(member => (
                      <button 
                        key={member.id}
                        onClick={() => fetchMemberDetails(member.id)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedMember?.id === member.id ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200 text-slate-600'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${selectedMember?.id === member.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {member.name[0]}
                          </div>
                          <div className="text-left">
                            <p className="font-bold">{member.name}</p>
                            <p className="text-xs text-slate-500">{member.slots} Slot(s)</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className={selectedMember?.id === member.id ? 'text-emerald-600' : 'text-slate-300'} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-10">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Members Directory</h2>
                <p className="text-slate-500">Manage all registered members and their slots.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button 
                    onClick={() => setShowColumnToggle(!showColumnToggle)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Columns size={18} />
                    Columns
                  </button>
                  
                  <AnimatePresence>
                    {showColumnToggle && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 space-y-3"
                      >
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Show/Hide Columns</p>
                        <div className="space-y-2">
                          {Object.entries(visibleColumns).map(([key, value]) => (
                            <label key={key} className="flex items-center gap-3 cursor-pointer group">
                              <div 
                                onClick={() => setVisibleColumns(prev => ({ ...prev, [key]: !value }))}
                                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${value ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-transparent'}`}
                              >
                                <Check size={12} strokeWidth={3} />
                              </div>
                              <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              </span>
                            </label>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button onClick={() => setShowAddMember(true)} className="btn-primary flex items-center gap-2">
                  <Plus size={18} />
                  Add New Member
                </button>
              </div>
            </header>

            <div className="glass-panel overflow-x-auto border-slate-200 shadow-sm">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Slots</th>
                    {visibleColumns.totalContributions && <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contributions</th>}
                    {visibleColumns.dividends && <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dividends</th>}
                    {visibleColumns.outstandingDebt && <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Debt</th>}
                    {visibleColumns.expectedReceivable && <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Receivable</th>}
                    {visibleColumns.status && <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>}
                    {visibleColumns.joinedAt && <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Joined At</th>}
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map(member => (
                    <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{member.name}</td>
                      <td className="px-6 py-4 text-slate-600">{member.slots}</td>
                      {visibleColumns.totalContributions && (
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          {formatCurrency(member.stats?.principal || 0)}
                        </td>
                      )}
                      {visibleColumns.dividends && (
                        <td className="px-6 py-4 text-emerald-600 font-medium">
                          {formatCurrency(member.stats?.dividendShare || 0)}
                        </td>
                      )}
                      {visibleColumns.outstandingDebt && (
                        <td className="px-6 py-4 text-rose-600 font-medium">
                          {formatCurrency(member.stats?.outstandingDebt || 0)}
                        </td>
                      )}
                      {visibleColumns.expectedReceivable && (
                        <td className="px-6 py-4 text-slate-900 font-bold">
                          {formatCurrency(member.stats?.expectedReceivable || 0)}
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${member.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {member.status}
                          </span>
                        </td>
                      )}
                      {visibleColumns.joinedAt && <td className="px-6 py-4 text-slate-500">{formatDate(member.joined_at)}</td>}
                      <td className="px-6 py-4 text-right space-x-2">
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-emerald-600 transition-all">
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => { setMemberToDelete(member); setShowDeleteConfirm(true); }}
                          className="p-2 hover:bg-rose-50 rounded-lg text-rose-400 hover:text-rose-600 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'loans' && (
          <div className="space-y-10">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Loan Management</h2>
                <p className="text-slate-500">Track active loans, eligibility, and repayments.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowPayLoan(true)} className="btn-secondary flex items-center gap-2">
                  <DollarSign size={18} />
                  Record Payment
                </button>
                <button onClick={() => setShowAddLoan(true)} className="btn-primary flex items-center gap-2">
                  <Plus size={18} />
                  Create Loan
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {loans.map(loan => (
                <div key={loan.id} className="glass-panel p-6 space-y-6 border-slate-200 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${loan.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        <DollarSign size={24} />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">{loan.debtor_name}</h4>
                        <p className="text-xs text-slate-500">Guarantor: {loan.guarantor_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {loan.is_overdue === 1 && (
                        <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                          <AlertCircle size={10} />
                          Overdue
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${loan.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {loan.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Principal</p>
                      <p className="font-bold text-slate-900">{formatCurrency(loan.principal)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Total Interest</p>
                      <p className="font-bold text-amber-600">{formatCurrency(loan.totalInterest)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Bi-Monthly Pay</p>
                      <p className="font-bold text-emerald-600">{formatCurrency(loan.biMonthlyPayment)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Term</p>
                      <p className="font-bold text-slate-900">{loan.months} Month(s)</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500">Repayment Progress</span>
                      <span className="text-slate-900">{Math.round((loan.amountPaid / (loan.principal + loan.totalInterest)) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500" 
                        style={{ width: `${(loan.amountPaid / (loan.principal + loan.totalInterest)) * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span>Paid: {formatCurrency(loan.amountPaid)}</span>
                      <span>Balance: {formatCurrency(loan.remainingBalance)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-10">
            <header>
              <h2 className="text-3xl font-bold text-slate-900">Transaction History</h2>
              <p className="text-slate-500">Complete log of all contributions and loan payments.</p>
            </header>

            <div className="glass-panel p-8 border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-6 text-slate-400">
                <Info size={16} />
                <p className="text-sm">Showing all transactions across all members.</p>
              </div>
              
              <div className="space-y-4">
                {/* This would ideally fetch /api/contributions/all and /api/loan-payments/all */}
                <p className="text-slate-500 italic">Select a member in the Dashboard to see detailed transaction history for now.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showAddMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 w-full max-w-md space-y-6 rounded-3xl shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Add New Member</h3>
                <button onClick={() => setShowAddMember(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddMember} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    className="input-field w-full" 
                    value={newMember.name}
                    onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500">Slots</label>
                  <input 
                    type="number" 
                    min="1" 
                    required 
                    className="input-field w-full" 
                    value={newMember.slots}
                    onChange={e => setNewMember({ ...newMember, slots: Number(e.target.value) })}
                  />
                </div>
                <button type="submit" className="btn-primary w-full py-3">Register Member</button>
              </form>
            </motion.div>
          </div>
        )}

        {showAddContribution && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 w-full max-w-md space-y-6 rounded-3xl shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Record Contribution</h3>
                <button onClick={() => setShowAddContribution(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddContribution} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500">Member</label>
                  <select 
                    required 
                    className="input-field w-full"
                    value={newContribution.member_id}
                    onChange={e => {
                      const memberId = e.target.value;
                      const member = members.find(m => m.id === Number(memberId));
                      const suggestedAmount = member ? member.slots * 500 : '';
                      setNewContribution({ ...newContribution, member_id: memberId, amount: String(suggestedAmount) });
                    }}
                  >
                    <option value="">Select Member</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500">Amount (₱)</label>
                  <input 
                    type="number" 
                    required 
                    className="input-field w-full" 
                    value={newContribution.amount}
                    onChange={e => setNewContribution({ ...newContribution, amount: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500">Period</label>
                    <select 
                      className="input-field w-full"
                      value={newContribution.period}
                      onChange={e => setNewContribution({ ...newContribution, period: e.target.value })}
                    >
                      <option value="15th">15th</option>
                      <option value="30th">30th</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500">Month</label>
                    <input 
                      type="month" 
                      className="input-field w-full" 
                      value={newContribution.month}
                      onChange={e => setNewContribution({ ...newContribution, month: e.target.value })}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer border border-slate-100 hover:border-slate-200 transition-colors">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-slate-200 bg-white text-emerald-600 focus:ring-emerald-500/20" 
                    checked={newContribution.isFirstOfYear}
                    onChange={e => setNewContribution({ ...newContribution, isFirstOfYear: e.target.checked })}
                  />
                  <div className="text-sm">
                    <p className="font-bold text-slate-900">First Contribution of Year?</p>
                    <p className="text-slate-500 text-xs">Automatically deducts ₱200/slot annual fee.</p>
                  </div>
                </label>
                <button type="submit" className="btn-primary w-full py-3">Post Transaction</button>
              </form>
            </motion.div>
          </div>
        )}

        {showAddLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 w-full max-w-lg space-y-6 rounded-3xl shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Create New Loan</h3>
                <button onClick={() => setShowAddLoan(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddLoan} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500">Borrower (Member)</label>
                    <select 
                      className="input-field w-full"
                      value={newLoan.member_id}
                      onChange={e => setNewLoan({ ...newLoan, member_id: e.target.value, borrower_name: '' })}
                    >
                      <option value="">Select Member</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500">OR Non-Member Name</label>
                    <input 
                      type="text" 
                      placeholder="Enter name"
                      className="input-field w-full" 
                      value={newLoan.borrower_name}
                      onChange={e => setNewLoan({ ...newLoan, borrower_name: e.target.value, member_id: '' })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500">Guarantor (Required)</label>
                  <select 
                    required
                    className="input-field w-full"
                    value={newLoan.guarantor_id}
                    onChange={e => setNewLoan({ ...newLoan, guarantor_id: e.target.value })}
                  >
                    <option value="">Select Guarantor</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500">Principal Amount (₱)</label>
                    <input 
                      type="number" 
                      required 
                      className="input-field w-full" 
                      value={newLoan.amount}
                      onChange={e => setNewLoan({ ...newLoan, amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500">Term (Months)</label>
                    <select 
                      className="input-field w-full"
                      value={newLoan.months}
                      onChange={e => setNewLoan({ ...newLoan, months: Number(e.target.value) })}
                    >
                      {[1, 2, 3, 4, 5].map(m => <option key={m} value={m}>{m} Month(s)</option>)}
                    </select>
                  </div>
                </div>

                {newLoan.amount && Number(newLoan.amount) > 0 && (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-600 mb-2">
                      <TrendingUp size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Payment Computation</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Total Interest (6%/mo)</p>
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(Number(newLoan.amount) * 0.06 * newLoan.months)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Bi-Monthly Payment</p>
                        <p className="text-sm font-bold text-emerald-600">
                          {formatCurrency((Number(newLoan.amount) + (Number(newLoan.amount) * 0.06 * newLoan.months)) / (newLoan.months * 2))}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <Info size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Eligibility Note</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Max eligibility: 2x borrower's contribution principal + 1x guarantor's principal. 
                    Interest is fixed at 6% per month. Bi-monthly payments required.
                  </p>
                </div>

                <button type="submit" className="btn-primary w-full py-3">Approve & Disburse Loan</button>
              </form>
            </motion.div>
          </div>
        )}

        {showPayLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 w-full max-w-md space-y-6 rounded-3xl shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Record Loan Payment</h3>
                <button onClick={() => setShowPayLoan(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handlePayLoan} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500">Select Active Loan</label>
                  <select 
                    required 
                    className="input-field w-full"
                    value={loanPayment.loan_id}
                    onChange={e => setLoanPayment({ ...loanPayment, loan_id: e.target.value })}
                  >
                    <option value="">Select Loan</option>
                    {loans.filter(l => l.status === 'Active').map(l => (
                      <option key={l.id} value={l.id}>{l.debtor_name} (Bal: {formatCurrency(l.remainingBalance)})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500">Payment Amount (₱)</label>
                  <input 
                    type="number" 
                    required 
                    className="input-field w-full" 
                    value={loanPayment.amount}
                    onChange={e => setLoanPayment({ ...loanPayment, amount: e.target.value })}
                  />
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Payments are split proportionally between principal and interest based on the loan term.
                  </p>
                </div>
                <button type="submit" className="btn-primary w-full py-3">Post Payment</button>
              </form>
            </motion.div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 w-full max-w-md space-y-6 rounded-3xl shadow-2xl border border-slate-100"
            >
              <div className="flex items-center gap-4 text-rose-600">
                <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-xl font-bold">Warning: Irreversible Action</h3>
              </div>
              <p className="text-slate-500">
                Are you sure you want to delete <span className="text-slate-900 font-bold">{memberToDelete?.name}</span>? This will permanently remove all their contributions, loans, and transaction history.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleDeleteMember} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl transition-all flex-1 font-bold shadow-sm">Delete Permanently</button>
              </div>
            </motion.div>
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 w-full max-w-md space-y-6 rounded-3xl shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">System Settings</h3>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              {currentUser?.role === 'admin' ? (
                <div className="space-y-6">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
                      <UserPlus size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-900">Invite New User</p>
                      <p className="text-xs text-emerald-700">Add editors or other admins.</p>
                    </div>
                  </div>

                  <form onSubmit={handleInvite} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500">Full Name</label>
                      <input 
                        type="text" 
                        required 
                        className="input-field w-full" 
                        value={inviteData.name}
                        onChange={e => setInviteData({ ...inviteData, name: e.target.value })}
                        placeholder="e.g. Jane Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500">Email Address</label>
                      <input 
                        type="email" 
                        required 
                        className="input-field w-full" 
                        value={inviteData.email}
                        onChange={e => setInviteData({ ...inviteData, email: e.target.value })}
                        placeholder="jane@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500">Role</label>
                      <select 
                        className="input-field w-full"
                        value={inviteData.role}
                        onChange={e => setInviteData({ ...inviteData, role: e.target.value })}
                      >
                        <option value="member">Member</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    {inviteData.role === 'member' && (
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500">Link to Member Profile</label>
                        <select 
                          required
                          className="input-field w-full"
                          value={inviteData.member_id}
                          onChange={e => {
                            const m = members.find(mem => mem.id === parseInt(e.target.value));
                            setInviteData({ ...inviteData, member_id: e.target.value, name: m?.name || '' });
                          }}
                        >
                          <option value="">Select Member</option>
                          {members.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button type="submit" className="btn-primary w-full py-3">Send Invitation</button>
                  </form>
                </div>
              ) : (
                <div className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <AlertCircle size={32} />
                  </div>
                  <p className="text-slate-500">Only administrators can access system settings and invite new users.</p>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {!currentUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-10 w-full max-w-md space-y-8 rounded-[2.5rem] shadow-2xl border border-white/20"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-200 mb-6">
                  <TrendingUp size={32} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900">Savers Fund</h2>
                <p className="text-slate-500">Please sign in to manage the sinking fund.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-1">Email Address</label>
                  <input 
                    type="email" 
                    required 
                    className="input-field w-full py-4 px-6 text-lg" 
                    value={loginData.email}
                    onChange={e => setLoginData({ ...loginData, email: e.target.value })}
                    placeholder="admin@saversfund.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-1">Password</label>
                  <input 
                    type="password" 
                    required 
                    className="input-field w-full py-4 px-6 text-lg" 
                    value={loginData.password}
                    onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" className="btn-primary w-full py-4 text-lg shadow-lg shadow-emerald-100">
                  Sign In
                </button>
              </form>
              
              <div className="text-center">
                <p className="text-xs text-slate-400">
                  Default: admin@saversfund.com / admin123
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
