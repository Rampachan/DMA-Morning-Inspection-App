import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Smartphone,
  Camera,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Building2,
  ArrowLeft,
  X,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import apiClient from '../api/client';
import StatusBadge from '../components/StatusBadge';
import type { Category } from '../types';

interface PhotoItem {
  file: File;
  previewUrl: string;
  latitude: number;
  longitude: number;
  capturedAt: string;
  source: 'camera' | 'gallery';
}

interface CommissionerUser {
  user_id: string;
  name: string;
  role: string;
  ulb_id: string;
  ulb_name?: string;
  username: string;
}

export default function CommissionerApp() {
  const navigate = useNavigate();

  // ── Session State ─────────────────────────────────────────────
  const [commUser, setCommUser] = useState<CommissionerUser | null>(() => {
    const saved = localStorage.getItem('mcrs_commissioner_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [commToken, setCommToken] = useState<string | null>(() => {
    return localStorage.getItem('mcrs_commissioner_token');
  });

  // Login form state
  const [loginUsername, setLoginUsername] = useState('commissioner1');
  const [loginPassword, setLoginPassword] = useState('Comm@123456');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // ── App Tabs & Screen State ───────────────────────────────────
  const [activeTab, setActiveTab] = useState<'inspect' | 'history'>('inspect');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: 9.9252, // Default Madurai coords
    lng: 78.1198,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{
    id: string;
    status: string;
    photoCount: number;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // History state
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // ── Countdown Window Logic (05:00–07:30 IST) ──────────────────
  const [countdownText, setCountdownText] = useState('');
  const [windowPhase, setWindowPhase] = useState<'before' | 'open' | 'closed'>('open');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      // UTC + 5:30 for IST
      const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
      const minutesOfDay = istTime.getUTCHours() * 60 + istTime.getUTCMinutes();
      const secondsOfDay = minutesOfDay * 60 + istTime.getUTCSeconds();

      const openSec = 5 * 3600; // 05:00
      const closeSec = 7 * 3600 + 30 * 60; // 07:30

      if (secondsOfDay < openSec) {
        setWindowPhase('before');
        const diff = openSec - secondsOfDay;
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        setCountdownText(
          `Window opens at 05:00 AM (in ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')})`,
        );
      } else if (secondsOfDay <= closeSec) {
        setWindowPhase('open');
        const diff = closeSec - secondsOfDay;
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        setCountdownText(
          `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
        );
      } else {
        setWindowPhase('closed');
        setCountdownText('Window Closed (Past 07:30 AM)');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Geolocation Retrieval ─────────────────────────────────────
  const refreshLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentCoords({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          });
        },
        () => {
          // fallback keeps default
        },
        { enableHighAccuracy: true, timeout: 5000 },
      );
    }
  };

  useEffect(() => {
    refreshLocation();
  }, []);

  // ── Load Categories when logged in ────────────────────────────
  useEffect(() => {
    if (commToken) {
      apiClient
        .get<Category[]>('/inspection-categories?activeOnly=true', {
          headers: { Authorization: `Bearer ${commToken}` },
        })
        .then((res) => {
          setCategories(res.data);
          if (res.data.length > 0 && !selectedCategoryId) {
            setSelectedCategoryId(res.data[0].id || (res.data[0] as any).category_id);
          }
        })
        .catch(() => {});
    }
  }, [commToken]);

  // ── Load Commissioner Submissions ─────────────────────────────
  const loadMySubmissions = async () => {
    if (!commToken) return;
    setLoadingHistory(true);
    try {
      const res = await apiClient.get('/submissions/my', {
        headers: { Authorization: `Bearer ${commToken}` },
      });
      setMySubmissions(res.data);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadMySubmissions();
    }
  }, [activeTab]);

  // ── Handle Login ──────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await apiClient.post('/auth/login', {
        username: loginUsername,
        password: loginPassword,
      });
      const { access_token, user } = res.data;
      setCommToken(access_token);
      setCommUser(user);
      localStorage.setItem('mcrs_commissioner_token', access_token);
      localStorage.setItem('mcrs_commissioner_session', JSON.stringify(user));
    } catch (err: any) {
      setLoginError(
        err.response?.data?.message || 'Login failed. Please check username & password.',
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setCommToken(null);
    setCommUser(null);
    localStorage.removeItem('mcrs_commissioner_token');
    localStorage.removeItem('mcrs_commissioner_session');
  };

  // Helper to convert/compress photos to JPEG
  const convertToJpeg = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      // If already a small JPEG, keep as is
      if (file.type === 'image/jpeg' && file.size < 1.2 * 1024 * 1024) {
        resolve(file);
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const MAX_DIM = 1600;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
                resolve(new File([blob], cleanName, { type: 'image/jpeg' }));
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.82,
          );
        } else {
          resolve(file);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  };

  // ── Handle Photo Selection ────────────────────────────────────
  const handleFilesAdded = async (files: FileList | null, source: 'camera' | 'gallery') => {
    if (!files || files.length === 0) return;

    const newItems: PhotoItem[] = [];
    for (let i = 0; i < files.length; i++) {
      if (photos.length + newItems.length >= 10) break;
      const originalFile = files[i];
      if (
        !originalFile.type.startsWith('image/') &&
        !originalFile.name.match(/\.(jpg|jpeg|png|heic|heif|webp)$/i)
      ) {
        continue;
      }

      const file = await convertToJpeg(originalFile);

      newItems.push({
        file,
        previewUrl: URL.createObjectURL(file),
        latitude: currentCoords.lat,
        longitude: currentCoords.lng,
        capturedAt: new Date().toISOString(),
        source,
      });
    }

    setPhotos((prev) => [...prev, ...newItems]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  // ── Handle Submit ─────────────────────────────────────────────
  const handleSubmitInspection = async () => {
    if (!selectedCategoryId) {
      setSubmitError('Please select an inspection category.');
      return;
    }
    if (photos.length === 0) {
      setSubmitError('Please attach at least one inspection photo.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const metadata = {
        category_id: selectedCategoryId,
        device_timestamp: new Date().toISOString(),
        photos_meta: photos.map((p) => ({
          latitude: Number(p.latitude) || 0,
          longitude: Number(p.longitude) || 0,
          captured_at: p.capturedAt || new Date().toISOString(),
        })),
      };

      const formData = new FormData();
      formData.append('data', JSON.stringify(metadata));
      photos.forEach((p) => {
        formData.append('photos', p.file, p.file.name);
      });

      // NOTE: Do NOT set 'Content-Type': 'multipart/form-data' here!
      // Axios and the browser automatically compute the multipart boundary header.
      const res = await apiClient.post('/submissions', formData, {
        headers: {
          Authorization: `Bearer ${commToken}`,
        },
      });

      setSubmitSuccess({
        id: res.data.submission?.submission_id,
        status: res.data.submission?.status,
        photoCount: res.data.photoCount,
      });

      // Clear photos
      setPhotos([]);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message.join(', ')
          : null) ||
        err.message ||
        'Submission failed. Please try again.';
      setSubmitError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 sm:bg-slate-900 flex flex-col items-center justify-center sm:p-6 font-sans">
      {/* Top Bar Navigation - hidden on phones to feel like a native app */}
      <div className="hidden sm:flex w-full max-w-md items-center justify-between mb-3 text-white">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
        <span className="text-xs font-mono text-slate-400">
          Commissioner Mobile Mode
        </span>
      </div>

      {/* ─── Phone Container: Full-screen on real phones, phone frame on desktop ─── */}
      <div className="w-full flex-1 sm:flex-initial sm:max-w-md bg-white sm:rounded-[2.5rem] sm:shadow-2xl overflow-hidden sm:border-[8px] sm:border-slate-800 flex flex-col sm:min-h-[750px] relative">
        {/* Speaker / Camera Notch - only visible in desktop simulator view */}
        <div className="hidden sm:flex h-6 bg-slate-800 w-full items-center justify-center relative">
          <div className="w-24 h-3.5 bg-slate-900 rounded-b-xl flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
            <span className="w-8 h-1 rounded-full bg-slate-700" />
          </div>
        </div>

        {/* ─── SCREEN CONTENT ─── */}
        <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
          {/* Header */}
          <header className="bg-blue-700 text-white px-5 py-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight">MCRS Mobile</h1>
                <p className="text-[11px] text-blue-100 leading-tight">
                  {commUser ? commUser.name : 'Commissioner Portal'}
                </p>
              </div>
            </div>

            {commUser && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-blue-100 transition-colors"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            )}
          </header>

          {/* ─── VIEW 1: LOGIN FORM ─── */}
          {!commUser ? (
            <div className="p-6 flex-1 flex flex-col justify-center">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Smartphone size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Commissioner Login</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Morning Inspection Compliance Reporting
                </p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {loginLoading ? 'Signing in…' : 'Sign In as Commissioner'}
                </button>
              </form>

              {/* Quick Login Presets for testing */}
              <div className="mt-6 pt-5 border-t border-gray-200">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2 text-center">
                  Quick Commissioner Accounts:
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginUsername('commissioner1');
                      setLoginPassword('Comm@123456');
                    }}
                    className="p-2 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 font-medium text-left truncate"
                  >
                    Madurai Corp
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginUsername('corp_salem');
                      setLoginPassword('Comm@123456');
                    }}
                    className="p-2 rounded-lg bg-indigo-50 text-indigo-800 hover:bg-indigo-100 font-medium text-left truncate"
                  >
                    Salem Corp
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginUsername('corp_coimbatore');
                      setLoginPassword('Comm@123456');
                    }}
                    className="p-2 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-medium text-left truncate"
                  >
                    Coimbatore Corp
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginUsername('corp_chengalpattu');
                      setLoginPassword('Comm@123456');
                    }}
                    className="p-2 rounded-lg bg-sky-50 text-sky-800 hover:bg-sky-100 font-medium text-left truncate"
                  >
                    Tambaram Corp
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ─── VIEW 2: AUTHENTICATED COMMISSIONER INSPECTION INTERFACE ─── */
            <div className="flex-1 flex flex-col justify-between">
              <div className="p-4 space-y-4">
                {/* 1. Countdown Banner */}
                {windowPhase === 'before' && (
                  <div className="bg-slate-100 border border-slate-200 text-slate-700 p-3 rounded-xl text-center text-xs font-medium">
                    {countdownText}
                  </div>
                )}
                {windowPhase === 'open' && (
                  <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-xl flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                        Inspection Window Open
                      </span>
                      <span className="text-xs text-emerald-800 font-medium">
                        Submit before 07:30 AM
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-base font-extrabold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                      <Clock size={16} />
                      <span>{countdownText}</span>
                    </div>
                  </div>
                )}
                {windowPhase === 'closed' && (
                  <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-xl flex items-center gap-2 shadow-sm text-xs font-bold">
                    <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
                    <span>⚠️ 07:30 AM Passed: Inspection will be marked LATE</span>
                  </div>
                )}

                {/* Sub-tabs (New Inspection vs My History) */}
                <div className="flex rounded-xl bg-gray-200 p-1 text-xs font-bold">
                  <button
                    onClick={() => setActiveTab('inspect')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      activeTab === 'inspect'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    New Inspection
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      activeTab === 'history'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    My Submissions
                  </button>
                </div>

                {/* ─── TAB A: NEW INSPECTION ─── */}
                {activeTab === 'inspect' && (
                  <div className="space-y-4">
                    {/* Success Banner */}
                    {submitSuccess && (
                      <div className="bg-emerald-50 border-2 border-emerald-400 p-4 rounded-xl text-emerald-900 space-y-1">
                        <div className="flex items-center gap-2 font-bold text-sm">
                          <CheckCircle2 size={18} className="text-emerald-600" />
                          <span>Inspection Submitted Successfully!</span>
                        </div>
                        <p className="text-xs text-emerald-800">
                          Status:{' '}
                          <strong className="uppercase">
                            {submitSuccess.status}
                          </strong>{' '}
                          · {submitSuccess.photoCount} photos uploaded
                        </p>
                        <p className="text-[11px] text-emerald-700 pt-1 font-mono">
                          View updated live status on Dashboard!
                        </p>
                      </div>
                    )}

                    {submitError && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-red-700 text-xs flex items-center gap-2">
                        <AlertTriangle size={14} />
                        <span>{submitError}</span>
                      </div>
                    )}

                    {/* Category Selector */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Inspection Category *
                      </label>
                      <select
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      >
                        {categories.map((c) => {
                          const id = c.id || (c as any).category_id;
                          return (
                            <option key={id} value={id}>
                              {c.name}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* GPS Coordinates Bar */}
                    <div className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <MapPin size={14} className="text-red-500" />
                        <span>
                          Lat: <strong>{currentCoords.lat}</strong>, Lng:{' '}
                          <strong>{currentCoords.lng}</strong>
                        </span>
                      </div>
                      <button
                        onClick={refreshLocation}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-[10px]"
                      >
                        Refresh GPS
                      </button>
                    </div>

                    {/* Photos Grid */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-gray-700 uppercase">
                          Photos ({photos.length} / 10)
                        </label>
                        <span className="text-[10px] text-gray-400">
                          Min 1 required
                        </span>
                      </div>

                      {/* Hidden file inputs */}
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handleFilesAdded(e.target.files, 'camera')}
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFilesAdded(e.target.files, 'gallery')}
                      />

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          disabled={photos.length >= 10}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs border border-blue-200 transition-colors disabled:opacity-50"
                        >
                          <Camera size={16} /> Take Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={photos.length >= 10}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 transition-colors disabled:opacity-50"
                        >
                          <Upload size={16} /> From Files
                        </button>
                      </div>

                      {/* Thumbnail grid */}
                      <div className="grid grid-cols-3 gap-2">
                        {photos.map((p, idx) => (
                          <div
                            key={idx}
                            className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group bg-gray-100"
                          >
                            <img
                              src={p.previewUrl}
                              alt="preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => removePhoto(idx)}
                              className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors"
                            >
                              <X size={10} />
                            </button>
                            <span className="absolute bottom-1 left-1 px-1 rounded bg-black/50 text-white text-[8px]">
                              {p.source}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB B: MY SUBMISSIONS HISTORY ─── */}
                {activeTab === 'history' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-bold text-gray-700 uppercase">
                        Today&apos;s Submitted Inspections
                      </span>
                      <button
                        onClick={loadMySubmissions}
                        className="text-[11px] text-blue-600 font-semibold"
                      >
                        Refresh
                      </button>
                    </div>

                    {loadingHistory ? (
                      <p className="text-center py-6 text-xs text-gray-400">
                        Loading submissions…
                      </p>
                    ) : mySubmissions.length === 0 ? (
                      <div className="text-center py-8 bg-white rounded-xl border border-gray-200 text-xs text-gray-400">
                        No submissions recorded for today yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {mySubmissions.map((sub: any) => (
                          <div
                            key={sub.submission_id || sub.id}
                            className="p-3 bg-white rounded-xl border border-gray-200 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-gray-900">
                                {sub.category?.name || 'Inspection Category'}
                              </span>
                              <StatusBadge status={sub.status} small />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-gray-500">
                              <span>
                                {sub.submitted_at
                                  ? new Date(sub.submitted_at).toLocaleTimeString()
                                  : '—'}
                              </span>
                              <span>{sub.photos?.length || 1} photo(s)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Footer (Only on Inspect Tab) */}
              {activeTab === 'inspect' && (
                <div className="p-4 bg-white border-t border-gray-200">
                  <button
                    onClick={handleSubmitInspection}
                    disabled={submitting || photos.length === 0}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Uploading Inspection…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        Submit Inspection Now
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Phone Bottom Home Bar */}
        <div className="h-6 bg-slate-800 w-full flex items-center justify-center">
          <div className="w-32 h-1 bg-slate-600 rounded-full" />
        </div>
      </div>
    </div>
  );
}
