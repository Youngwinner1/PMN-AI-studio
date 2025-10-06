
import React, { useState, useCallback } from 'react';
import { AppState } from './types';
import { suggestStyle, enhanceImage } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import { SparklesIcon, DownloadIcon, RefreshIcon, AlertIcon } from './components/icons';

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const LoadingIndicator: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <div className="w-12 h-12 border-4 border-t-indigo-500 border-gray-600 rounded-full animate-spin"></div>
    <p className="text-lg text-gray-300">{message}</p>
  </div>
);

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.INITIAL);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [originalImageDataUrl, setOriginalImageDataUrl] = useState<string | null>(null);
  const [suggestedStyle, setSuggestedStyle] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = useCallback(async (file: File) => {
    try {
      setAppState(AppState.ANALYZING);
      setError(null);
      setOriginalImageFile(file);
      const dataUrl = await fileToDataUrl(file);
      setOriginalImageDataUrl(dataUrl);

      const base64 = dataUrl.split(',')[1];
      const style = await suggestStyle(base64, file.type);
      setSuggestedStyle(style);
      setAppState(AppState.SUGGESTED);
    } catch (e) {
      const err = e as Error;
      setError(err.message || "Une erreur est survenue lors de l'analyse.");
      setAppState(AppState.ERROR);
    }
  }, []);

  const handleEnhance = useCallback(async () => {
    if (!originalImageFile || !suggestedStyle) return;

    try {
      setAppState(AppState.ENHANCING);
      setError(null);
      const base64 = (originalImageDataUrl as string).split(',')[1];
      const newImage = await enhanceImage(base64, originalImageFile.type, suggestedStyle);
      setEnhancedImage(newImage);
      setAppState(AppState.RESULT);
    } catch (e) {
      const err = e as Error;
      setError(err.message || "Une erreur est survenue lors de la création.");
      setAppState(AppState.ERROR);
    }
  }, [originalImageFile, suggestedStyle, originalImageDataUrl]);

  const handleReset = () => {
    setAppState(AppState.INITIAL);
    setOriginalImageFile(null);
    setOriginalImageDataUrl(null);
    setSuggestedStyle(null);
    setEnhancedImage(null);
    setError(null);
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.INITIAL:
        return (
          <>
            <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
              Transformez Votre Photo en Chef-d'œuvre
            </h2>
            <p className="mt-4 text-lg text-center text-gray-400 max-w-2xl mx-auto">
              Téléversez une photo et laissez notre IA créer un portrait de studio professionnel, en améliorant les détails sans altérer votre identité.
            </p>
            <div className="mt-10">
              <ImageUploader onImageUpload={handleImageUpload} disabled={false} />
            </div>
          </>
        );
      case AppState.ANALYZING:
        return (
          <div className="flex flex-col items-center space-y-8">
            <img src={originalImageDataUrl!} alt="Uploaded" className="max-h-80 rounded-lg shadow-lg" />
            <LoadingIndicator message="Analyse de votre style en cours..." />
          </div>
        );
      case AppState.SUGGESTED:
        return (
          <div className="flex flex-col items-center space-y-6">
            <h2 className="text-2xl font-bold text-gray-200">Style Suggéré</h2>
            <img src={originalImageDataUrl!} alt="Uploaded" className="max-h-80 rounded-lg shadow-lg" />
            <div className="text-center bg-gray-800 px-6 py-3 rounded-lg">
                <p className="text-gray-400">Nous pensons que le style qui vous va le mieux est :</p>
                <p className="text-3xl font-bold mt-1 text-indigo-400">{suggestedStyle}</p>
            </div>
            <button
              onClick={handleEnhance}
              className="inline-flex items-center justify-center px-8 py-3 font-semibold text-white transition-all duration-200 bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900"
            >
              <SparklesIcon className="w-5 h-5 mr-2" />
              Générer le Shooting
            </button>
             <button onClick={handleReset} className="text-gray-400 hover:text-white transition-colors">Changer de photo</button>
          </div>
        );
      case AppState.ENHANCING:
         return (
          <div className="flex flex-col items-center space-y-8">
            <img src={originalImageDataUrl!} alt="Uploaded" className="max-h-80 rounded-lg shadow-lg opacity-50" />
            <LoadingIndicator message={`Création de votre photo style ${suggestedStyle}...`} />
          </div>
        );
      case AppState.RESULT:
        return (
            <div className="w-full">
                <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600 mb-8">
                    Votre Shooting Professionnel est Prêt !
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="text-center">
                        <h3 className="text-xl font-semibold text-gray-400 mb-2">Original</h3>
                        <img src={originalImageDataUrl!} alt="Original" className="w-full rounded-lg shadow-lg" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-semibold text-indigo-400 mb-2">Résultat Amélioré</h3>
                        <img src={enhancedImage!} alt="Enhanced" className="w-full rounded-lg shadow-2xl border-2 border-indigo-500" />
                    </div>
                </div>
                <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
                     <a
                        href={enhancedImage!}
                        download={`pmn_studio_${suggestedStyle?.toLowerCase()}_${Date.now()}.png`}
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
                        Recommencer
                    </button>
                </div>
            </div>
        );
       case AppState.ERROR:
        return (
            <div className="flex flex-col items-center text-center bg-gray-800 p-8 rounded-lg shadow-lg border border-red-500/50">
                <AlertIcon className="w-12 h-12 text-red-400 mb-4" />
                <h2 className="text-2xl font-bold text-red-400">Oops! Une erreur est survenue.</h2>
                <p className="mt-2 text-gray-300 max-w-md">{error}</p>
                <button
                    onClick={handleReset}
                    className="inline-flex items-center justify-center mt-6 px-6 py-2 font-semibold text-white transition-all duration-200 bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900"
                >
                    <RefreshIcon className="w-5 h-5 mr-2" />
                    Réessayer
                </button>
            </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-10">
        <h1 className="text-5xl font-extrabold tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500">PMN</span> AI Studio
        </h1>
        <p className="mt-2 text-lg text-gray-400">Votre photographe personnel IA</p>
      </header>
      <main className="w-full max-w-5xl bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl p-6 sm:p-10 flex items-center justify-center min-h-[500px]">
        {renderContent()}
      </main>
      <footer className="text-center mt-10 text-gray-500 text-sm">
        <p>Propulsé par Google Gemini. Conçu pour des résultats professionnels.</p>
      </footer>
    </div>
  );
};

export default App;
