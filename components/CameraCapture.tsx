import React, { useRef, useState, useCallback, useEffect } from 'react';
import { CameraIcon, RefreshIcon } from './icons';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Votre navigateur ne supporte pas l'accès à la caméra.");
        return;
      }

      let mediaStream: MediaStream;
      
      try {
        // Try with ideal constraints first
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, 
          audio: false 
        });
      } catch (e) {
        console.warn("First retry with facingMode failed:", e);
        try {
          // Retry with any video source
          mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: false 
          });
        } catch (e2) {
          console.warn("Second retry with video: true failed:", e2);
          // If all constraints fail, throw the error to be caught by the outer catch
          throw e2;
        }
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraReady(true);
    } catch (err) {
      console.error("Camera access error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorName = err instanceof Error ? err.name : '';

      if (errorName === 'NotFoundError' || errorMessage.includes("Requested device not found") || errorMessage.includes("device not found")) {
        setError("Aucune caméra n'a été détectée. Assurez-vous qu'une caméra est branchée et activée.");
      } else if (errorName === 'NotAllowedError' || errorMessage.includes("Permission denied")) {
        setError("L'accès à la caméra a été refusé. Veuillez autoriser l'accès dans les paramètres de votre navigateur.");
      } else if (errorName === 'NotReadableError' || errorMessage.includes("Could not start video source")) {
        setError("La caméra est déjà utilisée par une autre application ou est bloquée.");
      } else {
        setError(`Erreur d'accès à la caméra : ${errorMessage}`);
      }
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
      <div className="relative w-full max-w-2xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
        <div className="aspect-video bg-black flex items-center justify-center">
          {error ? (
            <div className="text-center p-6">
              <p className="text-red-400 mb-4">{error}</p>
              <button 
                onClick={startCamera}
                className="flex items-center gap-2 mx-auto px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RefreshIcon className="w-5 h-5" />
                Réessayer
              </button>
            </div>
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
          )}
        </div>
        
        <canvas ref={canvasRef} className="hidden" />

        <div className="p-6 flex items-center justify-between">
          <button 
            onClick={onCancel}
            className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Annuler
          </button>
          
          <button 
            onClick={capturePhoto}
            disabled={!isCameraReady}
            className="group flex items-center justify-center w-16 h-16 bg-white rounded-full transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-white/10"
          >
            <div className="w-12 h-12 rounded-full border-4 border-gray-900 flex items-center justify-center">
                <div className="w-8 h-8 bg-gray-900 rounded-full group-hover:scale-90 transition-transform"></div>
            </div>
          </button>
          
          <div className="w-20" /> {/* Spacer */}
        </div>
      </div>
      
      <p className="mt-8 text-gray-400 text-sm text-center max-w-sm">
        Placez-vous bien dans le cadre pour un résultat optimal. L'IA s'occupe de la lumière et du décor.
      </p>
    </div>
  );
};

export default CameraCapture;
