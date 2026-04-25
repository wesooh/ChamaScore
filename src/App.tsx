/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  History, 
  UserPlus, 
  Info, 
  Menu, 
  X, 
  TrendingUp, 
  ShieldCheck, 
  Smartphone, 
  Users, 
  ArrowRight, 
  ChevronRight, 
  Save, 
  Play, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Eye, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  BrainCircuit,
  Lock,
  Cloud,
  Rocket,
  Zap,
  Briefcase,
  Wallet,
  ArrowBigRightDash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
type RiskLevel = 'Low' | 'Medium' | 'High';

interface AnalysisFeatures {
  income_stability: number;
  savings_behavior: number;
  contribution_consistency: number;
  spending_ratio: number;
}

interface AnalysisResult {
  id: string;
  date: string;
  member_name: string;
  credit_score: number;
  risk_level: RiskLevel;
  explanation: string;
  features: AnalysisFeatures;
}

const SAMPLE_RESULTS: AnalysisResult[] = [
  {
    id: "sample-jane",
    date: new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }),
    member_name: "Jane Mwangi",
    credit_score: 89,
    risk_level: "Low",
    explanation: "Jane ni mwanachama mwaminifu sana. Yeye hu-contribute mapema kila wiki na transactional behavior yake inaonyesha income stability ya hali ya juu. Anaweza kupata loan bila wasiwasi wowote.",
    features: {
      income_stability: 92,
      savings_behavior: 85,
      contribution_consistency: 98,
      spending_ratio: 30
    }
  },
  {
    id: "sample-peter",
    date: new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }),
    member_name: "Peter Otieno",
    credit_score: 52,
    risk_level: "Medium",
    explanation: "Peter ako katikati. Kuna delays kidogo kwa contributions zake, lakini overall yeye huchakarika vizuri. Anahitaji ku-improve consistency. Inabidi uangalie tena kabla hujatoa decision.",
    features: {
      income_stability: 60,
      savings_behavior: 45,
      contribution_consistency: 70,
      spending_ratio: 55
    }
  },
  {
    id: "sample-sam",
    date: new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }),
    member_name: "Sam Kipchoge",
    credit_score: 28,
    risk_level: "High",
    explanation: "Risk iko juu hapa. Sam amekosa contributions mara kadhaa hivi karibuni na M-Pesa records zinaonyesha spending ratio kubwa sana. Hafai kupewa loan kwa sasa, risk ni kubwa mno.",
    features: {
      income_stability: 30,
      savings_behavior: 20,
      contribution_consistency: 40,
      spending_ratio: 85
    }
  }
];

enum Screen {
  Home,
  NewAnalysis,
  Results,
  History,
  About
}

const PRIMARY_GREEN = "#0F9D58";
const SECONDARY_BLUE = "#1A73E8";
const TERTIARY_ORANGE = "#FA7B17";

// --- Components ---

