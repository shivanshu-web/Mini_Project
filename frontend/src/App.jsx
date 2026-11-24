import { useEffect, useState } from "react";
import axios from "axios";
import {
  Laptop,
  Cpu,
  HardDrive,
  Monitor,
  Sparkles,
  History,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function App() {
  const [metadata, setMetadata] = useState(null);
  const [formData, setFormData] = useState({
    company: "Dell",
    type_name: "Notebook",
    ram: 8,
    gpu: "Intel",
    op_sys: "Windows",
    cpu_brand: "Intel Core i5",
    ssd: 512,
    screen_size: 15.6,
    resolution: "1920x1080",
  });

  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState("");
  const [systemStatus, setSystemStatus] = useState("checking");

  // Load model categories, health status, and history on mount
  useEffect(() => {
    async function initializeApp() {
      try {
        const [healthRes, metaRes, histRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/health`),
          axios.get(`${API_BASE_URL}/metadata`),
          axios.get(`${API_BASE_URL}/history`),
        ]);

        setSystemStatus(healthRes.data.status === "ok" ? "online" : "degraded");
        setMetadata(metaRes.data);
        setHistory(histRes.data || []);

        // Ensure default selections exist in learned model categories
        const cats = metaRes.data.categories;
        setFormData((prev) => ({
          ...prev,
          company: cats.Company.includes(prev.company)
            ? prev.company
            : cats.Company[0],
          type_name: cats.TypeName.includes(prev.type_name)
            ? prev.type_name
            : cats.TypeName[0],
          gpu: cats.Gpu.includes(prev.gpu) ? prev.gpu : cats.Gpu[0],
          op_sys: cats.OpSys.includes(prev.op_sys)
            ? prev.op_sys
            : cats.OpSys[0],
          cpu_brand: cats.Cpu_brand.includes(prev.cpu_brand)
            ? prev.cpu_brand
            : cats.Cpu_brand[0],
        }));
      } catch (err) {
        console.error(err);
        setSystemStatus("offline");
        setError(
          "Could not connect to the backend/ML service. Ensure both FastAPI (port 8000) and Express (port 5000) are running."
        );
      } finally {
        setLoadingMeta(false);
      }
    }

    initializeApp();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "ram" || name === "ssd" || name === "screen_size"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setPredicting(true);

    try {
      const { data } = await axios.post(`${API_BASE_URL}/predict`, formData);
      setResult(data);
      setHistory((prev) => [data, ...prev.slice(0, 9)]);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Prediction failed. Please verify your inputs and try again."
      );
    } finally {
      setPredicting(false);
    }
  };

  // Live client-side PPI preview
  const [w, h] = formData.resolution.split("x").map(Number);
  const livePpi =
    w && h && formData.screen_size > 0
      ? Math.round((Math.hypot(w, h) / formData.screen_size) * 100) / 100
      : 0;
  const is4k = w >= 3840 || h >= 2160;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <Laptop className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                SpecPrice AI
              </h1>
              <p className="text-xs text-slate-400">
                XGBoost Laptop Valuation Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                systemStatus === "online"
                  ? "bg-emerald-400"
                  : systemStatus === "checking"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-rose-500"
              }`}
            />
            <span className="text-slate-300">
              {systemStatus === "online"
                ? "ML Pipeline Ready"
                : systemStatus === "checking"
                ? "Connecting..."
                : "Service Offline"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: Configuration Form */}
          <div className="lg:col-span-7">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">
                  Configure Laptop Specifications
                </h2>
                <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                  9 Model Features
                </span>
              </div>

              {loadingMeta ? (
                <div className="flex h-64 items-center justify-center text-slate-400">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-400" />
                  Loading model categories...
                </div>
              ) : (
                metadata && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    {/* Brand */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">
                        Brand (Company)
                      </label>
                      <select
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      >
                        {metadata.categories.Company.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Laptop Type */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">
                        Form Factor (TypeName)
                      </label>
                      <select
                        name="type_name"
                        value={formData.type_name}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      >
                        {metadata.categories.TypeName.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* CPU Brand */}
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                        <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                        Processor (CPU)
                      </label>
                      <select
                        name="cpu_brand"
                        value={formData.cpu_brand}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      >
                        {metadata.categories.Cpu_brand.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* GPU */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">
                        Graphics (GPU)
                      </label>
                      <select
                        name="gpu"
                        value={formData.gpu}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      >
                        {metadata.categories.Gpu.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* RAM */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">
                        Memory (RAM)
                      </label>
                      <select
                        name="ram"
                        value={formData.ram}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      >
                        {metadata.numeric_options.ram.map((gb) => (
                          <option key={gb} value={gb}>
                            {gb} GB
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* SSD */}
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                        <HardDrive className="h-3.5 w-3.5 text-indigo-400" />
                        SSD Storage
                      </label>
                      <select
                        name="ssd"
                        value={formData.ssd}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      >
                        {metadata.numeric_options.ssd.map((gb) => (
                          <option key={gb} value={gb}>
                            {gb === 0
                              ? "0 GB (HDD Only)"
                              : gb >= 1024
                              ? `${gb / 1024} TB (${gb} GB)`
                              : `${gb} GB`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Screen Size */}
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                        <Monitor className="h-3.5 w-3.5 text-indigo-400" />
                        Screen Size (Inches)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="10.0"
                        max="20.0"
                        name="screen_size"
                        value={formData.screen_size}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* Resolution */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">
                        Display Resolution
                      </label>
                      <select
                        name="resolution"
                        value={formData.resolution}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      >
                        {metadata.numeric_options.resolutions.map((res) => (
                          <option key={res} value={res}>
                            {res}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Operating System */}
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">
                        Operating System
                      </label>
                      <select
                        name="op_sys"
                        value={formData.op_sys}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      >
                        {metadata.categories.OpSys.map((os) => (
                          <option key={os} value={os}>
                            {os}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              )}

              {/* Live Engineered Features Preview */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-slate-400">
                <span>Derived Display Features:</span>
                <div className="flex items-center gap-3">
                  <span className="rounded bg-indigo-500/15 px-2 py-0.5 font-mono text-indigo-300">
                    PPI: {livePpi}
                  </span>
                  <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-emerald-300">
                    4K Panel: {is4k ? "Yes (1)" : "No (0)"}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={predicting || loadingMeta || systemStatus === "offline"}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {predicting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running XGBoost Inference...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Predict Laptop Price
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Valuation Card & Recent History */}
          <div className="space-y-6 lg:col-span-5">
            {/* Result Card */}
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-6 shadow-xl">
              <p className="text-xs font-medium uppercase tracking-wider text-indigo-400">
                Estimated Market Valuation
              </p>

              {result ? (
                <div className="mt-4">
                  <div className="text-4xl font-extrabold tracking-tight text-white">
                    {result.prediction.formatted_price_inr}
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Predicted via Scikit-Learn + XGBRegressor Pipeline
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-800 pt-4 text-xs">
                    <div>
                      <span className="text-slate-400">Configuration</span>
                      <p className="mt-0.5 font-medium text-slate-200">
                        {result.specs.company} {result.specs.type_name}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Core Hardware</span>
                      <p className="mt-0.5 font-medium text-slate-200">
                        {result.specs.cpu_brand} • {result.specs.ram}GB
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Storage & GPU</span>
                      <p className="mt-0.5 font-medium text-slate-200">
                        {result.specs.ssd}GB SSD • {result.specs.gpu}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Display Density</span>
                      <p className="mt-0.5 font-medium text-slate-200">
                        {result.specs.screen_size}" ({result.prediction.computed_features.PPI} PPI)
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 py-8 text-center">
                  <p className="text-sm text-slate-400">
                    Select your desired hardware specifications and click{" "}
                    <span className="font-medium text-slate-200">
                      Predict Laptop Price
                    </span>{" "}
                    to generate an INR estimate.
                  </p>
                </div>
              )}
            </div>

            {/* Recent Comparisons */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="mb-4 flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">
                  Recent Predictions
                </h3>
              </div>

              {history.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No predictions yet in this session.
                </p>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/50 px-3.5 py-2.5 text-xs"
                    >
                      <div>
                        <p className="font-medium text-slate-200">
                          {item.specs.company} {item.specs.type_name}
                        </p>
                        <p className="text-slate-400">
                          {item.specs.cpu_brand} • {item.specs.ram}GB •{" "}
                          {item.specs.ssd}GB SSD
                        </p>
                      </div>
                      <span className="font-semibold text-indigo-300">
                        {item.prediction.formatted_price_inr}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}