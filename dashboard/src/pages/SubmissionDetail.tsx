import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, AlertTriangle, X } from 'lucide-react';
import { getSubmission } from '../api/submissions';
import GeoFlagIcon from '../components/GeoFlagIcon';
import StatusBadge from '../components/StatusBadge';
import Layout from '../components/Layout';
import type { Photo } from '../types';

// ── Fix Leaflet default icon paths (broken in Vite builds) ──
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
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ── Lightbox ──────────────────────────────────────────────────
interface LightboxProps {
  photo: Photo;
  index: number;
  onClose: () => void;
}
function Lightbox({ photo, index, onClose }: LightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white hover:text-gray-300"
        onClick={onClose}
        aria-label="Close lightbox"
      >
        <X size={28} />
      </button>
      <img
        src={photo.signedUrl || (photo as any).signed_url || `/api/v1/photos/raw?key=${encodeURIComponent((photo as any).file_key)}`}
        alt={`Photo ${index + 1}`}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm">
        Photo {index + 1}
        {photo.latitude && photo.longitude
          ? ` · ${photo.latitude.toFixed(5)}, ${photo.longitude.toFixed(5)}`
          : ''}
        {photo.geoFlagged && ' · ⚠️ Geo-flagged'}
      </p>
    </div>
  );
}

// ── MetaRow ───────────────────────────────────────────────────
function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
      <dt className="text-sm font-medium text-gray-500 sm:w-40 flex-shrink-0">
        {label}
      </dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    photo: Photo;
    index: number;
  } | null>(null);

  const { data: submission, isLoading, isError } = useQuery({
    queryKey: ['submission', id],
    queryFn: () => getSubmission(id!),
    enabled: Boolean(id),
  });

  // Compute map center from photos with coordinates
  const geoPhotos = submission?.photos.filter(
    (p) => p.latitude !== null && p.longitude !== null,
  ) ?? [];

  const mapCenter: [number, number] = geoPhotos.length > 0
    ? [
        geoPhotos.reduce((acc, p) => acc + p.latitude!, 0) / geoPhotos.length,
        geoPhotos.reduce((acc, p) => acc + p.longitude!, 0) / geoPhotos.length,
      ]
    : [20.5937, 78.9629]; // Default: India centre

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-48 bg-gray-200 rounded" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (isError || !submission) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
          <AlertTriangle size={40} className="text-red-400" />
          <p className="text-lg font-medium">Submission not found</p>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-blue-600 underline"
          >
            Go back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl space-y-6">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Status Board
        </button>

        {/* Geo-flag warning banner */}
        {submission.geoFlagged && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-300 text-red-700 rounded-xl px-5 py-4">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Geo-location Flagged</p>
              <p className="text-xs mt-0.5">
                One or more photos were taken outside the expected ULB boundary.
              </p>
            </div>
          </div>
        )}

        {/* Metadata card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {submission.ulb.name}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {submission.ulb.district} ·{' '}
                <span className="capitalize">
                  {submission.ulb.type.replace(/_/g, ' ')}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {submission.geoFlagged && <GeoFlagIcon />}
              <StatusBadge status={submission.status} />
            </div>
          </div>

          <dl className="space-y-3 divide-y divide-gray-50">
            <MetaRow label="Category" value={submission.category.name} />
            <MetaRow
              label="Submitted by"
              value={submission.submittedBy.name}
            />
            <MetaRow
              label="Submitted at"
              value={format(new Date(submission.submittedAt), 'dd MMM yyyy, HH:mm:ss')}
            />
            <MetaRow
              label="Device timestamp"
              value={format(
                new Date(submission.deviceTimestamp),
                'dd MMM yyyy, HH:mm:ss',
              )}
            />
            <MetaRow label="Status" value={<StatusBadge status={submission.status} />} />
            <MetaRow label="Photos" value={`${submission.photos.length} photo(s)`} />
          </dl>
        </div>

        {/* Photo gallery */}
        {submission.photos.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Photos
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {submission.photos.map((photo, i) => (
                <button
                  key={photo.id}
                  onClick={() => setLightboxPhoto({ photo, index: i })}
                  className={`relative group rounded-xl overflow-hidden border-2 transition-all ${
                    photo.geoFlagged
                      ? 'border-red-400'
                      : 'border-transparent hover:border-blue-400'
                  }`}
                  aria-label={`View photo ${i + 1}`}
                >
                  <img
                    src={photo.signedUrl || (photo as any).signed_url || `/api/v1/photos/raw?key=${encodeURIComponent((photo as any).file_key)}`}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-36 object-cover group-hover:opacity-90 transition-opacity"
                    loading="lazy"
                  />
                  {photo.geoFlagged && (
                    <div className="absolute top-1.5 right-1.5">
                      <GeoFlagIcon />
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                    <p className="text-white text-xs">
                      {format(new Date(photo.capturedAt), 'HH:mm:ss')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Map */}
        {geoPhotos.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Photo Locations
            </h2>
            <div className="rounded-xl overflow-hidden h-80">
              <MapContainer
                center={mapCenter}
                zoom={14}
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {geoPhotos.map((photo, i) => (
                  <Marker
                    key={photo.id}
                    position={[photo.latitude!, photo.longitude!]}
                    icon={photo.geoFlagged ? redIcon : blueIcon}
                  >
                    <Popup>
                      <div className="text-xs">
                        <p className="font-semibold">Photo #{i + 1}</p>
                        <p>
                          {photo.latitude!.toFixed(6)},{' '}
                          {photo.longitude!.toFixed(6)}
                        </p>
                        {photo.geoFlagged && (
                          <p className="text-red-600 font-medium mt-1">
                            ⚠️ Geo-flagged
                          </p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Blue markers = valid location · Red markers = geo-flagged
            </p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <Lightbox
          photo={lightboxPhoto.photo}
          index={lightboxPhoto.index}
          onClose={() => setLightboxPhoto(null)}
        />
      )}
    </Layout>
  );
}