const Gauge = ({ score, riskLevel }: { score: number, riskLevel: RiskLevel }) => {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  const getColor = () => {
    if (score >= 70) return PRIMARY_GREEN;
    if (score >= 40) return "#EAB308"; // Yellow-500
    return "#EF4444"; // Red-500
  };

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="128"
          cy="128"
          r={radius}
          stroke="currentColor"
          strokeWidth="16"
          fill="transparent"
          className="text-slate-100"
        />
        <motion.circle
          cx="128"
          cy="128"
          r={radius}
          stroke={getColor()}
          strokeWidth="16"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-6xl font-bold text-slate-800"
        >
          {score}
        </motion.span>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Out of 100</span>
      </div>
    </div>
  );
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Home);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // New Analysis Inputs
  const [memberName, setMemberName] = useState("");
  const [mobileMoney, setMobileMoney] = useState("");
  const [smsRecords, setSmsRecords] = useState("");
  const [groupContributions, setGroupContributions] = useState("");

  // History Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('chama_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToHistory = (result: AnalysisResult) => {
    const updatedHistory = [result, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('chama_history', JSON.stringify(updatedHistory));
  };

  const deleteFromHistory = (id: string) => {
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('chama_history', JSON.stringify(updatedHistory));
  };

  const handleGenerateScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName) {
      alert("Tafadhali weka jina la mwanachama.");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const prompt = `
        You are a Kenyan Credit Scoring Expert specializing in Chama (investment group) dynamics.
        Analyze the following financial data for member: ${memberName}
        
        1. Mobile Money Transactions:
        ${mobileMoney || "No data provided"}
        
        2. SMS Financial Records:
        ${smsRecords || "No data provided"}
        
        3. Group Contribution History:
        ${groupContributions || "No data provided"}
        
        Rules:
        - Be realistic about Kenyan financial behaviors (side-hustles, M-Pesa patterns, chama consistency).
        - The explanation should be in a Swahili/English code-switched style (Sheng/Urban Swahili).
        - Provide scores between 0 and 100.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              credit_score: { type: Type.NUMBER },
              risk_level: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
              explanation: { type: Type.STRING },
              features: {
                type: Type.OBJECT,
                properties: {
                  income_stability: { type: Type.NUMBER },
                  savings_behavior: { type: Type.NUMBER },
                  contribution_consistency: { type: Type.NUMBER },
                  spending_ratio: { type: Type.NUMBER }
                },
                required: ["income_stability", "savings_behavior", "contribution_consistency", "spending_ratio"]
              }
            },
            required: ["credit_score", "risk_level", "explanation", "features"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      const result: AnalysisResult = {
        id: crypto.randomUUID(),
        date: new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }),
        member_name: memberName,
        ...data
      };
      
      setCurrentResult(result);
      setCurrentScreen(Screen.Results);
    } catch (error) {
      console.error("AI Analysis failed", error);
      alert("Kuna shida kidogo na AI. Jaribu tena baada ya muda.");
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Date", "Member Name", "Credit Score", "Risk Level"];
    const rows = filteredHistory.map(item => [item.date, item.member_name, item.credit_score, item.risk_level]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ChamaScore_History_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesSearch = item.member_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = riskFilter === "All" || item.risk_level === riskFilter;
      return matchesSearch && matchesRisk;
    });
  }, [history, searchQuery, riskFilter]);

  const resetAnalysisForm = () => {
    setMemberName("");
    setMobileMoney("");
    setSmsRecords("");
    setGroupContributions("");
    setCurrentResult(null);
  };

  // --- Sub-screens ---

  const HomeScreen = () => (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-br from-white to-emerald-50 py-16 lg:py-24 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                AI-Powered Credit Engine
              </span>
              <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 leading-tight">
                ChamaScore - <br/>
                <span className="text-[#0F9D58]">Pata Credit Score Yako</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-lg">
                Using AI to predict creditworthiness for Chamas and side-hustles. Build trust with data and unlock communal growth.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => { resetAnalysisForm(); setCurrentScreen(Screen.NewAnalysis); }}
                className="bg-[#0F9D58] text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-all flex items-center gap-2 active:scale-95"
              >
                <UserPlus size={20} />
                Analyze New Member
              </button>
              <button 
                onClick={() => setCurrentScreen(Screen.History)}
                className="bg-white border border-slate-200 text-[#0F9D58] px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                View Reports
              </button>
            </div>
            
            {/* Quick Setup Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">1</span>
                  <h4 className="text-sm font-bold text-slate-800 tracking-tight">Quick Setup (Chama moja kwa moja)</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pata credit score yako kwa dakika mbili tu. Link account yako na uanze kupata loans leo hii.
                </p>
              </div>
            </motion.div>
            <div className="flex items-center gap-4 text-slate-500">
              <div className="flex -space-x-4">
                <img 
                  className="w-10 h-10 rounded-full border-2 border-white object-cover" 
                  src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=2574&auto=format&fit=crop"
                  alt="Trusted User"
                  referrerPolicy="no-referrer"
                />
                <img 
                  className="w-10 h-10 rounded-full border-2 border-white object-cover" 
                  src="https://images.unsplash.com/photo-1506272517165-e9411d4d52ad?q=80&w=2669&auto=format&fit=crop"
                  alt="Trusted User"
                  referrerPolicy="no-referrer"
                />
                <img 
                  className="w-10 h-10 rounded-full border-2 border-white object-cover" 
                  src="https://images.unsplash.com/photo-1523824921871-d6f1a15151f1?q=80&w=2574&auto=format&fit=crop"
                  alt="Trusted User"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="text-sm font-medium">Trusted by 200+ local investment groups</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-emerald-200/20 blur-3xl rounded-full"></div>
            <div className="relative bg-white p-4 rounded-[2rem] shadow-2xl border border-slate-100">
              <img 
                src="https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=2670&auto=format&fit=crop" 
                alt="Chama Community Collaboration"
                className="rounded-2xl w-full aspect-[4/3] object-cover"
                referrerPolicy="no-referrer"
              />
              {/* Floating Cards */}
              <div className="absolute -bottom-6 -left-6 bg-[#1A73E8] text-white p-4 rounded-2xl shadow-xl max-w-[200px] border border-blue-400/20">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={14} className="fill-current" />
                  <span className="text-[10px] font-bold uppercase">AI Insight</span>
                </div>
                <p className="text-xs font-medium">Repayment probability increased by 24% this month.</p>
              </div>
              <div className="absolute -top-12 -right-8 bg-white p-4 rounded-3xl shadow-2xl border border-slate-50 flex flex-col items-center gap-2">
                <div className="relative">
                  <img 
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=2576&auto=format&fit=crop" 
                    alt="Member" 
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#0F9D58] rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                    72
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Member Score</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-[#0F9D58] group-hover:text-white transition-colors">
                  <Users size={24} />
                </div>
                <span className="text-[#0F9D58] font-bold text-sm">+12% vs last mo</span>
              </div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Members Analyzed</h3>
              <p className="text-3xl font-bold text-slate-900 mt-1">1,247</p>
              <div className="mt-4 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#0F9D58] w-[65%]"></div>
              </div>
            </div>

            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-100 text-[#1A73E8] group-hover:bg-[#1A73E8] group-hover:text-white transition-colors">
                  <TrendingUp size={24} />
                </div>
                <span className="text-[#1A73E8] font-bold text-sm">Optimal Range</span>
              </div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Score</h3>
              <p className="text-3xl font-bold text-slate-900 mt-1">68</p>
              <div className="mt-4 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#1A73E8] w-[82%]"></div>
              </div>
            </div>

            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <Wallet size={24} />
                </div>
                <span className="text-orange-600 font-bold text-sm">Active Now</span>
              </div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chamas Using</h3>
              <p className="text-3xl font-bold text-slate-900 mt-1">89</p>
              <div className="mt-4 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-orange-600 w-[45%]"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Analysis Bento */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl font-bold text-slate-900">Advanced Analysis for Smart Finance</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">We combine transactional history with behavioral data to give you the most accurate credit profile in the Kenyan market.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col justify-between group overflow-hidden">
              <div>
                <h4 className="text-2xl font-bold text-slate-800 mb-2">Predictive Repayment Patterns</h4>
                <p className="text-slate-500 max-w-md">Our AI analyzes over 50 data points to predict member contribution reliability.</p>
              </div>
              <div className="mt-8 rounded-2xl overflow-hidden shadow-inner border border-slate-50">
                <img 
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop" 
                  alt="Analytics Dashboard Analytics" 
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <div className="md:col-span-4 bg-[#0F9D58] p-8 rounded-[2rem] text-white flex flex-col justify-center gap-6 shadow-xl">
              <ShieldCheck size={48} className="opacity-90" />
              <h4 className="text-2xl font-bold">Enterprise-Grade Security</h4>
              <p className="opacity-90">Your Chama data is encrypted and handled with the highest privacy standards.</p>
              <div className="h-px w-full bg-white/20"></div>
              <a href="#" className="inline-flex items-center gap-2 font-bold hover:underline">
                Read Security Docs <ArrowRight size={16} />
              </a>
            </div>
            <div className="md:col-span-4 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between overflow-hidden group">
              <div>
                <Smartphone size={40} className="text-[#0F9D58]" />
                <div className="mt-4">
                  <h4 className="text-xl font-bold text-slate-800 mb-2">Mobile Integration</h4>
                  <p className="text-slate-500">Seamlessly connect to M-Pesa statements for instant analysis.</p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl overflow-hidden border border-slate-100 shadow-md">
                <img 
                  src="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=2670&auto=format&fit=crop" 
                  alt="Mobile Payment Processing"
                  className="w-full h-40 object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <div className="md:col-span-8 bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col justify-center">
              <div className="flex-1">
                <h4 className="text-xl font-bold text-slate-800 mb-2">Historical Benchmarking</h4>
                <p className="text-slate-500 max-w-xl">Compare your Chama's health against industry standards across Kenya. Understand where you stand relative to transport, agriculture, and real estate investment groups.</p>
                <button 
                  onClick={() => setCurrentScreen(Screen.NewAnalysis)}
                  className="mt-6 px-6 py-3 bg-[#0F9D58]/10 text-[#0F9D58] rounded-xl font-bold flex items-center gap-2 hover:bg-[#0F9D58]/20 transition-all w-fit"
                >
                  Try Benchmarking Tool <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Members Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="space-y-4">
              <span className="text-[#0F9D58] font-bold uppercase tracking-widest text-sm">Case Studies</span>
              <h2 className="text-4xl font-bold text-slate-900 leading-tight">Sample Members <br/><span className="text-slate-400 font-medium">(Wanachama wa Mfano)</span></h2>
              <p className="text-slate-500 max-w-xl">Click on a member to see how our AI analyzes their financial standing and provides actionable credit insights.</p>
            </div>
            <button 
              onClick={() => setCurrentScreen(Screen.History)}
              className="text-[#1A73E8] font-bold flex items-center gap-2 hover:gap-3 transition-all"
            >
              See all members <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {SAMPLE_RESULTS.map((member) => (
              <motion.div 
                key={member.id}
                whileHover={{ y: -10 }}
                onClick={() => { setCurrentResult(member); setCurrentScreen(Screen.Results); window.scrollTo(0,0); }}
                className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 -mr-16 -mt-16 rounded-full ${
                  member.risk_level === 'Low' ? 'bg-emerald-400' : 
                  member.risk_level === 'Medium' ? 'bg-yellow-400' : 
                  'bg-red-400'
                }`}></div>
                
                <div className="relative z-10 flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden border border-slate-100">
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.member_name}`} 
                        alt={member.member_name} 
                        className="w-12 h-12"
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{member.member_name}</h3>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{member.id === 'sample-jane' ? 'Trader' : member.id === 'sample-peter' ? 'Boda Operator' : 'Farmer'}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-inner border border-slate-100 flex flex-col items-center gap-4">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Credit Score</span>
                      <span className={`text-2xl font-black ${
                        member.credit_score >= 70 ? 'text-[#0F9D58]' : 
                        member.credit_score >= 40 ? 'text-yellow-600' : 
                        'text-red-600'
                      }`}>{member.credit_score}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          member.credit_score >= 70 ? 'bg-[#0F9D58]' : 
                          member.credit_score >= 40 ? 'bg-yellow-500' : 
                          'bg-red-500'
                        }`}
                        style={{ width: `${member.credit_score}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm border ${
                      member.risk_level === 'Low' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                      member.risk_level === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 
                      'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {member.risk_level === 'Low' ? <CheckCircle2 size={16} /> : 
                       member.risk_level === 'Medium' ? <AlertTriangle size={16} /> : 
                       <XCircle size={16} />}
                      {member.risk_level} Risk - {
                        member.risk_level === 'Low' ? "Anaweza kupata loan" :
                        member.risk_level === 'Medium' ? "Angalia tena" :
                        "Risk iko juu"
                      }
                    </div>
                    <button className="w-full py-4 rounded-xl font-bold text-sm bg-slate-900 text-white flex items-center justify-center gap-2 group-hover:bg-[#1A73E8] transition-colors">
                      View Detailed Analysis
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  const NewAnalysisScreen = () => (
    <div className="max-w-4xl mx-auto py-12 px-4 flex flex-col gap-12">
      <header className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
        <div className="flex-1 space-y-2">
          <h1 className="text-4xl font-bold text-slate-900 leading-tight">Analyze Your Financial Standing</h1>
          <p className="text-slate-500 max-w-xl text-lg">
            Paste your financial communications below. Our AI engine will process your transaction patterns to generate your community-verified credit score.
          </p>
        </div>
        <div className="w-full md:w-48 h-48 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white rotate-3">
          <img 
            src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=2670&auto=format&fit=crop" 
            alt="Analysis Illustration"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      </header>

      <form onSubmit={handleGenerateScore} className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-50 text-slate-400">
              <UserPlus size={24} />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Member Name</label>
              <input 
                type="text" 
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="Ingiza jina kamili..."
                className="w-full mt-1 border-none focus:ring-0 text-lg font-medium p-0 placeholder:text-slate-300"
                required
              />
            </div>
          </div>
        </div>

        <details open className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <summary className="flex items-center justify-between p-6 cursor-pointer list-none bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-100 p-3 rounded-xl text-[#0F9D58]">
                <Smartphone size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">Mobile Money Transactions</h3>
                <p className="text-xs text-slate-500">M-Pesa, Airtel Money, and bank transfer SMS</p>
              </div>
            </div>
            <ChevronRight className="text-slate-300 group-open:rotate-90 transition-transform" />
          </summary>
          <div className="p-6 pt-2 border-t border-slate-100">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label className="block mb-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Paste M-Pesa SMS or transaction records</label>
                <textarea 
                  value={mobileMoney}
                  onChange={(e) => setMobileMoney(e.target.value)}
                  className="w-full min-h-[160px] rounded-xl border border-slate-200 bg-slate-50 focus:border-[#0F9D58] focus:ring-1 focus:ring-[#0F9D58] p-4 text-sm resize-none" 
                  placeholder="QW34RT5678 Confirmed. Ksh2,500.00 sent to CHAMA_POWER_GROUP on 12/05/24 at 10:30 AM. New M-PESA balance is..."
                ></textarea>
                <div className="mt-3 flex items-center gap-2 text-emerald-600 text-xs font-medium">
                  <ShieldCheck size={14} />
                  <span>Data is encrypted and anonymized during analysis.</span>
                </div>
              </div>
              <div className="w-full md:w-64 h-40 md:h-auto rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                <img 
                  src="https://images.unsplash.com/photo-1556742111-a301076d9d18?q=80&w=2670&auto=format&fit=crop" 
                  alt="Mobile Payment Verification"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </details>

        <details className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-xl text-[#1A73E8]">
                <Smartphone size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">SMS Financial Records</h3>
                <p className="text-xs text-slate-500">Business payments, utility bills, and loan alerts</p>
              </div>
            </div>
            <ChevronRight className="text-slate-300 group-open:rotate-90 transition-transform" />
          </summary>
          <div className="p-6 pt-2 border-t border-slate-100">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label className="block mb-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Paste SMS financial communications</label>
                <textarea 
                   value={smsRecords}
                   onChange={(e) => setSmsRecords(e.target.value)}
                   className="w-full min-h-[160px] rounded-xl border border-slate-200 bg-slate-50 focus:border-[#0F9D58] focus:ring-1 focus:ring-[#0F9D58] p-4 text-sm resize-none" 
                   placeholder="KPLC: Bill of KES 1,200 paid for Account..."
                ></textarea>
              </div>
              <div className="w-full md:w-64 h-40 md:h-auto rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                <img 
                  src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=2574&auto=format&fit=crop" 
                  alt="SMS Records Integration"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </details>

        <details className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-xl text-orange-600">
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Group Contributions</h3>
                <p className="text-xs text-slate-500">Weekly merry-go-round and chama meeting logs</p>
              </div>
            </div>
            <ChevronRight className="text-slate-300 group-open:rotate-90 transition-transform" />
          </summary>
          <div className="p-6 pt-2 border-t border-slate-100">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label className="block mb-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Enter Chama contribution history</label>
                <textarea 
                  value={groupContributions}
                  onChange={(e) => setGroupContributions(e.target.value)}
                  className="w-full min-h-[160px] rounded-xl border border-slate-200 bg-slate-50 focus:border-[#0F9D58] focus:ring-1 focus:ring-[#0F9D58] p-4 text-sm resize-none" 
                  placeholder="Week 1: 2000 KES on time..."
                ></textarea>
              </div>
              <div className="w-full md:w-64 h-40 md:h-auto rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                <img 
                  src="https://images.unsplash.com/photo-1556742044-3c52d6e88ca0?q=80&w=2426&auto=format&fit=crop" 
                  alt="Chama Community"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </details>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4 items-start shadow-sm">
          <div className="bg-blue-100 p-2 rounded-lg text-[#1A73E8]">
            <BrainCircuit size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-blue-900 tracking-wide uppercase">AI Insight</h4>
            <p className="text-sm text-blue-700 mt-1">Providing more data across all three categories increases the accuracy of your ChamaScore by up to 45%.</p>
          </div>
        </div>

        <div className="pt-8 flex flex-col items-center gap-4">
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto md:min-w-[400px] bg-[#1A73E8] hover:bg-[#1557b0] text-white py-4 px-8 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            {isLoading ? (
              <>
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                />
                Analysing Data...
              </>
            ) : (
              <>
                Generate Credit Score - Pata Score
                <Rocket size={24} />
              </>
            )}
          </button>
          
          <button 
            type="button"
            onClick={() => {
              setIsConnected(true);
              setTimeout(() => setIsConnected(false), 3000);
            }}
            className="w-full md:w-auto md:min-w-[400px] border-2 border-[#0F9D58] text-[#0F9D58] py-4 px-8 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 hover:bg-emerald-50 active:scale-[0.98] transition-all"
          >
            <Wallet size={24} />
            Connect Your Chama Wallet
          </button>

          <AnimatePresence>
            {isConnected && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="mt-4 p-4 bg-emerald-100 text-emerald-800 rounded-xl flex items-center gap-3 border border-emerald-200"
              >
                <CheckCircle2 size={24} className="text-emerald-600" />
                <span className="font-bold">Chama Wallet Connected Successfully!</span>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-sm text-slate-400 font-medium italic">Estimated processing time: 15 seconds</p>
        </div>
      </form>
    </div>
  );

  const ResultsScreen = () => {
    if (!currentResult) return null;
    
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 w-full flex flex-col gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Score Overview */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-5 space-y-6"
          >
            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center">
              <h2 className="text-3xl font-bold text-slate-800 mb-8">Credit Health Score</h2>
              <Gauge score={currentResult.credit_score} riskLevel={currentResult.risk_level} />
              
              <div className={`mt-10 px-8 py-4 rounded-full flex items-center gap-3 border shadow-sm ${
                currentResult.risk_level === 'Low' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                currentResult.risk_level === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                'bg-red-50 text-red-700 border-red-100'
              }`}>
                {currentResult.risk_level === 'Low' ? <CheckCircle2 size={24} /> : 
                 currentResult.risk_level === 'Medium' ? <AlertTriangle size={24} /> : 
                 <XCircle size={24} />}
                <span className="text-lg font-bold">
                  {currentResult.risk_level} Risk - {
                    currentResult.risk_level === 'Low' ? "Anaweza Kupata Loan" :
                    currentResult.risk_level === 'Medium' ? "Angalia Tena" :
                    "Risk Iko Juu"
                  }
                </span>
              </div>
              <p className="mt-6 text-slate-500 leading-relaxed text-sm">
                This score reflects {currentResult.member_name}'s financial reliability based on community and transaction data.
              </p>
            </div>

            <div className="bg-blue-50/50 p-8 rounded-3xl border-l-[6px] border-[#1A73E8] shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <BrainCircuit className="text-[#1A73E8]" size={28} />
                <h3 className="text-xl font-bold text-[#1A73E8]">Explanation (Sheng/Kiswahili)</h3>
              </div>
              <p className="text-lg text-slate-700 leading-relaxed italic">
                "{currentResult.explanation}"
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => saveToHistory(currentResult)}
                className="flex-1 border-2 border-[#1A73E8] text-[#1A73E8] px-6 py-4 rounded-2xl font-bold text-lg hover:bg-blue-50 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Save to History
              </button>
              <button 
                onClick={() => { resetAnalysisForm(); setCurrentScreen(Screen.NewAnalysis); }}
                className="flex-1 bg-[#0F9D58] text-white px-6 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus size={20} />
                New Analysis
              </button>
            </div>
          </motion.div>

          {/* Breakdown Grid */}
          <div className="lg:col-span-7 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { title: "Income Stability", key: "income_stability" as keyof AnalysisFeatures, icon: Briefcase, color: "blue" },
                { title: "Savings Behavior", key: "savings_behavior" as keyof AnalysisFeatures, icon: Wallet, color: "emerald" },
                { title: "Contribution Consistency", key: "contribution_consistency" as keyof AnalysisFeatures, icon: Users, color: "orange" },
                { title: "Spending Ratio", key: "spending_ratio" as keyof AnalysisFeatures, icon: TrendingUp, color: "blue" },
              ].map((feature, i) => {
                const val = currentResult.features[feature.key];
                return (
                  <motion.div 
                    key={feature.key}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-6"
                  >
                    <div className="flex justify-between items-start">
                      <div className={`p-4 rounded-2xl ${feature.color === 'blue' ? 'bg-blue-50 text-[#1A73E8]' : feature.color === 'emerald' ? 'bg-emerald-50 text-[#0F9D58]' : 'bg-orange-50 text-orange-600'}`}>
                        <feature.icon size={28} />
                      </div>
                      <span className="text-3xl font-bold text-slate-800">{val}%</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-700 mb-4">{feature.title}</h4>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${val}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className={`h-full rounded-full ${feature.color === 'blue' ? 'bg-[#1A73E8]' : feature.color === 'emerald' ? 'bg-[#0F9D58]' : 'bg-orange-600'}`}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="rounded-[2.5rem] overflow-hidden relative h-72 shadow-xl border border-white bg-emerald-800">
              <img 
                src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=2670&auto=format&fit=crop" 
                alt="Community Trust Factor" 
                className="w-full h-full object-cover bg-emerald-900 opacity-60"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/90 to-transparent flex items-center p-12">
                <div className="text-white space-y-3">
                  <h3 className="text-3xl font-bold">Community Trust Factor</h3>
                  <p className="max-w-md text-emerald-50/80 leading-relaxed">Our AI analysis includes peer-review data from Chama members to ensure a 360-degree view of creditworthiness.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const HistoryScreen = () => (
    <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col gap-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Analysis History</h1>
          <p className="text-slate-500 mt-1">Review and manage past credit score analyses for your chama members.</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-[#1A73E8] text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
        >
          <Download size={20} />
          Export to CSV
        </button>
      </header>

      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-center">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by member name..."
            className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-slate-300 focus:ring-[#0F9D58] focus:border-[#0F9D58] shadow-inner text-sm font-medium"
          />
        </div>
        <div className="flex items-center gap-3 min-w-[200px]">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Filter:</span>
          <select 
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold focus:ring-[#0F9D58] focus:border-[#0F9D58] shadow-sm appearance-none cursor-pointer"
          >
            <option value="All">All Risks</option>
            <option value="Low">Low Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="High">High Risk</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Member Name</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Credit Score</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Risk Level</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.length > 0 ? filteredHistory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6 text-sm font-medium text-slate-500">{item.date}</td>
                  <td className="px-8 py-6 text-base font-bold text-slate-800">{item.member_name}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm ${
                        item.credit_score >= 70 ? 'border-[#0F9D58] text-[#0F9D58]' :
                        item.credit_score >= 40 ? 'border-yellow-600 text-yellow-600' :
                        'border-red-600 text-red-600'
                      }`}>
                        {item.credit_score}
                      </div>
                      <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            item.credit_score >= 70 ? 'bg-[#0F9D58]' :
                            item.credit_score >= 40 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${item.credit_score}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                      item.risk_level === 'Low' ? 'bg-emerald-100 text-[#0F9D58]' :
                      item.risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {item.risk_level} Risk
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-3">
                      <button 
                         onClick={() => { setCurrentResult(item); setCurrentScreen(Screen.Results); }}
                         className="p-2.5 text-[#1A73E8] hover:bg-blue-50 rounded-xl transition-all" title="View details"
                      >
                        <Eye size={20} />
                      </button>
                      <button 
                        onClick={() => deleteFromHistory(item.id)}
                        className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Delete record"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-medium italic">
                    No analyses found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#1A73E8] p-8 rounded-[2rem] text-white flex items-start gap-6 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 transform translate-x-1/2 -translate-y-1/2 bg-white/10 rounded-full w-64 h-64 blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
        <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
          <BrainCircuit size={32} className="text-white" />
        </div>
        <div className="relative">
          <h3 className="text-2xl font-bold mb-2">AI Insights on History</h3>
          <p className="text-lg opacity-90 leading-relaxed max-w-4xl">
            Based on your last {history.length} analyses, the overall risk level of your Chama has decreased by <span className="font-bold underline decoration-2 underline-offset-4 decoration-white/40">12%</span>. This indicates strengthening communal trust and improved financial discipline within the group.
          </p>
        </div>
      </div>
    </div>
  );

  const AboutScreen = () => (
    <div className="flex flex-col gap-12 py-12">
      <section className="max-w-7xl mx-auto px-4 text-center space-y-8">
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl font-bold text-slate-900 leading-tight"
        >
          Kuhusu ChamaScore
        </motion.h1>
        <motion.p 
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           className="text-lg text-slate-500 max-w-3xl mx-auto leading-relaxed"
        >
          Bridging the gap between formal financial systems and the vibrant world of informal communal savings in Kenya. We believe your reliability within your Chama is your most valuable asset.
        </motion.p>
        <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white aspect-[21/9] bg-slate-100">
          <img 
            src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2670&auto=format&fit=crop" 
            alt="Kenyan Financial Community" 
            className="w-full h-full object-cover bg-slate-200"
            referrerPolicy="no-referrer"
          />
        </div>
      </section>

      <section className="bg-slate-50 py-16 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <div className="w-14 h-14 bg-emerald-100 text-[#0F9D58] rounded-2xl flex items-center justify-center shadow-inner">
              <Rocket size={32} />
            </div>
            <h2 className="text-3xl font-bold text-slate-800">Our Mission</h2>
            <p className="text-slate-600 leading-relaxed">
              Empowering side-hustles and Chamas through data-driven trust. We transform informal transaction records into a verifiable financial identity that opens doors to formal credit opportunities.
            </p>
          </div>
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <div className="w-14 h-14 bg-blue-100 text-[#1A73E8] rounded-2xl flex items-center justify-center shadow-inner">
              <Eye size={32} />
            </div>
            <h2 className="text-3xl font-bold text-slate-800">Our Vision</h2>
            <p className="text-slate-600 leading-relaxed">
              A future where every Kenyan has access to credit based on their communal reliability. We envision a society where your word and your contribution history in your group are as powerful as a bank balance.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 space-y-6">
            <h2 className="text-4xl font-black text-slate-900 leading-tight">Mbona Community Trust Ni Muhimu?</h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Katika soko la Kenya, character na reliability yako kwa group ndio collateral ya kweli. Tunatumia AI kuona pattern za contributions zako na transaction records ili kukupea score ambayo banks na micro-financers wanaweza kuamini.
            </p>
            <div className="flex flex-col gap-4">
              {[
                { title: "Verifiable Identity", desc: "Geuza group records kuwa official financial statement." },
                { title: "Growth Opportunities", desc: "Unlock loans za kutanua business na side-hustles." },
                { title: "Safe & Secure", desc: "Data yako iko protected kwa standards za hali ya juu." }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="mt-1 bg-emerald-100 text-[#0F9D58] p-1 rounded-full shrink-0 h-fit">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 tracking-tight">{item.title}</h4>
                    <p className="text-slate-500 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 md:order-2">
            <div className="relative group">
              <div className="absolute -inset-4 bg-emerald-100/50 rounded-[3rem] blur-2xl group-hover:bg-emerald-200/50 transition-colors"></div>
              <img 
                src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?q=80&w=2670&auto=format&fit=crop" 
                alt="Community Collaboration and Trust"
                className="relative rounded-[2.5rem] shadow-2xl border-8 border-white object-cover aspect-square"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16 space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold text-slate-900">How it Works</h2>
          <p className="text-slate-500">Three simple steps to unlock your financial potential.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-12">
          {[
            { id: 1, title: "Data Input", icon: Smartphone, desc: "Paste your M-Pesa transaction records or upload group contribution sheets directly into our secure portal.", color: "emerald" },
            { id: 2, title: "AI Analysis", icon: BrainCircuit, desc: "Our advanced AI engine processes contribution patterns, identifying your reliability and financial consistency.", color: "blue" },
            { id: 3, title: "Trust Score", icon: CheckCircle2, desc: "Receive a verified ChamaScore that you can use as proof of creditworthiness for your next loan application or partnership.", color: "emerald" },
          ].map((step, i) => (
            <div key={step.id} className="text-center space-y-6 flex flex-col items-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${step.color === 'emerald' ? 'bg-emerald-100 text-[#0F9D58]' : 'bg-blue-100 text-[#1A73E8]'}`}>
                <step.icon size={36} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">{step.id}. {step.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed max-w-[280px]">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>


    </div>
  );

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-[#0F9D58]">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-20">
          <div 
            onClick={() => setCurrentScreen(Screen.Home)}
            className="text-2xl font-black tracking-tight text-[#0F9D58] flex items-center gap-2 cursor-pointer group"
          >
            <div className="bg-[#0F9D58] p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
              <LayoutDashboard size={24} className="text-white fill-current" />
            </div>
            ChamaScore
          </div>
          
          <nav className="hidden md:flex items-center gap-10">
            {[
              { label: "Home", screen: Screen.Home },
              { label: "New Analysis", screen: Screen.NewAnalysis },
              { label: "History", screen: Screen.History },
              { label: "About", screen: Screen.About },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => { setCurrentScreen(item.screen); window.scrollTo(0,0); }}
                className={`relative px-1 py-2 font-bold text-sm tracking-wide transition-colors ${
                  currentScreen === item.screen ? 'text-[#0F9D58]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {item.label}
                {currentScreen === item.screen && (
                  <motion.div 
                    layoutId="navUnderline"
                    className="absolute -bottom-1 left-0 right-0 h-1 bg-[#0F9D58] rounded-full"
                  />
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-slate-600"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-100 overflow-hidden"
          >
            <div className="px-4 py-6 flex flex-col gap-4">
              {[
                { label: "Home", screen: Screen.Home },
                { label: "New Analysis", screen: Screen.NewAnalysis },
                { label: "History", screen: Screen.History },
                { label: "About", screen: Screen.About },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => { setCurrentScreen(item.screen); setIsMenuOpen(false); window.scrollTo(0,0); }}
                  className={`w-full text-left px-6 py-4 rounded-2xl font-bold text-lg ${
                    currentScreen === item.screen ? 'bg-emerald-50 text-[#0F9D58]' : 'text-slate-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {currentScreen === Screen.Home && <HomeScreen />}
            {currentScreen === Screen.NewAnalysis && <NewAnalysisScreen />}
            {currentScreen === Screen.Results && <ResultsScreen />}
            {currentScreen === Screen.History && <HistoryScreen />}
            {currentScreen === Screen.About && <AboutScreen />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="w-full py-16 mt-auto bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="text-3xl font-black text-[#0F9D58] flex items-center gap-2">
              <div className="bg-[#0F9D58] p-1.5 rounded-lg">
                <LayoutDashboard size={20} className="text-white fill-current" />
              </div>
              ChamaScore
            </div>
            <p className="text-sm text-slate-500 max-w-sm font-medium leading-relaxed">
              © 2024 ChamaScore. Empowering Kenyan Chamas through AI. Building a more inclusive financial future for every investment group.
            </p>
          </div>
          <div className="flex flex-wrap justify-start md:justify-end gap-x-10 gap-y-6">
            {["Privacy Policy", "Terms of Service", "Help Center", "Contact Us"].map(nav => (
              <a key={nav} href="#" className="text-slate-400 hover:text-[#0F9D58] underline underline-offset-4 text-sm transition-colors font-bold tracking-wide">{nav}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
