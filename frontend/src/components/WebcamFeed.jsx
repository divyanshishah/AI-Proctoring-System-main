import { useRef, useEffect, useState } from 'react'
import { Camera, CameraOff, CheckCircle, AlertTriangle, Users } from 'lucide-react'

/** Webcam feed component with AI detection overlay */
export default function WebcamFeed({ detectionResult, isActive = false }) {
  const videoRef  = useRef(null)
  const [ready, setReady] = useState(false)

  // Expose video element globally for proctoring service to draw frames from
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.setAttribute('data-proctor', 'true')
    }
  }, [])

  const face      = detectionResult?.face
  const faceCount = face?.face_count ?? 0
  const faces     = face?.faces ?? []

  // Status indicator
  const statusColor = !isActive     ? 'text-slate-500'
    : faceCount === 0               ? 'text-red-400'
    : faceCount === 1               ? 'text-green-400'
    : 'text-orange-400'

  const statusText  = !isActive     ? 'Camera off'
    : faceCount === 0               ? 'No face detected'
    : faceCount === 1               ? 'Face detected ✓'
    : `Multiple faces (${faceCount})`

  const StatusIcon = faceCount === 1 ? CheckCircle : faceCount === 0 ? CameraOff : Users

  return (
    <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-700"
         style={{ aspectRatio: '4/3' }}>

      {/* Video element */}
      <video ref={videoRef} data-proctor
        autoPlay muted playsInline
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}   /* Mirror for selfie-mode */
        onLoadedData={() => setReady(true)}
      />

      {/* Offline overlay */}
      {!isActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90">
          <Camera className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-500 text-sm">Camera inactive</p>
        </div>
      )}

      {/* Face bounding boxes overlay */}
      {isActive && faces.map((f, i) => (
        <div key={i} className="face-box"
          style={{
            left:   `${(1 - (f.x + f.w) / 640) * 100}%`,  /* Mirrored X */
            top:    `${(f.y / 480) * 100}%`,
            width:  `${(f.w / 640) * 100}%`,
            height: `${(f.h / 480) * 100}%`,
            borderColor: faceCount === 1 ? '#22c55e' : '#ef4444',
          }}
        />
      ))}

      {/* Status badge */}
      {isActive && (
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg">
            <StatusIcon className={`w-3.5 h-3.5 flex-shrink-0 ${statusColor}`} />
            <span className={`text-xs font-medium ${statusColor}`}>{statusText}</span>
            {detectionResult?.pose?.looking_away && (
              <span className="ml-auto text-xs text-yellow-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Looking {detectionResult.pose.direction}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Recording indicator */}
      {isActive && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="status-dot online" />
          <span className="text-xs text-white/70 font-medium">REC</span>
        </div>
      )}

      {/* Phone detected warning */}
      {detectionResult?.objects?.phone_detected && (
        <div className="absolute top-3 right-3 bg-red-500/90 text-white text-xs px-2 py-1 rounded-lg font-semibold animate-pulse">
          📱 Phone Detected
        </div>
      )}
    </div>
  )
}
