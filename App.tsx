import React, { useState, useCallback, useEffect, ReactElement } from 'react';
import { AppState } from './types';
import { suggestStyle, enhanceImage } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import ImageComparison from './components/ImageComparison';
import CameraCapture from './components/CameraCapture';
import { 
  DownloadIcon, RefreshIcon, AlertIcon, SparklesIcon,
  SoftLightIcon, DramaticLightIcon, BacklightIcon, NeonLightIcon, CameraIcon
} from './components/icons';

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const enhancingMessages = [
  "Préparation du studio virtuel...",
  "Sculpture de la lumière...",
  "Harmonisation des couleurs...",
  "Révélation des détails...",
  "Touche finale du maître...",
];

const AMBIANCE_OPTIONS = [
  { name: 'Professionnel & Sobre', key: 'Professionnel & Sobre', description: "Idéal pour un profil business." },
  { name: 'Éditorial de Mode', key: 'Éditorial de Mode', description: "Style magazine, audacieux et affirmé." },
  { name: 'Portrait Cinématographique', key: 'Portrait Cinématographique', description: "Ambiance de film, riche en émotions." },
  { name: 'Authentique & Naturel', key: 'Authentique & Naturel', description: "Spontané et détendu." },
];

const LIGHTING_OPTIONS = [
  { name: 'Lumière Douce', key: 'Lumière Douce & Flatteuse', icon: <SoftLightIcon /> },
  { name: 'Clair-Obscur', key: 'Clair-Obscur Dramatique', icon: <DramaticLightIcon /> },
  { name: 'Contre-jour', key: 'Contre-jour Ambré', icon: <BacklightIcon /> },
  { name: 'Néon', key: 'Néon Futuriste', icon: <NeonLightIcon /> },
];

const BACKGROUND_OPTIONS = [
  { name: 'Gris Classique', className: 'bg-gray-500' },
  { name: 'Noir Intense', className: 'bg-black' },
  { name: 'Blanc Épuré', className: 'bg-white' },
  { name: 'Toile Peinte', className: 'bg-gradient-to-br from-gray-600 to-gray-800' },
  { name: 'Bureau Moderne', className: 'bg-gradient-to-br from-blue-400 to-gray-500' },
  { name: 'Ambiance Urbaine', className: 'bg-gradient-to-br from-slate-800 to-purple-900' },
  { name: 'Jardin Botanique', className: 'bg-gradient-to-br from-emerald-500 to-lime-700' },
  { name: 'Néon Artistique', className: 'bg-gradient-to-br from-fuchsia-600 to-indigo-800' },
];

const LoadingIndicator: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <div className="w-12 h-12 border-4 border-t-indigo-500 border-gray-600 rounded-full animate-spin"></div>
    <p className="text-lg text-gray-300 transition-opacity duration-500">{message}</p>
  </div>
);

interface StudioOptionCardProps {
  title: string;
  onClick: () => void;
  isSelected: boolean;
  children: React.ReactNode;
}

