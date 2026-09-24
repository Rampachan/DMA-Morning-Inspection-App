import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  X,
  MapPin,
  Clock,
  User,
  Building2,
  Image as ImageIcon,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import GeoFlagIcon from './GeoFlagIcon';
import type { Ulb, Category } from '../types';

// Fix Leaflet icons
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const blueIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface SubmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ulb: Ulb | null;
  submissions: any[];
  allCategories?: Category[];
  initialCategoryId?: string | null;
}

export default function SubmissionDetailModal({
  isOpen,
  onClose,
  ulb,
  submissions,
  allCategories = [],
  initialCategoryId,
}: SubmissionDetailModalProps) {
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  useEffect(() => {
    if (initialCategoryId) {
      setSelectedCatId(initialCategoryId);
    } else if (submissions.length > 0) {
      const firstSubCatId =
        submissions[0]?.category?.id ||
        submissions[0]?.category?.category_id ||
        submissions[0]?.category_id;
      setSelectedCatId(firstSubCatId);
    } else if (allCategories.length > 0) {
      setSelectedCatId(allCategories[0].id || (allCategories[0] as any).category_id);
    }
  }, [initialCategoryId, submissions, allCategories, isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxImg) setLightboxImg(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxImg, onClose]);

  if (!isOpen || !ulb) return null;

  const activeSubmission = submissions.find((s) => {
    const cId = s?.category?.id || s?.category?.category_id || s?.category_id;
    return cId === selectedCatId;
  });

  const activeCategory = allCategories.find((c) => {
    const cId = c.id || (c as any).category_id;
    return cId === selectedCatId;
  }) || activeSubmission?.category;

  const photos: any[] = activeSubmission?.photos || [];

  const geoPhotos = photos.filter((p) => p.latitude && p.longitude);
  const mapCenter: [number, number] =
    geoPhotos.length > 0
      ? [Number(geoPhotos[0].latitude), Number(geoPhotos[0].longitude)]
      : [11.1271, 78.6569];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 max-h-[95vh] flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-white/10 text-blue-200 flex-shrink-0">
              <Building2 size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black tracking-tight truncate">{ulb.name}</h2>
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-white/20 text-white flex-shrink-0">
                  {ulb.type}
                </span>
                {ulb.region && (
                  <span className="text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-100 flex-shrink-0">
                    {ulb.region}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-blue-200 mt-0.5 truncate">
                District: <span className="font-semibold text-white">{ulb.district}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 ml-2"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Categories Tab Bar */}
        <div className="flex items-center gap-1.5 px-3 sm:px-6 py-2 sm:py-2.5 bg-gray-50 border-b border-gray-200 overflow-x-auto flex-shrink-0">
          <span className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide mr-1 sm:mr-2 whitespace-nowrap">
            Categories:
          </span>
          {allCategories.map((cat) => {
            const catId = cat.id || (cat as any).category_id;
            const isSelected = catId === selectedCatId;
            const sub = submissions.find(
              (s) => (s?.category?.id || s?.category?.category_id || s?.category_id) === catId,
            );
            const status = sub?.status;

            return (
              <button
                key={catId}
                onClick={() => setSelectedCatId(catId)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>{cat.name}</span>
                {status ? (
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      status === 'on_time' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          {activeSubmission ? (
            <>
              {/* Submission Overview */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {activeCategory?.name || 'Inspection'}
                    </h3>
                    <StatusBadge status={activeSubmission.status} />
                    {activeSubmission.geo_flagged && <GeoFlagIcon />}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-1">
                    <span className="flex items-center gap-1">
                      <User size={14} className="text-gray-400" />
                      Submitted by: <strong className="text-gray-800">{activeSubmission.user?.name || 'Commissioner'}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} className="text-gray-400" />
                      Time: <strong className="text-gray-800">{format(new Date(activeSubmission.submitted_at || activeSubmission.submittedAt), 'hh:mm:ss a')}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <ImageIcon size={14} className="text-gray-400" />
                      Photos: <strong className="text-gray-800">{photos.length} uploaded</strong>
                    </span>
                  </div>
                </div>

                <div className="text-right text-xs text-gray-500">
                  <span>Device Timestamp: </span>
                  <strong className="text-gray-700">
                    {format(new Date(activeSubmission.device_timestamp || activeSubmission.deviceTimestamp), 'dd MMM yyyy, hh:mm a')}
                  </strong>
                </div>
              </div>

              {/* Photos Gallery */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon size={16} className="text-blue-600" />
                    Submitted Photos ({photos.length})
                  </h4>
                  <span className="text-xs text-gray-400">Click any image to enlarge</span>
                </div>

                {photos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                    {photos.map((photo, idx) => {
                      const photoUrl =
                        photo.signed_url ||
                        photo.signedUrl ||
                        `/api/v1/photos/raw?key=${encodeURIComponent(photo.file_key || '')}`;

                      return (
                        <div
                          key={idx}
                          onClick={() => setLightboxImg(photoUrl)}
                          className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                        >
                          <img
                            src={photoUrl}
                            alt={`Photo ${idx + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                            <span className="text-white text-xs font-semibold">
                              Photo #{idx + 1}
                            </span>
                            {photo.latitude && photo.longitude && (
                              <span className="text-white/80 text-[10px]">
                                {Number(photo.latitude).toFixed(4)}, {Number(photo.longitude).toFixed(4)}
                              </span>
                            )}
                          </div>
                          {photo.geo_flagged && (
                            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold">
                              Geo-flagged
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400">No photos attached to this submission.</p>
                  </div>
                )}
              </div>

              {/* GPS Map Location */}
              {geoPhotos.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <MapPin size={16} className="text-blue-600" />
                    Geotagged Location Map
                  </h4>
                  <div className="h-64 sm:h-72 w-full rounded-xl overflow-hidden border border-gray-200 shadow-inner">
                    <MapContainer
                      center={mapCenter}
                      zoom={14}
                      scrollWheelZoom={false}
                      className="w-full h-full"
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {geoPhotos.map((p, i) => (
                        <Marker
                          key={i}
                          position={[Number(p.latitude), Number(p.longitude)]}
                          icon={p.geo_flagged ? redIcon : blueIcon}
                        >
                          <Popup>
                            <div className="text-xs">
                              <p className="font-bold text-gray-900">{activeCategory?.name}</p>
                              <p className="text-gray-600">Photo #{i + 1}</p>
                              <p className="text-[11px] font-mono text-gray-500">
                                {Number(p.latitude).toFixed(6)}, {Number(p.longitude).toFixed(6)}
                              </p>
                              {p.geo_flagged && (
                                <p className="text-red-600 font-bold mt-1">⚠️ Flagged Outside ULB</p>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
                <Clock size={28} />
              </div>
              <h3 className="text-base font-bold text-gray-800">
                No Submission Yet for {activeCategory?.name || 'this category'}
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                The Commissioner has not uploaded photos for this category today. Once uploaded via the mobile app, inspection photos and geo-location will appear here in real time.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 flex-shrink-0">
          <span>Official DMA Compliance Record</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {lightboxImg && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImg(null)}
        >
          <button
            onClick={() => setLightboxImg(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
          >
            <X size={32} />
          </button>
          <img
            src={lightboxImg}
            alt="Full size inspection photo"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
