/**
 * proctoring.js — Client-Side Proctoring Service
 * Manages webcam capture, frame extraction (base64),
 * audio noise monitoring, tab/fullscreen detection,
 * and forwarding data via Socket.IO.
 */

import { getSocket } from './socket'

// ── Config ────────────────────────────────────────────────────────────────────
const FRAME_INTERVAL_MS  = 500   // Send frame every 500ms
const AUDIO_INTERVAL_MS  = 1000  // Send audio RMS every 1s
const JPEG_QUALITY       = 0.6   // JPEG compression (0–1)
const FRAME_WIDTH        = 640
const FRAME_HEIGHT       = 480

// ── State ─────────────────────────────────────────────────────────────────────
let videoStream     = null
let audioStream     = null
let audioContext    = null
let analyser        = null
let frameInterval   = null
let audioInterval   = null
let canvas          = null
let ctx2d           = null
let sessionId       = null
let isActive        = false

/**
 * Start proctoring: open camera + mic, start sending frames.
 * @param {number} sid  — ExamSession ID
 * @param {string} name — Student's full name
 * @param {HTMLVideoElement} videoEl — The <video> element to display feed
 */
export async function startProctoring(sid, name, videoEl) {
  if (isActive) return
  sessionId = sid

  // ── Camera ──────────────────────────────────────────────────────────────
  videoStream = await navigator.mediaDevices.getUserMedia({
    video: { width: FRAME_WIDTH, height: FRAME_HEIGHT, facingMode: 'user' },
    audio: true,
  })
  videoEl.srcObject = videoStream
  await videoEl.play()

  // ── Canvas for frame capture ─────────────────────────────────────────────
  canvas = document.createElement('canvas')
  canvas.width  = FRAME_WIDTH
  canvas.height = FRAME_HEIGHT
  ctx2d = canvas.getContext('2d')

  // ── Audio analysis ───────────────────────────────────────────────────────
  audioContext = new AudioContext()
  const source = audioContext.createMediaStreamSource(videoStream)
  analyser     = audioContext.createAnalyser()
  analyser.fftSize = 256
  source.connect(analyser)

  // ── Join Socket.IO session room ──────────────────────────────────────────
  const socket = getSocket()
  if (!socket.connected) {
    console.warn("⚠️ Socket not connected! Attempting to reconnect...")
    socket.connect()
  }
  socket.emit('join_session', { session_id: sid, student_name: name })

  isActive = true

  // ── Start loops with small delay to ensure session join is processed ────
  setTimeout(() => {
    if (!isActive) return
    frameInterval = setInterval(() => captureAndSendFrame(socket), FRAME_INTERVAL_MS)
    audioInterval = setInterval(() => captureAndSendAudio(socket, sid), AUDIO_INTERVAL_MS)
  }, 500)

  // ── Tab visibility / Focus detection ─────────────────────────────────────
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('blur', onWindowBlur)

  // ── Fullscreen detection ─────────────────────────────────────────────────
  document.addEventListener('fullscreenchange', onFullscreenChange)

  console.log(`✅ Proctoring started for session ${sid}`)
}

export function stopProctoring() {
  if (!isActive) return
  isActive = false

  clearInterval(frameInterval)
  clearInterval(audioInterval)

  videoStream?.getTracks().forEach(t => t.stop())
  audioContext?.close()

  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('blur', onWindowBlur)
  document.removeEventListener('fullscreenchange', onFullscreenChange)

  const socket = getSocket()
  socket.emit('leave_session', { session_id: sessionId })

  videoStream = audioStream = audioContext = analyser = null
  frameInterval = audioInterval = canvas = ctx2d = null
  sessionId = null
  console.log('🛑 Proctoring stopped')
}

function captureAndSendFrame(socket) {
  if (!isActive || !ctx2d) return
  const video = document.querySelector('video[data-proctor]')
  if (!video || video.readyState < 2) return

  ctx2d.drawImage(video, 0, 0, FRAME_WIDTH, FRAME_HEIGHT)
  const frame = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  console.debug(`[Proctoring] Sending frame for session ${sessionId}`)
  socket.emit('video_frame', { frame, session_id: sessionId })
}

function captureAndSendAudio(socket, sid) {
  if (!isActive || !analyser) return
  const buffer = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(buffer)

  // Compute RMS normalised 0–100
  const rms = Math.sqrt(buffer.reduce((a, b) => a + b * b, 0) / buffer.length)
  const normalised = Math.min(100, (rms / 128) * 100)
  socket.emit('audio_data', { rms: normalised, session_id: sid })
}

function onVisibilityChange() {
  if (document.hidden && isActive) {
    console.warn("⚠️ Tab switch detected (visibilitychange)")
    getSocket().emit('tab_switch', { session_id: sessionId })
  }
}

function onWindowBlur() {
  if (isActive) {
    console.warn("⚠️ Window focus lost (blur)")
    getSocket().emit('tab_switch', { session_id: sessionId })
  }
}

function onFullscreenChange() {
  if (!document.fullscreenElement && isActive) {
    getSocket().emit('fullscreen_exit', { session_id: sessionId })
  }
}

export function requestFullscreen() {
  document.documentElement.requestFullscreen?.().catch(err => {
    console.warn("Fullscreen request failed:", err.message)
  })
}

export function isFullscreen() {
  return !!document.fullscreenElement
}