const StudioOptionCard: React.FC<StudioOptionCardProps> = ({ title, onClick, isSelected, children }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center text-center p-4 rounded-xl border-2 w-full aspect-[4/3] transition-all duration-200 transform hover:scale-105
            ${isSelected ? 'bg-indigo-900/50 border-indigo-500 shadow-lg' : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'}`}
    >
        {children}
        <p className={`mt-2 font-semibold text-sm ${isSelected ? 'text-white' : 'text-gray-300'}`}>{title}</p>
    </button>
);

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.INITIAL);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [originalImageDataUrl, setOriginalImageDataUrl] = useState<string | null>(null);
  const [suggestedAmbiance, setSuggestedAmbiance] = useState<string | null>(null);
  const [selectedAmbiance, setSelectedAmbiance] = useState<string>('Authentique & Naturel');
  const [selectedLighting, setSelectedLighting] = useState<string>('Lumière Douce & Flatteuse');
  const [selectedBackground, setSelectedBackground] = useState<string>('Gris Classique');
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enhancingMessage, setEnhancingMessage] = useState(enhancingMessages[0]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  useEffect(() => {
    let messageIndex = 0;
    let intervalId: number | null = null;
    if (appState === AppState.ENHANCING) {
      setEnhancingMessage(enhancingMessages[0]);
      intervalId = window.setInterval(() => {
        messageIndex = (messageIndex + 1) % enhancingMessages.length;
        setEnhancingMessage(enhancingMessages[messageIndex]);
      }, 2500);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [appState]);

  const handleImageUpload = useCallback(async (file: File) => {
    try {
      setAppState(AppState.ANALYZING);
      setError(null);
      setOriginalImageFile(file);
      const dataUrl = await fileToDataUrl(file);
      setOriginalImageDataUrl(dataUrl);

      const base64 = dataUrl.split(',')[1];
      const style = await suggestStyle(base64, file.type);
      setSuggestedAmbiance(style);
      setSelectedAmbiance(style); // Pre-select the suggested style
      setAppState(AppState.SUGGESTED);
    } catch (e) {
      const err = e as Error;
      setError(err.message || "Une erreur est survenue lors de l'analyse.");
      setAppState(AppState.ERROR);
    }
  }, []);

  const handleEnhance = useCallback(async () => {
    if (!originalImageFile) return;
    try {
      setAppState(AppState.ENHANCING);
      setError(null);
      const base64 = (originalImageDataUrl as string).split(',')[1];
      const newImage = await enhanceImage(base64, originalImageFile.type, selectedAmbiance, selectedLighting, selectedBackground);
      setEnhancedImage(newImage);
      setAppState(AppState.RESULT);
    } catch (e) {
      const err = e as Error;
      setError(err.message || "Une erreur est survenue lors de la création.");
      setAppState(AppState.ERROR);
    }
  }, [originalImageFile, originalImageDataUrl, selectedAmbiance, selectedLighting, selectedBackground]);

  const handleReset = () => {
    setAppState(AppState.INITIAL);
    setOriginalImageFile(null);
    setOriginalImageDataUrl(null);
    setSuggestedAmbiance(null);
    setSelectedAmbiance('Authentique & Naturel');
    setSelectedLighting('Lumière Douce & Flatteuse');
    setSelectedBackground('Gris Classique');
    setEnhancedImage(null);
    setError(null);
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.INITIAL:
        return (
          <>
            <h2 className="text-3xl md:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
              Bienvenue au Studio Photo IA
            </h2>
            <p className="mt-4 text-lg text-center text-gray-400 max-w-2xl mx-auto">
              Capturez un portrait ou téléversez une photo pour un shooting professionnel instantané.
            </p>
            <div className="mt-10 flex flex-col items-center gap-6 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                <button 
                  onClick={() => setIsCameraOpen(true)}
                  className="flex flex-col items-center justify-center p-8 bg-indigo-600/10 border-2 border-indigo-500/30 rounded-2xl hover:bg-indigo-600/20 hover:border-indigo-500 transition-all group lg:aspect-square"
                >
                  <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <CameraIcon className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Prendre une Photo</h3>
                  <p className="text-sm text-gray-400 text-center">Utilisez votre caméra pour un résultat immédiat.</p>
                </button>

                <div className="flex flex-col items-center justify-center">
                  <ImageUploader onImageUpload={handleImageUpload} disabled={false} />
                </div>
              </div>
              
              {isCameraOpen && (
                <CameraCapture 
                  onCapture={(file) => {
                    setIsCameraOpen(false);
                    handleImageUpload(file);
                  }}
                  onCancel={() => setIsCameraOpen(false)}
                />
              )}
            </div>
          </>
        );
      case AppState.ANALYZING:
        return (
          <div className="flex flex-col items-center space-y-8">
            <img src={originalImageDataUrl!} alt="Uploaded" className="max-h-80 rounded-lg shadow-lg" />
            <LoadingIndicator message="Analyse de votre style..." />
          </div>
        );
      case AppState.SUGGESTED:
        return (
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 md:gap-12 w-full max-w-7xl mx-auto">
            <div className="w-full lg:w-1/3 flex-shrink-0">
                <img src={originalImageDataUrl!} alt="Téléversée" className="w-full h-auto object-contain rounded-lg shadow-2xl" />
                <button onClick={handleReset} className="mt-4 text-gray-400 hover:text-white transition-colors text-sm w-full text-center">Changer de photo</button>
            </div>
            <div className="w-full lg:w-2/3 flex flex-col items-center">
                <h2 className="text-2xl font-bold text-gray-200">Studio Dashboard</h2>
                <p className="mt-1 text-gray-400 text-center">Personnalisez votre shooting. L'IA a suggéré une ambiance pour vous.</p>
                
                {/* AMBIANCE */}
                <div className="w-full mt-6">
                    <h3 className="text-lg font-semibold text-gray-300 mb-3">1. Ambiance</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {AMBIANCE_OPTIONS.map(({ name, key, description }) => (
                           <div key={key} className="relative">
                               <StudioOptionCard title={name} onClick={() => setSelectedAmbiance(key)} isSelected={selectedAmbiance === key}>
                                   <div className="flex-grow flex items-center justify-center">
                                     <p className="text-xs text-gray-400 px-1">{description}</p>
                                   </div>
                               </StudioOptionCard>
                               {suggestedAmbiance === key && <span className="absolute -top-2 -right-2 inline-flex items-center gap-x-1.5 rounded-full bg-indigo-500 px-2 py-1 text-xs font-medium text-white"><SparklesIcon className="h-4 w-4"/>Suggéré</span>}
                           </div>
                        ))}
                    </div>
                </div>

                {/* LIGHTING */}
                <div className="w-full mt-6">
                    <h3 className="text-lg font-semibold text-gray-300 mb-3">2. Éclairage</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       {LIGHTING_OPTIONS.map(({ name, key, icon }) => (
                           <StudioOptionCard key={key} title={name} onClick={() => setSelectedLighting(key)} isSelected={selectedLighting === key}>
                               <div className="flex-grow flex items-center justify-center text-4xl text-gray-300">{icon}</div>
                           </StudioOptionCard>
                       ))}
                    </div>
                </div>

                {/* BACKGROUND */}
                <div className="w-full mt-6">
                    <h3 className="text-lg font-semibold text-gray-300 mb-3">3. Arrière-plan</h3>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                       {BACKGROUND_OPTIONS.map(({ name, className }) => (
                           <button key={name} onClick={() => setSelectedBackground(name)} className={`w-full aspect-square rounded-lg border-2 transition-all duration-200 ${className} ${selectedBackground === name ? 'border-indigo-500 scale-110 shadow-lg' : 'border-gray-700 hover:border-gray-500'}`} title={name}></button>
                       ))}
                    </div>
                </div>
                
                <button onClick={handleEnhance} className="mt-8 w-full md:w-auto inline-flex items-center justify-center gap-x-2 rounded-lg bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 transform hover:scale-105">
                    <SparklesIcon className="w-6 h-6"/>
                    Générer mon Portrait
                </button>
            </div>
          </div>
        );
      case AppState.ENHANCING:
         return (
          <div className="flex flex-col items-center space-y-8">
            <img src={originalImageDataUrl!} alt="Uploaded" className="max-h-80 rounded-lg shadow-lg opacity-50" />
            <LoadingIndicator message={enhancingMessage} />
          </div>
        );
      case AppState.RESULT:
        return (
            <div className="w-full flex flex-col items-center">
                <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600 mb-2">
                    Votre Portrait est Prêt !
                </h2>
                <div className="text-center text-gray-400 mb-6">
                    <p>Ambiance: {selectedAmbiance} &bull; Éclairage: {LIGHTING_OPTIONS.find(l => l.key === selectedLighting)?.name} &bull; Fond: {selectedBackground}</p>
                </div>
                <div className="w-full max-w-3xl mb-8">
                  <ImageComparison beforeSrc={originalImageDataUrl!} afterSrc={enhancedImage!} />
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                     <a
                        href={enhancedImage!}
                        download={`pmn_studio_${selectedAmbiance?.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_')}_${Date.now()}.png`}
                        className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 font-semibold text-white transition-all duration-200 bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900"
                    >
                        <DownloadIcon className="w-5 h-5 mr-2" />
                        Télécharger
                    </a>
                    <button
                        onClick={handleReset}
                        className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 font-semibold text-gray-300 transition-all duration-200 bg-gray-700 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-900"
                    >
                        <RefreshIcon className="w-5 h-5 mr-2" />
                        Nouveau Shooting
                    </button>
                </div>
            </div>
        );
       case AppState.ERROR:
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-red-900/20 border border-red-500/50 rounded-lg max-w-lg mx-auto">
                <AlertIcon className="w-12 h-12 text-red-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Oups, une erreur est survenue</h3>
                <p className="text-red-300 mb-6">{error || 'Une erreur inconnue s\'est produite.'}</p>
                <button onClick={handleReset} className="inline-flex items-center justify-center px-5 py-2 font-semibold text-white transition-all duration-200 bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-900">
                    <RefreshIcon className="w-5 h-5 mr-2" />
                    Réessayer
                </button>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 md:py-16">
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-full flex flex-col items-center">
            {showInstallButton && (
              <button 
                onClick={handleInstallClick}
                className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/20 border border-indigo-500/50 rounded-full text-indigo-400 hover:bg-indigo-600/30 transition-all text-sm font-medium animate-pulse"
              >
                <DownloadIcon className="w-4 h-4" />
                Installer l'application
              </button>
            )}
            {appState === AppState.INITIAL && (
              <header className="mb-10 text-center">
                  <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                      PMN <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">AI Studio</span>
                  </h1>
              </header>
            )}
            {renderContent()}
        </div>
      </div>
    </main>
  );
};

export default App;
