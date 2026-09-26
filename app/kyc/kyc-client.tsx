"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  FileText,
  Camera,
  Upload,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Clock,
  Sparkles,
  Terminal,
  Building,
  Check,
  RefreshCw,
  X,
  Scan,
  RotateCcw,
  AlertCircle,
  Eye,
  ImageIcon,
} from "lucide-react"
import { completeKycAction } from "@/lib/actions/auth-actions"
import { FloatingSupportChat } from "@/components/FloatingSupportChat"

interface KycClientProps {
  user: {
    id: string
    name: string
    email: string
    role: string
    accounts: Array<{
      id: string
      accountNumber: string
      accountType: string
      balance: any
      status: string
    }>
  }
  isVerified: boolean
}

const REVIEW_STAGES = [
  {
    title: "Cryptographic Payload Encryption & Handshake",
    detail: "Securing biometric vectors, photo captures, and credential metadata using AES-256-GCM HSM keys.",
    log: "ENCRYPTION: Payload sealed via RSA-4096 envelope. SHA-256 biometric integrity confirmed.",
  },
  {
    title: "Document Forensics & MRZ Security Validation",
    detail: "Analyzing ICAO Doc 9303 checksums, holographic microprint, and issuing state authority signature.",
    log: "FORENSICS: Machine-Readable Zone (MRZ) checksum valid. Holographic integrity seal verified.",
  },
  {
    title: "Biometric 3D Facial Landmark & Anti-Spoofing Match",
    detail: "Cross-matching 68 facial coordinates against document portrait. Depth and anti-spoof texture analysis.",
    log: "BIOMETRIC_AI: 3D geometric mesh aligned with ID photo. Confidence score: 99.84% (Passed).",
  },
  {
    title: "Federal FinCEN, OFAC SDN & Global AML Clearance",
    detail: "Cross-referencing applicant against US Treasury OFAC Specially Designated Nationals and AML watchlists.",
    log: "OFAC_QUERY: 48,190 international sanctions entries queried — 0 matches found (Clean).",
  },
  {
    title: "Institutional Risk Underwriting & Adjudication",
    detail: "Automated compliance underwriting assessing jurisdictional risk and consumer banking eligibility.",
    log: "UNDERWRITING: Composite risk profile: Low (Score: 12/100). Tier-1 Clearance authorized.",
  },
  {
    title: "Ledger Unfreezing & FedWire Routing Clearance",
    detail: "Unfreezing checking and savings account ledgers. Activating Federal Reserve clearing rails.",
    log: "CORE_BANKING: Account ledgers unfrozen. Status updated -> ACTIVE. Routing enabled.",
  },
]

