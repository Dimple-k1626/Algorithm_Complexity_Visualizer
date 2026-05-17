import React, { useState, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import axios from 'axios';
import { Download, Play, Activity, BrainCircuit, Target, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const API_URL = import.meta.env.VITE_API_URL || '';

export default function Dashboard() {
  const [algorithms, setAlgorithms] = useState(['bubble', 'merge']);
  const [caseType, setCaseType] = useState('average');
  const [sizesInput, setSizesInput] = useState('100, 500, 1000, 5000, 10000');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [explanations, setExplanations] = useState({});
  const [estimations, setEstimations] = useState({});
  const chartRef = useRef(null);

  useEffect(() => {
    const fetchExplanations = async () => {
      const newExps = {};
      for (let algo of algorithms) {
        try {
          const res = await axios.post(`${API_URL}/explain`, { algorithm: algo });
          newExps[algo] = res.data;
        } catch (e) {
          console.error(`Error fetching explanation for ${algo}:`, e);
        }
      }
      setExplanations(newExps);
    };
    fetchExplanations();
  }, [algorithms]);

  const runTest = async () => {
    setLoading(true);
    setResults([]);
    setEstimations({});
    setProgress(0);
    
    const sizes = sizesInput.split(',').map(s => parseInt(s.trim())).filter(s => !isNaN(s) && s > 0).sort((a,b) => a - b);
    if (sizes.length === 0 || algorithms.length === 0) {
        alert("Please select at least one algorithm and enter valid positive integers for sizes.");
        setLoading(false);
        return;
    }

    const testResults = [];
    const newEstimations = {};
    const totalRuns = algorithms.length * sizes.length;
    let completedRuns = 0;

    for (let algo of algorithms) {
        const algoResults = [];
        for (let size of sizes) {
          try {
            const response = await axios.post(`${API_URL}/run`, {
              algorithm: algo,
              size,
              case: caseType
            });
            algoResults.push(response.data);
            testResults.push(response.data);
            setResults([...testResults]);
            completedRuns++;
            setProgress((completedRuns / totalRuns) * 100);
          } catch (err) {
            console.error(err);
            alert(`Error for ${algo.toUpperCase()} size ${size}: ` + (err.response?.data?.error || err.message));
            break;
          }
        }
        
        // Use AI backend to guess empirical complexity
        if (algoResults.length >= 2) {
            try {
                const estRes = await axios.post(`${API_URL}/guess_complexity`, { results: algoResults });
                newEstimations[algo] = estRes.data;
                setEstimations({...newEstimations});
            } catch (e) {
                console.error("Error guessing complexity", e);
            }
        }
    }
    setLoading(false);
  };

  const downloadReport = async () => {
    if (results.length === 0) {
        alert("Run a test first to generate a report.");
        return;
    }
    
    let graphImage = '';
    if (chartRef.current) {
        graphImage = chartRef.current.toBase64Image();
    }

    try {
      const response = await axios.post(`${API_URL}/report`, {
          algorithm: algorithms.join(' vs '),
          case_type: caseType,
          results,
          graph_image: graphImage
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `comparison_${caseType}_report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Error generating report.');
    }
  };

  const generateChartData = () => {
    if (results.length === 0) return { labels: [], datasets: [] };

    const sizesSet = new Set(results.map(r => r.n));
    const labels = Array.from(sizesSet).sort((a,b) => a - b);
    
    const colors = {
        linear: '#00ff9d',
        binary: '#3498db',
        bubble: '#ff0055',
        merge: '#f1c40f',
        quick: '#9b59b6'
    };

    const datasets = [];
    const algosInResults = [...new Set(results.map(r => r.algorithm))];
    
    for (let algo of algosInResults) {
        const algoResults = results.filter(r => r.algorithm === algo);
        const data = labels.map(label => {
            const point = algoResults.find(r => r.n === label);
            return point ? point.time : null;
        });
        
        datasets.push({
          label: `${algo.toUpperCase()} Time (ms)`,
          data,
          borderColor: colors[algo] || '#ffffff',
          backgroundColor: (colors[algo] || '#ffffff') + '33',
          borderWidth: 3,
          tension: 0.3, // Smoother curves
          spanGaps: true,
          pointBackgroundColor: colors[algo],
          pointRadius: 4,
          pointHoverRadius: 6
        });
    }

    if (algosInResults.length === 1) {
        const algo = algosInResults[0];
        const algoResults = results.filter(r => r.algorithm === algo);
        const empiricalTimes = labels.map(label => algoResults.find(r => r.n === label)?.time || 0);
        
        const maxN = labels[labels.length - 1];
        const maxTime = empiricalTimes[empiricalTimes.length - 1] || 0;
        
        const safeMaxN = maxN > 0 ? maxN : 1;
        const logMaxN = Math.log2(safeMaxN) || 1;

        const k_n = maxTime / safeMaxN;
        const k_n2 = maxTime / (safeMaxN * safeMaxN);
        const k_nlogn = maxTime / (safeMaxN * logMaxN);
        const k_logn = maxTime / logMaxN;

        datasets.push({
          label: 'O(n)', data: labels.map(n => k_n * n),
          borderColor: '#a9b1d6', borderDash: [5, 5], borderWidth: 1, pointRadius: 0
        });
        datasets.push({
          label: 'O(n²)', data: labels.map(n => k_n2 * (n * n)),
          borderColor: '#ff0055', borderDash: [5, 5], borderWidth: 1, pointRadius: 0
        });
        datasets.push({
          label: 'O(n log n)', data: labels.map(n => k_nlogn * (n * (Math.log2(n) || 1))),
          borderColor: '#f1c40f', borderDash: [5, 5], borderWidth: 1, pointRadius: 0
        });
        datasets.push({
          label: 'O(log n)', data: labels.map(n => k_logn * (Math.log2(n) || 1)),
          borderColor: '#3498db', borderDash: [5, 5], borderWidth: 1, pointRadius: 0
        });
    }

    return { labels, datasets };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    color: '#a9b1d6',
    animation: { duration: 500 },
    scales: {
      x: {
        grid: { color: '#27273a' },
        ticks: { color: '#a9b1d6' },
        title: { display: true, text: 'Input Size (n)', color: '#a9b1d6' }
      },
      y: {
        type: 'linear',
        grid: { color: '#27273a' },
        ticks: { color: '#a9b1d6' },
        title: { display: true, text: 'Execution Time (ms)', color: '#a9b1d6' }
      }
    },
    plugins: {
      legend: { labels: { color: '#a9b1d6', usePointStyle: true, boxWidth: 8 } },
      tooltip: { backgroundColor: 'rgba(22, 22, 30, 0.9)', titleColor: '#00ff9d', padding: 12, cornerRadius: 8 }
    }
  };

  return (
    <div className="min-h-screen bg-cyber-dark text-cyber-text p-8 font-sans selection:bg-cyber-accent selection:text-black relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-accent/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ff0055]/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        <motion.header 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="flex items-center justify-between border-b border-cyber-border pb-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyber-card rounded-xl border border-cyber-border shadow-[0_0_15px_rgba(0,255,157,0.15)]">
              <Activity className="text-cyber-accent w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight">
                Algorithm Visualizer
              </h1>
              <p className="text-sm text-cyber-accent/80 mt-1 flex items-center gap-2">
                <Cpu className="w-4 h-4" /> DAA PROJECT
              </p>
            </div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(255,0,85,0.2)' }}
            whileTap={{ scale: 0.98 }}
            onClick={downloadReport}
            disabled={results.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyber-card hover:bg-[#1a1a24] border border-cyber-border rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium shadow-sm"
          >
            <Download className="w-4 h-4 text-cyber-secondary" />
            Export PDF
          </motion.button>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6 lg:col-span-1"
          >
            <div className="bg-cyber-card border border-cyber-border rounded-xl p-6 h-fit space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyber-accent to-cyber-secondary"></div>
              
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-gray-400" /> Matrix Config
              </h2>
              
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-bold text-gray-500">Algorithms to Compare</label>
                <div className="flex flex-col gap-2 mt-2">
                  {[
                    { id: 'linear', name: 'Linear Search' },
                    { id: 'binary', name: 'Binary Search' },
                    { id: 'bubble', name: 'Bubble Sort' },
                    { id: 'merge', name: 'Merge Sort' },
                    { id: 'quick', name: 'Quick Sort' }
                  ].map(algo => (
                    <label key={algo.id} className="flex items-center gap-3 text-sm text-gray-300 hover:text-white cursor-pointer select-none transition-colors group">
                      <input 
                        type="checkbox" 
                        checked={algorithms.includes(algo.id)}
                        onChange={(e) => {
                          if (e.target.checked) setAlgorithms([...algorithms, algo.id]);
                          else setAlgorithms(algorithms.filter(a => a !== algo.id));
                        }}
                        className="w-4 h-4 rounded border-cyber-border text-cyber-accent bg-[#0a0a0f] focus:ring-cyber-accent focus:ring-offset-cyber-card transition-all"
                      />
                      <span className="group-hover:translate-x-1 transition-transform">{algo.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-bold text-gray-500">Case Type</label>
                <select 
                  value={caseType} 
                  onChange={(e) => setCaseType(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-cyber-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyber-accent transition-colors"
                >
                  <option value="best">Best Case</option>
                  <option value="average">Average Case</option>
                  <option value="worst">Worst Case</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-bold text-gray-500">Input Sizes (CSV)</label>
                <input 
                  type="text" 
                  value={sizesInput}
                  onChange={(e) => setSizesInput(e.target.value)}
                  placeholder="100, 500, 1000..."
                  className="w-full bg-[#0a0a0f] border border-cyber-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyber-accent transition-colors"
                />
              </div>

              <div className="pt-2 relative">
                <motion.button 
                  whileHover={!loading && algorithms.length > 0 ? { scale: 1.02, boxShadow: '0 0 20px rgba(0,255,157,0.3)' } : {}}
                  whileTap={!loading && algorithms.length > 0 ? { scale: 0.98 } : {}}
                  onClick={runTest}
                  disabled={loading || algorithms.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyber-accent to-[#00cc7d] hover:to-cyber-accent text-black font-bold py-3.5 px-4 rounded-lg transition-all disabled:opacity-50 disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-400 relative overflow-hidden"
                >
                  {loading && (
                    <div className="absolute left-0 bottom-0 h-1 bg-white/40 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                  )}
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Play className="w-5 h-5 fill-current" />
                  )}
                  {loading ? `Processing... ${Math.round(progress)}%` : 'Run Analysis'}
                </motion.button>
              </div>
            </div>

            {/* AI Insights & AI Estimator Stack */}
            <AnimatePresence>
              {Object.keys(explanations).map((algo, idx) => (
                <motion.div 
                  key={algo} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="bg-cyber-card border border-[#27273a] rounded-xl p-6 space-y-4 shadow-lg hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between border-b border-[#27273a] pb-3">
                    <div className="flex items-center gap-2">
                        <BrainCircuit className="w-5 h-5 text-purple-400" />
                        <h2 className="text-lg font-bold text-white uppercase tracking-wider">{algo.replace('_', ' ')}</h2>
                    </div>
                    
                    {/* Big O Estimator Badge */}
                    {estimations[algo] && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full" title={estimations[algo].ratio_analysis}>
                            <span className="text-xs text-purple-400 font-semibold">{estimations[algo].guess}</span>
                            <span className="text-[10px] text-gray-400">({estimations[algo].confidence})</span>
                        </div>
                    )}
                  </div>
                  
                  <div className="space-y-4 text-sm">
                    <div>
                      <span className="text-purple-400/80 text-xs font-bold uppercase tracking-wider block mb-1">Time Complexity</span>
                      <p className="text-gray-300 leading-relaxed">{explanations[algo].time_complexity}</p>
                    </div>
                    <div>
                      <span className="text-purple-400/80 text-xs font-bold uppercase tracking-wider block mb-1">Behavior</span>
                      <p className="text-gray-300 leading-relaxed">{explanations[algo].best_worst}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-3 bg-cyber-card border border-cyber-border rounded-xl p-6 shadow-xl relative"
          >
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Live Performance Graph</h2>
                {algorithms.length === 1 && (
                    <span className="text-xs font-medium px-3 py-1 bg-cyber-dark border border-cyber-border rounded-full text-gray-400">
                        Overlaying Theoretical Bounds
                    </span>
                )}
            </div>
            
            <div className="w-full h-[600px] bg-[#0a0a0f]/50 rounded-lg p-4 border border-cyber-border/50">
              <Line ref={chartRef} data={generateChartData()} options={chartOptions} />
            </div>
            
            {algorithms.length > 1 && (
                <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                    <p className="text-center text-sm text-blue-400">
                        * Theoretical $O(N)$ bounds are hidden during multi-algorithm comparison to prevent graph clutter. Select a single algorithm to view them.
                    </p>
                </div>
            )}
          </motion.div>
          
        </div>
      </div>
    </div>
  );
}
