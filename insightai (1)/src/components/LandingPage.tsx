import { motion } from "motion/react";
import { 
  Shield, 
  Sparkles, 
  TrendingUp, 
  Layers, 
  FileSpreadsheet, 
  PieChart as PieChartIcon, 
  ArrowRight,
  Database
} from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const features = [
    {
      icon: <Database className="w-5 h-5 text-blue-500" />,
      title: "FAST LOCAL PROFILING",
      description: "Quick, secure parsing of CSV & Excel files entirely in your browser. No files are uploaded to external databases."
    },
    {
      icon: <Layers className="w-5 h-5 text-blue-500" />,
      title: "DATA QUALITY AUDITS",
      description: "Instant identification of duplicate rows, columns filled with missing numbers, and inconsistent data types."
    },
    {
      icon: <PieChartIcon className="w-5 h-5 text-blue-500" />,
      title: "INTERACTIVE CHARTS",
      description: "Generate highly polished bar graphs, responsive area charts, scatter distributions, and custom histograms on-the-fly."
    },
    {
      icon: <Sparkles className="w-5 h-5 text-blue-500" />,
      title: "ELITE AI ANALYTICS",
      description: "An integrated server-side Gemini intelligence engine that transforms raw rows into dynamic executive summaries."
    }
  ];

  return (
    <div className="relative min-h-[90vh] flex flex-col items-center justify-center bg-[#0A0A0B] text-[#EDEDED] px-6 overflow-hidden">
      
      {/* Background ambient glowing decorative layers */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl w-full text-center relative z-10 flex flex-col items-center"
      >
        <motion.div 
          variants={itemVariants}
          className="inline-flex items-center gap-2 px-4 py-1 rounded bg-white/5 border border-white/15 text-xs font-mono text-blue-400 mb-8 tracking-widest uppercase"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-blue-500" />
          Powered by Gemini 3.5 AI
        </motion.div>

        <motion.h1 
          variants={itemVariants}
          className="text-5xl md:text-8xl font-black tracking-tightest uppercase leading-none text-white mb-6"
        >
          Automated Data <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-blue-400 to-white">
            Insights AI
          </span>
        </motion.h1>

        <motion.p 
          variants={itemVariants}
          className="text-base md:text-lg text-white/50 max-w-2xl mb-12 leading-relaxed uppercase tracking-widest font-sans"
        >
          Upload any CSV, TSV, or Excel spreadsheet and gain clear visual analytics,
          detailed structure profiling, and full-spectrum data executive audits in seconds.
        </motion.p>

        <motion.div variants={itemVariants} className="mb-20">
          <button
            onPointerDown={onStart}
            onClick={onStart}
            id="cta-start-btn"
            className="group relative inline-flex items-center gap-3 bg-white text-black font-black uppercase text-xs tracking-wider px-8 py-4 rounded transition-all duration-300 shadow-xl hover:bg-blue-500 hover:text-white hover:-translate-y-0.5 cursor-pointer"
          >
            Launch InsightAI Dashboard
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>

        {/* Feature Grid */}
        <motion.div 
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full text-left"
        >
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -4, borderColor: "rgba(255, 255, 255, 0.25)" }}
              className="p-6 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/5 transition-all duration-300 shadow-xl"
            >
              <div className="p-2.5 bg-blue-600/10 rounded w-fit mb-4 border border-blue-500/20">
                {feature.icon}
              </div>
              <h3 className="text-xs font-black text-white mb-2 tracking-widest font-sans">
                {feature.title}
              </h3>
              <p className="text-xs text-white/40 leading-relaxed font-sans">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