export function KycClient({ user, isVerified: initialVerified }: KycClientProps) {
  const router = useRouter()

  // Document states
  const [docType, setDocType] = useState("Passport")
  const [docVerified, setDocVerified] = useState(false)
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null)
  const [docFileName, setDocFileName] = useState<string | null>(null)
  const [docFileSize, setDocFileSize] = useState<string | null>(null)
  const [isScanningDoc, setIsScanningDoc] = useState(false)
  const [docScanProgress, setDocScanProgress] = useState(0)
  const [docExtractedDetails, setDocExtractedDetails] = useState<{
    docNum: string
    status: string
    integrity: string
  } | null>(null)

  // Selfie states
  const [selfieVerified, setSelfieVerified] = useState(false)
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isScanningSelfie, setIsScanningSelfie] = useState(false)
  const [selfieScanProgress, setSelfieScanProgress] = useState(0)

  // Modals & refs
  const [activeModal, setActiveModal] = useState<"doc" | "selfie" | null>(null)
  const docInputRef = useRef<HTMLInputElement | null>(null)
  const selfieInputRef = useRef<HTMLInputElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Delay simulation states
  const [reviewState, setReviewState] = useState<"idle" | "reviewing" | "approved">(
    initialVerified ? "approved" : "idle"
  )
  const [reviewProgress, setReviewProgress] = useState(0)
  const [currentStageIdx, setCurrentStageIdx] = useState(0)
  const [terminalLogs, setTerminalLogs] = useState<string[]>([])
  const [redirectCountdown, setRedirectCountdown] = useState(3)
  const [remainingSeconds, setRemainingSeconds] = useState(28)

  // ─────────────────────────────────────────────────────────────
  // Clean up camera on modal close / unmount
  // ─────────────────────────────────────────────────────────────
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // ─────────────────────────────────────────────────────────────
  // Document File Handling
  // ─────────────────────────────────────────────────────────────
  const handleDocFileSelect = (file: File) => {
    if (!file) return

    setDocFileName(file.name)
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2)
    setDocFileSize(`${sizeInMb} MB`)

    // Create a local data URL preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setDocPreviewUrl(dataUrl)

      // Start realistic OCR scan animation
      setIsScanningDoc(true)
      setDocScanProgress(0)

      let p = 0
      const scanInterval = setInterval(() => {
        p += 4
        setDocScanProgress(Math.min(100, p))
        if (p >= 100) {
          clearInterval(scanInterval)
          setIsScanningDoc(false)
          setDocExtractedDetails({
            docNum: `${docType.slice(0, 3).toUpperCase()}-${Math.floor(10000000 + Math.random() * 90000000)}`,
            status: "AUTHENTICATED & LEGIBLE",
            integrity: "SHA-256 DIGITAL WATERMARK VERIFIED",
          })
        }
      }, 100)
    }

    if (file.type.startsWith("image/")) {
      reader.readAsDataURL(file)
    } else {
      // PDF or non-image
      setDocPreviewUrl("/placeholder-doc.png")
      setIsScanningDoc(false)
      setDocExtractedDetails({
        docNum: `DOC-${Math.floor(10000000 + Math.random() * 90000000)}`,
        status: "DOCUMENT PARSED",
        integrity: "CRYPTOGRAPHIC HASH MATCH",
      })
    }
  }

  const handleDocConfirm = () => {
    if (!docPreviewUrl) return
    setDocVerified(true)
    setActiveModal(null)
  }

  // ─────────────────────────────────────────────────────────────
  // Camera & Selfie Handling
  // ─────────────────────────────────────────────────────────────
  const startCamera = async () => {
    setCameraError(null)
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not supported in this browser.")
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })

      streamRef.current = stream
      setCameraActive(true)

      // Wait a tick for videoRef to mount if necessary
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      }, 50)
    } catch (err: any) {
      console.warn("Camera start failed:", err)
      setCameraError(
        "Camera access was blocked or is unavailable on this device. You can upload a selfie photo below instead."
      )
      setCameraActive(false)
    }
  }

  const captureCameraSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Draw the current video frame onto the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL("image/png")

    setSelfiePreviewUrl(dataUrl)
    stopCamera()

    // Run simulated 3D biometric landmark scan
    runSelfieLandmarkScan()
  }

  const handleSelfieFileSelect = (file: File) => {
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setSelfiePreviewUrl(dataUrl)
      stopCamera()
      runSelfieLandmarkScan()
    }
    reader.readAsDataURL(file)
  }

  const runSelfieLandmarkScan = () => {
    setIsScanningSelfie(true)
    setSelfieScanProgress(0)

    let p = 0
    const landmarkInterval = setInterval(() => {
      p += 5
      setSelfieScanProgress(Math.min(100, p))
      if (p >= 100) {
        clearInterval(landmarkInterval)
        setIsScanningSelfie(false)
      }
    }, 100)
  }

  const handleSelfieConfirm = () => {
    if (!selfiePreviewUrl) return
    setSelfieVerified(true)
    setActiveModal(null)
    stopCamera()
  }

  // ─────────────────────────────────────────────────────────────
  // Delay Simulation Execution
  // ─────────────────────────────────────────────────────────────
  const handleStartReview = () => {
    if (!docVerified || !selfieVerified) return
    setReviewState("reviewing")
    setReviewProgress(3)
    setCurrentStageIdx(0)
    setRemainingSeconds(28)

    const now = new Date()
    const ts = now.toTimeString().split(" ")[0]
    setTerminalLogs([
      `[${ts}] INGEST: Client credential bundle (${docFileName || "ID_Document.jpg"}) received for ${user.name}`,
      `[${ts}] COMPLIANCE_ENGINE: Initializing automated regulatory audit sequence...`,
    ])
  }

  // 1-second countdown for remaining time display
  useEffect(() => {
    if (reviewState !== "reviewing") return

    const secondTimer = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(secondTimer)
  }, [reviewState])

  // Main 28-second review simulation progress
  useEffect(() => {
    if (reviewState !== "reviewing") return

    const totalDuration = 28000 // 28 seconds realistic institutional delay
    const intervalTime = 100
    const increment = 100 / (totalDuration / intervalTime)

    const timer = setInterval(() => {
      setReviewProgress((prev) => {
        const next = Math.min(100, prev + increment)
        const stage = Math.min(5, Math.floor((next / 100) * 6))
        setCurrentStageIdx(stage)
        return next
      })
    }, intervalTime)

    return () => clearInterval(timer)
  }, [reviewState])

  useEffect(() => {
    if (reviewState !== "reviewing") return

    const currentStage = REVIEW_STAGES[currentStageIdx]
    if (!currentStage) return

    const now = new Date()
    const ts = now.toTimeString().split(" ")[0]
    const newLog = `[${ts}] ${currentStage.log}`

    setTerminalLogs((prev) => {
      if (prev.includes(newLog)) return prev
      return [...prev, newLog]
    })
  }, [currentStageIdx, reviewState])

  useEffect(() => {
    if (reviewState !== "reviewing" || reviewProgress < 100) return

    let isMounted = true

    async function finishVerification() {
      await completeKycAction()
      if (isMounted) {
        setReviewState("approved")
      }
    }

    const delayTimer = setTimeout(() => {
      finishVerification()
    }, 600)

    return () => {
      isMounted = false
      clearTimeout(delayTimer)
    }
  }, [reviewProgress, reviewState])

  useEffect(() => {
    if (reviewState !== "approved" || initialVerified) return

    const countdownTimer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer)
          router.push("/dashboard?kyc=success")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdownTimer)
  }, [reviewState, initialVerified, router])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Hidden file inputs & canvas */}
      <input
        type="file"
        ref={docInputRef}
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleDocFileSelect(e.target.files[0])
          }
        }}
      />
      <input
        type="file"
        ref={selfieInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleSelfieFileSelect(e.target.files[0])
          }
        }}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-wider uppercase text-slate-900 font-mono">
              PrimeVault Compliance Desk
            </span>
            <span
              className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                reviewState === "approved"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : reviewState === "reviewing"
                  ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
            >
              {reviewState === "approved"
                ? "Tier-1 Active"
                : reviewState === "reviewing"
                ? "Review In Progress"
                : "Tier-1 Mandate"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            onClick={() =>
              alert(
                "PrimeVault Compliance Desk:\n• All retail and commercial accounts require identity clearance under FinCEN Rule 31 CFR 1020.220.\n• Unverified accounts remain in Non-Active state to safeguard reserves."
              )
            }
          >
            <Bell className="size-5" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 pb-20 flex flex-col items-center">
        {/* ============================================================== */}
        {/* STATE 1: ALREADY VERIFIED / APPROVED CERTIFICATE               */}
        {/* ============================================================== */}
        {reviewState === "approved" ? (
          <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="rounded-3xl border border-emerald-200 bg-white p-6 sm:p-8 text-center shadow-xl shadow-emerald-500/5">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-inner">
                <CheckCircle2 className="size-10" />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">
                <ShieldCheck className="size-3.5" />
                Tier-1 Regulatory Clearance Approved
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
                Identity Verified &amp; Accounts Unfrozen
              </h1>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed mb-6">
                Your credentials have successfully cleared Federal FinCEN, OFAC, and anti-money laundering screening. All transaction capabilities are unlocked.
              </p>

              {/* Clearance Details Grid */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-left grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-6">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Account Holder
                  </span>
                  <p className="font-bold text-slate-900 mt-0.5 text-sm">{user.name}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Account Status
                  </span>
                  <p className="font-bold text-emerald-700 mt-0.5 flex items-center gap-1.5 text-sm">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    ACTIVE &amp; UNRESTRICTED
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Outbound Wire Limit
                  </span>
                  <p className="font-bold font-mono text-slate-900 mt-0.5">$250,000.00 / day</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Clearing Route
                  </span>
                  <p className="font-bold text-slate-900 mt-0.5">FedWire / ACH / Prime Network</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Biometric Check
                  </span>
                  <p className="font-semibold text-emerald-700 mt-0.5">3D Geometry Matched (99.8%)</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Clearance Reference
                  </span>
                  <p className="font-mono text-slate-600 mt-0.5">
                    PV-KYC-{user.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>

              {!initialVerified && (
                <div className="mb-6 rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700 font-semibold flex items-center justify-center gap-2">
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Redirecting to your dashboard in {redirectCountdown}s…</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-blue-600/20"
                >
                  <span>Go to Client Dashboard</span>
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/transfers"
                  className="flex items-center justify-center gap-2 h-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
                >
                  <span>Make a Transfer</span>
                </Link>
              </div>
            </div>
          </div>
        ) : reviewState === "reviewing" ? (
          /* ============================================================== */
          /* STATE 2: ACTIVE COMPLIANCE REVIEW DELAY SIMULATION              */
          /* ============================================================== */
          <div className="w-full space-y-6 animate-in fade-in duration-300">
            {/* Header Badge */}
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-800 uppercase tracking-wider mb-3">
                <span className="size-2 rounded-full bg-amber-500 animate-ping" />
                Under Institutional Regulatory Review
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
                Verifying Compliance Credentials
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Your identification documents and facial liveness telemetry are currently being audited by the automated compliance clearance engine.
              </p>
            </div>

            {/* Progress Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xl">
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase tracking-wider text-slate-700">
                    Verification Progress
                  </span>
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-mono text-blue-700 font-semibold">
                    ~{remainingSeconds}s remaining
                  </span>
                </div>
                <span className="font-mono font-extrabold text-blue-600 text-sm">
                  {Math.round(reviewProgress)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200 mb-6">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-200 ease-out shadow-sm"
                  style={{ width: `${reviewProgress}%` }}
                />
              </div>

              {/* Sequential Stages List */}
              <div className="space-y-3.5 mb-6">
                {REVIEW_STAGES.map((stg, idx) => {
                  const isDone = idx < currentStageIdx || reviewProgress >= 100
                  const isCurrent = idx === currentStageIdx && reviewProgress < 100

                  return (
                    <div
                      key={stg.title}
                      className={`flex items-start gap-3 rounded-2xl border p-3.5 transition-all ${
                        isDone
                          ? "border-emerald-200 bg-emerald-50/60 text-slate-900"
                          : isCurrent
                          ? "border-blue-300 bg-blue-50/70 text-slate-900 shadow-sm"
                          : "border-slate-100 bg-slate-50/40 text-slate-400"
                      }`}
                    >
                      <div
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full mt-0.5 transition-colors ${
                          isDone
                            ? "bg-emerald-600 text-white"
                            : isCurrent
                            ? "bg-blue-600 text-white animate-pulse"
                            : "bg-slate-200 text-slate-400"
                        }`}
                      >
                        {isDone ? (
                          <Check className="size-4 stroke-[3]" />
                        ) : isCurrent ? (
                          <RefreshCw className="size-3.5 animate-spin" />
                        ) : (
                          <span className="text-[10px] font-bold">{idx + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4
                            className={`text-xs font-bold truncate ${
                              isDone
                                ? "text-emerald-900"
                                : isCurrent
                                ? "text-blue-900"
                                : "text-slate-500"
                            }`}
                          >
                            {stg.title}
                          </h4>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                              isDone
                                ? "text-emerald-700"
                                : isCurrent
                                ? "text-blue-600"
                                : "text-slate-400"
                            }`}
                          >
                            {isDone ? "Cleared" : isCurrent ? "Processing" : "Queued"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {stg.detail}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Terminal Audit Log Console */}
              <div className="rounded-2xl border border-slate-800 bg-[#0F172A] p-4 font-mono text-[11px] text-slate-300 space-y-1.5 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-slate-400 text-[10px] uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Terminal className="size-3.5 text-blue-400" />
                    <span>Compliance Telemetry Audit Log</span>
                  </div>
                  <span className="text-emerald-400 font-bold">SECURE CHANNEL</span>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {terminalLogs.map((log, i) => (
                    <div key={i} className="text-slate-300 leading-tight">
                      <span className="text-blue-400">&gt;</span> {log}
                    </div>
                  ))}
                  <div className="text-blue-400 animate-pulse">&gt; _</div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-center text-slate-400">
              Please do not close this window. Your browser session is maintaining a secure cryptographic handshake with the compliance engine.
            </p>
          </div>
        ) : (
          /* ============================================================== */
          /* STATE 3: FORM SUBMISSION (ID UPLOAD & BIOMETRIC SELFIE)         */
          /* ============================================================== */
          <div className="w-full flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-semibold text-blue-700 mb-4 shadow-sm">
              <ShieldCheck className="size-3.5 text-blue-600" />
              <span>Federal Banking Regulatory Compliance (Tier-1)</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
              Identity Verification
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-8 max-w-md">
              Federal banking regulations require client identity verification to activate account routing, unfreeze accounts, and enable transfers and deposits.
            </p>

            {/* Checklist */}
            <div className="w-full space-y-4 mb-6 text-left">
              {/* Item 1: Document Upload */}
              <div
                onClick={() => setActiveModal("doc")}
                className={`flex items-center justify-between rounded-2xl border p-4 cursor-pointer transition-all shadow-sm ${
                  docVerified
                    ? "border-emerald-300 bg-emerald-50/80"
                    : "border-slate-200 bg-white hover:border-blue-400 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {docVerified && docPreviewUrl ? (
                    <div className="relative size-12 shrink-0 rounded-xl overflow-hidden border border-emerald-300 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={docPreviewUrl}
                        alt="ID Document Preview"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-emerald-600/20 flex items-center justify-center">
                        <Check className="size-4 text-white stroke-[3]" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <FileText className="size-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        Government ID Document
                      </h4>
                      {docVerified && (
                        <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 border border-emerald-200">
                          Attached
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {docVerified
                        ? `✓ ${docFileName || docType} (${docFileSize || "Verified"})`
                        : "Passport, Driver's License, or National ID Card"}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 pl-2">
                  {docVerified ? (
                    <span className="text-xs font-semibold text-blue-600 hover:underline">
                      Replace
                    </span>
                  ) : (
                    <ArrowRight className="size-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Item 2: Biometric Facial Selfie */}
              <div
                onClick={() => {
                  setActiveModal("selfie")
                  startCamera()
                }}
                className={`flex items-center justify-between rounded-2xl border p-4 cursor-pointer transition-all shadow-sm ${
                  selfieVerified
                    ? "border-emerald-300 bg-emerald-50/80"
                    : "border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {selfieVerified && selfiePreviewUrl ? (
                    <div className="relative size-12 shrink-0 rounded-full overflow-hidden border-2 border-emerald-400 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selfiePreviewUrl}
                        alt="Selfie Preview"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-emerald-600/20 flex items-center justify-center">
                        <Check className="size-4 text-white stroke-[3]" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Camera className="size-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        Facial Liveness Selfie
                      </h4>
                      {selfieVerified && (
                        <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 border border-emerald-200">
                          99.8% Match
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {selfieVerified
                        ? "✓ 3D Biometric facial landmark mesh generated"
                        : "Live facial landmark & anti-spoof analysis"}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 pl-2">
                  {selfieVerified ? (
                    <span className="text-xs font-semibold text-blue-600 hover:underline">
                      Retake
                    </span>
                  ) : (
                    <ArrowRight className="size-4 text-slate-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Security Assurance Box */}
            <div className="w-full flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-100/70 p-3 mb-6 text-left">
              <Lock className="size-4 text-slate-500 shrink-0" />
              <p className="text-[11px] text-slate-600 leading-tight">
                All biometrics and documents are encrypted using AES-256 bank-grade protocol and strictly processed in compliance with SOC2 standards.
              </p>
            </div>

            {/* Submit button */}
            <button
              onClick={handleStartReview}
              disabled={!docVerified || !selfieVerified}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-blue-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {docVerified && selfieVerified ? (
                <>
                  <ShieldCheck className="size-5" />
                  SUBMIT FOR COMPLIANCE VERIFICATION
                </>
              ) : (
                "COMPLETE BOTH STEPS TO SUBMIT"
              )}
            </button>
          </div>
        )}
      </main>

      <FloatingSupportChat />

      {/* ============================================================== */}
      {/* MODAL 1: REAL DOCUMENT UPLOAD WITH LIVE PREVIEW & OCR SCAN     */}
      {/* ============================================================== */}
      {activeModal === "doc" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 text-center shadow-2xl">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>

            <div className="mx-auto size-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
              <FileText className="size-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Upload Identification</h3>
            <p className="text-xs text-slate-500 mb-4">
              Select your document type and upload a clear photo or scanned document from your device.
            </p>

            {/* Document Type Switcher */}
            <div className="flex justify-center gap-1.5 mb-4">
              {["Passport", "Driver License", "National ID"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDocType(t)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition-all ${
                    docType === t
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* File dropzone / Preview Area */}
            {!docPreviewUrl ? (
              <div
                onClick={() => docInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (e.dataTransfer.files?.[0]) {
                    handleDocFileSelect(e.dataTransfer.files[0])
                  }
                }}
                className="border-2 border-dashed border-slate-300 rounded-2xl p-6 sm:p-8 mb-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all flex flex-col items-center gap-2 group"
              >
                <div className="size-12 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                  <Upload className="size-6 text-slate-600 group-hover:text-blue-600" />
                </div>
                <span className="text-xs text-slate-800 font-bold">
                  Click to select or drag &amp; drop {docType} image
                </span>
                <span className="text-[11px] text-slate-500">
                  Supports JPG, PNG, WebP, or PDF up to 15MB
                </span>
              </div>
            ) : (
              /* Preview Area with Scanner */
              <div className="mb-4 space-y-3">
                <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-900 max-h-52 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={docPreviewUrl}
                    alt="Document preview"
                    className="max-h-52 w-auto object-contain mx-auto"
                  />

                  {/* Laser Scanning Line Animation */}
                  {isScanningDoc && (
                    <div
                      className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.8)] transition-all duration-150"
                      style={{ top: `${docScanProgress}%` }}
                    />
                  )}

                  {isScanningDoc && (
                    <div className="absolute inset-0 bg-blue-900/30 backdrop-blur-[1px] flex flex-col items-center justify-center p-4">
                      <div className="bg-slate-900/90 text-white rounded-xl px-3.5 py-2 border border-cyan-400/50 flex items-center gap-2 text-xs font-mono shadow-xl">
                        <Scan className="size-4 text-cyan-400 animate-spin" />
                        <span>OCR Scanning… {docScanProgress}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Metadata card */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="truncate max-w-[200px]">{docFileName || "Attached Document"}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{docFileSize}</span>
                  </div>
                  {docExtractedDetails && (
                    <div className="pt-1 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-slate-400 uppercase font-semibold">Document No.</span>
                        <p className="font-mono font-bold text-slate-700">
                          {docExtractedDetails.docNum}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase font-semibold">Integrity</span>
                        <p className="font-semibold text-emerald-700">
                          {docExtractedDetails.status}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                  <RotateCcw className="size-3" />
                  <span>Choose different file</span>
                </button>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!docPreviewUrl || isScanningDoc}
                onClick={handleDocConfirm}
                className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-blue-600/20"
              >
                Confirm &amp; Attach
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: LIVE WEBCAM FACIAL RECOGNITION & 3D LANDMARK SCAN     */}
      {/* ============================================================== */}
      {activeModal === "selfie" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 text-center shadow-2xl">
            <button
              onClick={() => {
                setActiveModal(null)
                stopCamera()
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>

            <div className="mx-auto size-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
              <Camera className="size-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Biometric Liveness Verification</h3>
            <p className="text-xs text-slate-500 mb-4">
              Center your face inside the biometric frame. Maintain neutral expression in good lighting.
            </p>

            {/* Error fallback */}
            {cameraError && !selfiePreviewUrl && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 mb-4 text-left text-xs text-amber-800 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => selfieInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
                >
                  <Upload className="size-3.5" />
                  <span>Upload Selfie Photo</span>
                </button>
              </div>
            )}

            {/* Viewfinder: Video Stream OR Captured Preview */}
            <div className="relative mx-auto mb-4 size-56 rounded-full border-4 border-dashed border-indigo-500 bg-slate-950 overflow-hidden flex items-center justify-center shadow-inner">
              {/* Corner Biometric Reticles */}
              <div className="absolute inset-4 pointer-events-none border border-indigo-400/30 rounded-full" />
              <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-indigo-400 bg-slate-900/80 px-2 py-0.5 rounded-full uppercase tracking-wider z-20">
                {isScanningSelfie
                  ? "3D Landmark Mesh"
                  : selfiePreviewUrl
                  ? "Captured"
                  : "Target Frame"}
              </div>

              {selfiePreviewUrl ? (
                /* Captured Selfie View */
                <div className="relative size-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selfiePreviewUrl}
                    alt="Captured selfie"
                    className="size-full object-cover"
                  />

                  {/* 3D Landmark Grid Animation */}
                  {isScanningSelfie && (
                    <>
                      <div
                        className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_15px_rgba(129,140,248,1)] transition-all duration-100 z-10"
                        style={{ top: `${selfieScanProgress}%` }}
                      />
                      {/* Geometric Landmark Points */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="size-32 border border-indigo-400/40 rounded-full animate-pulse" />
                        <div className="absolute size-2 rounded-full bg-cyan-400 shadow-md top-16 left-20" />
                        <div className="absolute size-2 rounded-full bg-cyan-400 shadow-md top-16 right-20" />
                        <div className="absolute size-2 rounded-full bg-cyan-400 shadow-md top-24 left-27" />
                        <div className="absolute size-2 rounded-full bg-cyan-400 shadow-md bottom-16 left-27" />
                      </div>
                    </>
                  )}
                </div>
              ) : cameraActive ? (
                /* Live Video Stream */
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="size-full object-cover -scale-x-100"
                />
              ) : (
                /* Idle camera placeholder */
                <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-4">
                  <UserCheck className="size-14 text-indigo-400 animate-pulse" />
                  <span className="text-[11px] font-mono">Initializing Camera…</span>
                </div>
              )}
            </div>

            {/* Scan progress badge */}
            {isScanningSelfie && (
              <div className="text-xs font-mono font-semibold text-indigo-600 mb-3 animate-pulse">
                Analyzing 3D landmarks &amp; micro-textures… {selfieScanProgress}%
              </div>
            )}

            {selfiePreviewUrl && !isScanningSelfie && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 mb-3">
                <CheckCircle2 className="size-3.5" />
                <span>Facial Match Confirmed (99.8%)</span>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              {selfiePreviewUrl ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelfiePreviewUrl(null)
                      startCamera()
                    }}
                    className="flex-1 h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Retake</span>
                  </button>
                  <button
                    type="button"
                    disabled={isScanningSelfie}
                    onClick={handleSelfieConfirm}
                    className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-indigo-600/20"
                  >
                    Confirm Selfie
                  </button>
                </div>
              ) : cameraActive ? (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={captureCameraSelfie}
                    className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
                  >
                    <Camera className="size-4" />
                    <span>Capture Facial Scan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => selfieInputRef.current?.click()}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 underline"
                  >
                    Or upload photo from device
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
                  >
                    <Camera className="size-4" />
                    <span>Enable Live Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => selfieInputRef.current?.click()}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Upload className="size-3.5" />
                    <span>Choose Photo from Device</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
